import { createCompiler } from '@fumadocs/mdx-remote';
import rehypeRaw from 'rehype-raw';

const mdxNodeTypes = [
  'mdxjsEsm',
  'mdxJsxAttribute',
  'mdxJsxAttributeValueExpression',
  'mdxJsxFlowElement',
  'mdxJsxTextElement',
  'mdxFlowExpression',
  'mdxTextExpression',
];

type HastNode = { type?: string; children?: HastNode[] };

const isDev = process.env.NODE_ENV !== 'production';

function dropRawAndCommentNodes(node: HastNode | undefined): void {
  if (!node?.children) return;
  node.children = node.children.filter(function keepHandled(child) {
    if (!child) return false;
    if (child.type === 'raw' || child.type === 'comment') return false;
    dropRawAndCommentNodes(child);
    return true;
  });
}

function dropUnhandledHastNodes() {
  return function transform(tree: HastNode) {
    dropRawAndCommentNodes(tree);
  };
}

export const mdCompiler = createCompiler({
  format: 'md',
  development: isDev,
  rehypePlugins: function addRehypePlugins(plugins) {
    return [[rehypeRaw, { passThrough: mdxNodeTypes }], dropUnhandledHastNodes, ...plugins];
  },
});

export const mdxCompiler = createCompiler({
  development: isDev,
});

function stripHtmlComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, '');
}

/** Canonical preamble strip — used for compile, search index, and LLM export. */
export function stripCatalystPreambleText(content: string): string {
  const lines = stripHtmlComments(content).split('\n');

  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  if (lines[i]?.startsWith('# ')) {
    lines.splice(i, 1);
  }

  const overviewIndex = lines.findIndex(function isOverview(line) {
    return /^## Overview\s*$/i.test(line.trim());
  });
  if (overviewIndex !== -1) {
    let end = overviewIndex + 1;
    while (end < lines.length && !lines[end].startsWith('## ')) end += 1;
    lines.splice(overviewIndex, end - overviewIndex);
  }

  return lines.join('\n').trim();
}

export function extractOverview(content: string): string | undefined {
  const match = content.match(/## Overview\s+([\s\S]*?)(?=\n## |\s*$)/i);
  const overview = match?.[1] ? stripHtmlComments(match[1]).trim().replace(/\s+/g, ' ') : undefined;
  return overview || undefined;
}

function capitalize(part: string): string {
  return part.charAt(0).toUpperCase() + part.slice(1);
}

export function titleFromSlug(slug: string): string {
  return slug.split('-').map(capitalize).join(' ');
}
