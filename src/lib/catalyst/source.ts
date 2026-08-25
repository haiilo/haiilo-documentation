import { structure, type StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { createCompiler } from '@fumadocs/mdx-remote';
import type { StaticSource } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { MDXContent } from 'mdx/types';
import { docsRoute, gitConfig } from '../config';
import type { GitHubContentItem } from './github';
import { loadCatalystDocBundle } from './github';
import {
  extractOverview,
  prepareCatalystComponentDocs,
  prepareCatalystComponentMdx,
  titleFromSlug,
} from './prepare';

const mdxCompiler = createCompiler({
  development: process.env.NODE_ENV !== 'production',
});

interface CatalystPageData {
  title: string;
  description?: string;
  body: MDXContent;
  toc: TOCItemType[];
  full?: boolean;
  structuredData: StructuredData;
  githubPath: string;
  getText: (type: 'raw' | 'processed') => Promise<string>;
}

interface CatalystMetaData {
  title: string;
  defaultOpen?: boolean;
  pages?: string[];
}

type CatalystSource = StaticSource<{
  pageData: CatalystPageData;
  metaData: CatalystMetaData;
}>;

function componentHref(slug: string): string {
  const base = docsRoute === '/' ? '' : docsRoute;
  return `${base}/components/${slug}`;
}

function buildComponentsIndex(pages: { title: string; slug: string }[]): string {
  const cards = [...pages]
    .sort(function byTitle(a, b) {
      return a.title.localeCompare(b.title);
    })
    .map(function toCard(page) {
      return `  <Card title=${JSON.stringify(page.title)} href=${JSON.stringify(componentHref(page.slug))} />`;
    })
    .join('\n');

  return `---
title: Components
description: Catalyst UI components.
---

Catalyst component reference. Each page maps to a documented component.

<Cards>
${cards}
</Cards>
`;
}

async function compileMarkdown(
  source: string,
  filePath: string,
): Promise<{ body: MDXContent; toc: TOCItemType[] }> {
  const compiled = await mdxCompiler.compile({ source, filePath });
  return {
    body: compiled.body as MDXContent,
    toc: compiled.toc,
  };
}

function markdownText(raw: string, processed: string): CatalystPageData['getText'] {
  return async function getText(type) {
    if (type === 'raw') return raw;
    return processed;
  };
}

type CatalystPageFile = Extract<CatalystSource['files'][number], { type: 'page' }>;

function fileSlug(fileName: string): string {
  return fileName.replace(/\.mdx?$/, '');
}

function pageFile(path: string, data: CatalystPageData): CatalystPageFile {
  return { type: 'page', path, data };
}

async function toComponentPage(file: GitHubContentItem, content: string): Promise<CatalystPageFile> {
  const slug = fileSlug(file.name);
  const title = titleFromSlug(slug);
  const processed = prepareCatalystComponentDocs(content);
  const mdx = prepareCatalystComponentMdx(processed);
  const compiled = await compileMarkdown(mdx, file.path.replace(/\.md$/, '.mdx'));

  return pageFile(`components/${file.name}`, {
    title,
    description: extractOverview(content) ?? `Reference for the Catalyst ${title} component.`,
    body: compiled.body,
    toc: compiled.toc,
    structuredData: structure(processed),
    githubPath: file.path,
    getText: markdownText(content, processed),
  });
}

async function toComponentsIndex(pages: CatalystPageFile[]): Promise<CatalystPageFile> {
  const indexSource = buildComponentsIndex(
    pages.map(function toCard(page) {
      return {
        slug: fileSlug(page.path.replace(/^components\//, '')),
        title: page.data.title,
      };
    }),
  );
  const compiled = await compileMarkdown(indexSource, 'components/index.mdx');

  return pageFile('components/index.mdx', {
    title: 'Components',
    description: 'Catalyst UI components.',
    body: compiled.body,
    toc: compiled.toc,
    structuredData: structure(indexSource),
    githubPath: gitConfig.directory,
    getText: markdownText(indexSource, indexSource),
  });
}

export async function createCatalystSource(): Promise<CatalystSource> {
  const bundle = await loadCatalystDocBundle();
  const pages = await Promise.all(
    bundle.files.map(function buildPage(file) {
      return toComponentPage(file.item, file.content);
    }),
  );
  const index = await toComponentsIndex(pages);

  return {
    files: [
      {
        type: 'meta',
        path: 'components/meta.json',
        data: {
          title: 'Components',
          defaultOpen: true,
          // Fumadocs convention: include all child pages in sidebar order.
          pages: ['...'],
        },
      },
      index,
      ...pages,
    ],
  };
}
