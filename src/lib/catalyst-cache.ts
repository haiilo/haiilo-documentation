import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GitHubContentItem } from './catalyst-github';
import { gitConfig } from './shared';

export interface CatalystDocBundle {
  branch: string;
  directory: string;
  files: Array<{
    item: GitHubContentItem;
    content: string;
  }>;
}

const cacheDir = join(process.cwd(), '.source', 'catalyst-cache');
const cachePath = join(cacheDir, 'bundle.json');

function cacheDisabled(): boolean {
  return process.env.CATALYST_DOCS_CACHE === 'off';
}

function cacheOnly(): boolean {
  return process.env.CATALYST_DOCS_OFFLINE === 'true';
}

export async function readCatalystCache(): Promise<CatalystDocBundle | null> {
  if (cacheDisabled()) return null;

  try {
    const raw = await readFile(cachePath, 'utf8');
    const bundle = JSON.parse(raw) as CatalystDocBundle;
    if (bundle.branch !== gitConfig.branch || bundle.directory !== gitConfig.directory) {
      return null;
    }
    return bundle;
  } catch {
    return null;
  }
}

export async function writeCatalystCache(bundle: CatalystDocBundle): Promise<void> {
  if (cacheDisabled()) return;

  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, JSON.stringify(bundle), 'utf8');
}

export function shouldRefreshCache(): boolean {
  return process.env.CATALYST_DOCS_REFRESH === 'true';
}

export function shouldUseCacheOnly(): boolean {
  return cacheOnly();
}
