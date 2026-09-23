import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { catalystApiDir } from '../config';
import { apiFragmentPath, fragmentSlug, remarkComponentApi } from './remark-component-api';

type Node = { type: string; depth?: number; name?: string; value?: string; children?: Node[] };

const requireFromFumadocs = createRequire(path.join(process.cwd(), 'node_modules/fumadocs-mdx/package.json'));
interface MarkdownProcessor {
  use(...plugins: unknown[]): MarkdownProcessor;
  parse(document: unknown): unknown;
}

const { unified } = requireFromFumadocs('unified') as { unified: () => MarkdownProcessor };
const remarkParse = requireFromFumadocs('remark-parse').default as unknown;
const remarkMdx = requireFromFumadocs('remark-mdx').default as unknown;
const processor = unified().use(remarkParse).use(remarkMdx);
const parser = { parse: processor.parse.bind(processor) };

const fragment = `## API reference

<TypeTable />

## Events
`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-api-'));
fs.mkdirSync(path.join(tmp, catalystApiDir), { recursive: true });
fs.writeFileSync(path.join(tmp, catalystApiDir, 'tabs.mdx'), fragment);
fs.writeFileSync(path.join(tmp, catalystApiDir, 'tab.mdx'), fragment);
fs.writeFileSync(path.join(tmp, catalystApiDir, 'broken.mdx'), 'Hello {oops');

test.after(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function run(components: string[] | undefined): { nodes: Node[]; messages: string[]; dependencies: string[] } {
  const tree = { type: 'root' as const, children: [] as Node[] };
  const messages: string[] = [];
  const dependencies: string[] = [];

  remarkComponentApi.call(parser)(tree, {
    path: path.join(tmp, 'content/docs/components/page.mdx'),
    cwd: tmp,
    data: {
      frontmatter: { components },
      _compiler: {
        addDependency(filePath: string) {
          dependencies.push(filePath);
        },
      },
    },
    message(reason: string) {
      messages.push(reason);
    },
  });

  return { nodes: tree.children, messages, dependencies };
}

function outline(nodes: Node[]): Array<[number | undefined, string | undefined, string | undefined]> {
  return nodes.map((node) => [node.depth, node.type === 'mdxJsxFlowElement' ? node.name : node.children?.[0]?.type, node.children?.[0]?.value]);
}

test('a tag and a remote filename share one fragment slug', () => {
  assert.equal(fragmentSlug('cat-date-inline'), 'date-inline');
  assert.equal(fragmentSlug('date-inline.md'), 'date-inline');
  assert.equal(fragmentSlug('cat-checkbox.md'), 'checkbox');
  assert.equal(apiFragmentPath('cat-tabs', tmp), path.join(tmp, catalystApiDir, 'tabs.mdx'));
});

test('pages without components get no API section', () => {
  const result = run(undefined);
  assert.deepEqual(result.nodes, []);
  assert.deepEqual(result.dependencies, []);
});

test('a single component appends headings and JSX unchanged', () => {
  const result = run(['cat-tabs']);

  assert.deepEqual(outline(result.nodes), [
    [2, 'text', 'API reference'],
    [undefined, 'TypeTable', undefined],
    [2, 'text', 'Events'],
  ]);
  assert.deepEqual(result.dependencies, [apiFragmentPath('cat-tabs', tmp)]);
  assert.deepEqual(result.messages, []);
});

test('several components get one demoted section each', () => {
  const result = run(['cat-tabs', 'cat-tab']);

  assert.deepEqual(outline(result.nodes), [
    [2, 'inlineCode', 'cat-tabs'],
    [3, 'text', 'API reference'],
    [undefined, 'TypeTable', undefined],
    [3, 'text', 'Events'],
    [2, 'inlineCode', 'cat-tab'],
    [3, 'text', 'API reference'],
    [undefined, 'TypeTable', undefined],
    [3, 'text', 'Events'],
  ]);
});

test('a component without synced docs is skipped with a warning', () => {
  const result = run(['cat-dialog']);

  assert.deepEqual(result.nodes, []);
  assert.equal(result.messages.length, 1);
  assert.match(result.messages[0] ?? '', /cat-dialog/);
  assert.match(result.messages[0] ?? '', /content\/catalyst\/api\/dialog\.mdx/);
  assert.deepEqual(result.dependencies, [apiFragmentPath('cat-dialog', tmp)]);
});

test('a broken fragment names the fragment file', () => {
  assert.throws(
    () => run(['cat-broken']),
    /content\/catalyst\/api\/broken\.mdx: 1:12:/,
  );
});
