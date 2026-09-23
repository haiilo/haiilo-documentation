import fs from 'node:fs/promises';
import path from 'node:path';
import { catalystApiDir, gitConfig } from '../config';
import { loadCatalystDocBundle } from './github';
import { prepareCatalystComponentDocs, prepareCatalystComponentMdx } from './prepare';
import { apiFragmentPath, fragmentSlug } from './remark-component-api';

const API_DIR = path.join(process.cwd(), catalystApiDir);

async function readDirectory(dir: string): Promise<string[]> {
  return fs.readdir(dir).catch(function onMissing(): string[] {
    return [];
  });
}

function isMdxFile(name: string): boolean {
  return name.endsWith('.mdx');
}

async function pruneStaleApiFragments(keep: Set<string>): Promise<void> {
  const entries = await readDirectory(API_DIR);

  await Promise.all(
    entries.map(async function removeStale(name) {
      if (!isMdxFile(name)) return;
      const slug = fragmentSlug(name);
      if (keep.has(slug)) return;
      await fs.unlink(apiFragmentPath(slug));
    }),
  );
}

export async function verifyCatalystDocs(): Promise<void> {
  const apiFiles = await readDirectory(API_DIR);
  const apiCount = apiFiles.filter(isMdxFile).length;

  if (apiCount === 0) {
    throw new Error(`No API fragments in ${catalystApiDir}. Run sync:catalyst-docs or check GitHub access.`);
  }

  console.log(`Verified ${apiCount} API fragments.`);
}

export async function syncCatalystDocs(): Promise<void> {
  const bundle = await loadCatalystDocBundle();

  if (bundle.files.length === 0) {
    throw new Error(
      `No Catalyst markdown files in ${gitConfig.user}/${gitConfig.repo}@${gitConfig.branch}:${gitConfig.directory}. Check branch/directory env vars and GitHub access.`,
    );
  }
  await fs.mkdir(API_DIR, { recursive: true });

  const apiSlugs = new Set<string>();

  await Promise.all(
    bundle.files.map(async function syncFile({ item, content }) {
      const slug = fragmentSlug(item.name);
      const processed = prepareCatalystComponentDocs(content);
      if (processed.trim().length === 0) return;

      apiSlugs.add(slug);
      await fs.writeFile(apiFragmentPath(slug), `${prepareCatalystComponentMdx(processed)}\n`);
    }),
  );

  await pruneStaleApiFragments(apiSlugs);

  console.log(
    `Synced ${apiSlugs.size} API fragments from ${gitConfig.repo}@${gitConfig.branch} (${bundle.files.length} remote files).`,
  );
}
