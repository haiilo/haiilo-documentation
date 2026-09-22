import fs from 'node:fs/promises';
import path from 'node:path';
import { docsRoute, gitConfig } from '../config';
import { loadCatalystDocBundle } from './github';
import {
  extractOverview,
  prepareCatalystComponentDocs,
  prepareCatalystComponentMdx,
  titleFromSlug,
} from './prepare';

const API_DIR = path.join(process.cwd(), 'content/catalyst/api');
const COMPONENTS_DIR = path.join(process.cwd(), 'content/docs/components');

function fileSlug(fileName: string): string {
  return fileName.replace(/\.mdx?$/, '');
}

function componentHref(slug: string): string {
  const base = docsRoute === '/' ? '' : docsRoute;
  return `${base}/components/${slug}`;
}

function buildComponentStub(
  slug: string,
  title: string,
  description: string,
  hasApiFragment: boolean,
): string {
  const include = hasApiFragment
    ? `\n<include cwd>content/catalyst/api/${slug}.mdx</include>\n`
    : '\n';

  return `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
---
${include}`;
}

async function readDirectory(dir: string): Promise<string[]> {
  return fs.readdir(dir).catch(function onMissing(): string[] {
    return [];
  });
}

function isMdxFile(name: string): boolean {
  return name.endsWith('.mdx');
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function pruneStaleApiFragments(keep: Set<string>): Promise<void> {
  const entries = await readDirectory(API_DIR);

  await Promise.all(
    entries.map(async function removeStale(name) {
      if (!isMdxFile(name)) return;
      const slug = fileSlug(name);
      if (keep.has(slug)) return;
      await fs.unlink(path.join(API_DIR, `${slug}.mdx`));
    }),
  );
}

async function writeComponentsIndex(slugs: string[]): Promise<void> {
  const cards = slugs
    .map(function toCard(slug) {
      return `  <Card title=${JSON.stringify(titleFromSlug(slug))} href=${JSON.stringify(componentHref(slug))} />`;
    })
    .join('\n');

  await fs.writeFile(
    path.join(COMPONENTS_DIR, 'index.mdx'),
    `---
title: Components
description: Catalyst UI components.
---

Catalyst component reference. Each page maps to a documented component.

<Cards>
${cards}
</Cards>
`,
  );
}

async function writeComponentsMeta(slugs: string[]): Promise<void> {
  await fs.writeFile(
    path.join(COMPONENTS_DIR, 'meta.json'),
    JSON.stringify(
      {
        title: 'Components',
        defaultOpen: true,
        pages: slugs,
      },
      null,
      2,
    ) + '\n',
  );
}

async function listLocalComponentSlugs(): Promise<string[]> {
  const entries = await readDirectory(COMPONENTS_DIR);

  return entries
    .filter(function isComponentPage(name) {
      return isMdxFile(name) && name !== 'index.mdx';
    })
    .map(fileSlug);
}

function sortSlugs(slugs: string[]): string[] {
  return [...new Set(slugs)].sort(function byTitle(a, b) {
    return titleFromSlug(a).localeCompare(titleFromSlug(b));
  });
}

export async function verifyCatalystDocs(): Promise<void> {
  const apiFiles = await readDirectory(API_DIR);
  const apiCount = apiFiles.filter(isMdxFile).length;

  if (apiCount === 0) {
    throw new Error('No API fragments in content/catalyst/api. Run sync:catalyst-docs or check GitHub access.');
  }

  const metaPath = path.join(COMPONENTS_DIR, 'meta.json');
  const meta = JSON.parse(await fs.readFile(metaPath, 'utf8')) as { pages?: string[] };
  const pages = meta.pages ?? [];

  if (pages.length === 0) {
    throw new Error('content/docs/components/meta.json has no pages.');
  }

  for (const slug of pages) {
    const pagePath = path.join(COMPONENTS_DIR, `${slug}.mdx`);
    if (!(await pathExists(pagePath))) {
      throw new Error(`Sidebar lists "${slug}" but ${pagePath} is missing.`);
    }
  }

  console.log(`Verified ${pages.length} component pages and ${apiCount} API fragments.`);
}

export async function syncCatalystDocs(): Promise<void> {
  const bundle = await loadCatalystDocBundle();

  if (bundle.files.length === 0) {
    throw new Error(
      `No Catalyst markdown files in ${gitConfig.user}/${gitConfig.repo}@${gitConfig.branch}:${gitConfig.directory}. Check branch/directory env vars and GitHub access.`,
    );
  }
  await fs.mkdir(API_DIR, { recursive: true });
  await fs.mkdir(COMPONENTS_DIR, { recursive: true });

  const slugs: string[] = [];
  const apiSlugs = new Set<string>();

  await Promise.all(
    bundle.files.map(async function syncFile({ item, content }) {
      const slug = fileSlug(item.name);
      const title = titleFromSlug(slug);
      const description = extractOverview(content) ?? `Reference for the Catalyst ${title} component.`;
      const processed = prepareCatalystComponentDocs(content);
      const hasApiFragment = processed.trim().length > 0;

      slugs.push(slug);

      if (hasApiFragment) {
        apiSlugs.add(slug);
        await fs.writeFile(
          path.join(API_DIR, `${slug}.mdx`),
          `${prepareCatalystComponentMdx(processed)}\n`,
        );
      }

      const pagePath = path.join(COMPONENTS_DIR, `${slug}.mdx`);
      if (await pathExists(pagePath)) return;

      await fs.writeFile(pagePath, buildComponentStub(slug, title, description, hasApiFragment));
    }),
  );

  const localSlugs = await listLocalComponentSlugs();
  const remoteSlugs = new Set(slugs);
  const allSlugs = sortSlugs([...slugs, ...localSlugs]);
  const localOnlyCount = localSlugs.filter(function isLocalOnly(slug) {
    return !remoteSlugs.has(slug);
  }).length;

  await pruneStaleApiFragments(apiSlugs);
  await writeComponentsIndex(allSlugs);
  await writeComponentsMeta(allSlugs);

  console.log(
    `Synced ${apiSlugs.size} API fragments from ${gitConfig.repo}@${gitConfig.branch} (${bundle.files.length} remote files, ${localOnlyCount} local-only pages).`,
  );
}
