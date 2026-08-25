import { loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { defineDocs } from 'fumadocs-mdx/macro';
import { createCatalystSource } from './catalyst-source';
import { docsContentRoute, docsImageRoute, docsRoute, docsGitConfig, gitConfig } from './shared';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export const source = loader({
  source: {
    docs: docs.toFumadocsSource(),
    catalyst: await createCatalystSource(),
  },
  baseUrl: docsRoute,
  plugins: [lucideIconsPlugin()],
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
  if (page.type === 'catalyst') {
    const view = page.slugs.length > 1 ? 'blob' : 'tree';
    const { user, repo, branch } = gitConfig;
    return `https://github.com/${user}/${repo}/${view}/${branch}/${page.data.githubPath}`;
  }

  const { user, repo, branch } = docsGitConfig;
  return `https://github.com/${user}/${repo}/blob/${branch}/content/docs/${page.path}`;
}

export async function getLLMText(page: Page): Promise<string> {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
