import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { defineDocs } from 'fumadocs-mdx/macro';
import { z } from 'zod';
import { docsContentRoute, docsImageRoute, docsRoute, docsGitConfig } from './config';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      /** Catalyst tags whose API reference is appended to the page, e.g. `[cat-tabs, cat-tab]`. */
      components: z.array(z.string().startsWith('cat-')).optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
  pageTree: {
    // Applies to folders whose meta.json has no `pages` list.
    sort: { by: 'name' },
  },
});

type Page = (typeof source)['$inferPage'];

interface PageAssetUrl {
  segments: string[];
  url: string;
}

function pageAssetUrl(page: Page, fileName: string, route: string): PageAssetUrl {
  const segments = [...page.slugs, fileName];
  return {
    segments,
    url: '/' + [page.locale, ...route.split('/'), ...segments].filter(Boolean).join('/'),
  };
}

export function getPageImageUrl(page: Page): PageAssetUrl {
  return pageAssetUrl(page, 'image.webp', docsImageRoute);
}

export function getPageMarkdownUrl(page: Page): PageAssetUrl {
  return pageAssetUrl(page, 'content.md', docsContentRoute);
}

export function getPageGithubUrl(page: Page): string | undefined {
  const { user, repo, branch } = docsGitConfig;
  return `https://github.com/${user}/${repo}/blob/${branch}/content/docs/${page.path}`;
}

export async function getLLMText(page: Page): Promise<string> {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
