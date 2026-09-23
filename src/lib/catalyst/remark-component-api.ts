import fs from 'node:fs';
import path from 'node:path';
import { catalystApiDir } from '../config';

type MdastNode = {
  type: string;
  depth?: number;
  value?: string;
  children?: MdastNode[];
};

interface MdastRoot {
  type: 'root';
  children: MdastNode[];
}

interface MarkdownSource {
  path: string;
  value: string;
}

interface MarkdownParser {
  parse(document: string): unknown;
}

interface MdxCompiler {
  addDependency(filePath: string): void;
}

interface PageFile {
  path?: string;
  cwd?: string;
  data: object;
  message(reason: string): void;
}

/** `cat-date-inline` and `date-inline.md` both become `date-inline`. */
export function fragmentSlug(name: string): string {
  return name.replace(/\.mdx?$/, '').replace(/^cat-/, '');
}

/** `cat-date-inline` → `<cwd>/content/catalyst/api/date-inline.mdx` */
export function apiFragmentPath(name: string, cwd: string = process.cwd()): string {
  return path.join(cwd, catalystApiDir, `${fragmentSlug(name)}.mdx`);
}

function listedComponents(file: PageFile): string[] | undefined {
  const components = (file.data as { frontmatter?: { components?: string[] } }).frontmatter?.components;
  if (!Array.isArray(components)) return undefined;
  return components;
}

function fileCwd(file: PageFile): string {
  return file.cwd ?? process.cwd();
}

function displayPath(filePath: string, cwd: string): string {
  return path.relative(cwd, filePath);
}

function trackFragment(file: PageFile, filePath: string): void {
  const compiler = (file.data as { _compiler?: MdxCompiler })._compiler;
  compiler?.addDependency(filePath);
}

function readApiFragment(filePath: string): string | undefined {
  if (!fs.existsSync(filePath)) return undefined;
  return fs.readFileSync(filePath, 'utf8');
}

function componentHeading(tag: string): MdastNode {
  return { type: 'heading', depth: 2, children: [{ type: 'inlineCode', value: tag }] };
}

function demoteHeadings(nodes: MdastNode[]): void {
  for (const node of nodes) {
    if (node.type === 'heading' && node.depth) node.depth = Math.min(node.depth + 1, 6);
  }
}

function parseFragment(parse: MarkdownParser['parse'], filePath: string, source: string, cwd: string): MdastRoot {
  try {
    const parseFile = parse as unknown as (document: MarkdownSource) => unknown;
    return parseFile({ path: filePath, value: source }) as MdastRoot;
  } catch (error) {
    const detail = error instanceof Error ? String(error) : String(error);
    throw new Error(`${displayPath(filePath, cwd)}: ${detail}`, { cause: error });
  }
}

function reportMissingFragment(file: PageFile, tag: string, fragmentPath: string, cwd: string): void {
  const page = displayPath(file.path ?? 'page', cwd);
  const missing = displayPath(fragmentPath, cwd);
  const reason = `${page} lists ${tag}, but ${missing} does not exist. Rendering the page without its API section.`;
  file.message(reason);
  // The MDX compiler stores vfile messages and does not print them.
  console.warn(`[catalyst] ${reason}`);
}

/**
 * Append the synced API reference of every component listed in the page's
 * `components` frontmatter. Pages documenting several components get one
 * section per component.
 */
export function remarkComponentApi(this: MarkdownParser): (tree: MdastRoot, file: PageFile) => void {
  const parse = this.parse.bind(this);

  return function transform(tree: MdastRoot, file: PageFile): void {
    const components = listedComponents(file);
    if (!components) return;

    const cwd = fileCwd(file);
    const grouped = components.length > 1;

    for (const tag of components) {
      const fragmentPath = apiFragmentPath(tag, cwd);
      trackFragment(file, fragmentPath);

      const fragment = readApiFragment(fragmentPath);
      if (!fragment) {
        reportMissingFragment(file, tag, fragmentPath, cwd);
        continue;
      }

      const nodes = parseFragment(parse, fragmentPath, fragment, cwd).children;
      if (grouped) {
        demoteHeadings(nodes);
        tree.children.push(componentHeading(tag));
      }
      tree.children.push(...nodes);
    }
  };
}
