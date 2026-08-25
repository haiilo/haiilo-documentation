import { gitConfig } from './shared';

export interface GitHubContentItem {
  name: string;
  path: string;
  type: string;
  download_url: string | null;
}

export interface CatalystDocBundle {
  branch: string;
  directory: string;
  files: Array<{
    item: GitHubContentItem;
    content: string;
  }>;
}

function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
}

function githubContentsUrl(path: string): string {
  const { user, repo, branch } = gitConfig;
  return `https://api.github.com/repos/${user}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
}

async function githubFetch(
  url: string,
  accept = 'application/vnd.github+json',
  token = githubToken(),
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': 'haiilo-documentation',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers, cache: 'no-store' });

  if (!res.ok && token && (res.status === 401 || res.status === 403)) {
    return githubFetch(url, accept, undefined);
  }

  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${url} from GitHub (${res.status} ${res.statusText}). Set GITHUB_TOKEN if the repo is private or the API rate limit was hit.`,
    );
  }

  return res;
}

function isMarkdownFile(item: GitHubContentItem): boolean {
  return item.type === 'file' && /\.mdx?$/.test(item.name);
}

async function listCatalystDocsFromGitHub(): Promise<GitHubContentItem[]> {
  const res = await githubFetch(githubContentsUrl(gitConfig.directory));
  const items = (await res.json()) as GitHubContentItem[];
  return items.filter(isMarkdownFile);
}

async function readCatalystFileFromGitHub(item: GitHubContentItem): Promise<string> {
  const downloadUrl = item.download_url;
  if (downloadUrl) {
    try {
      const res = await githubFetch(downloadUrl, '*/*', undefined);
      return res.text();
    } catch {
      // Fall through to contents API when raw download fails.
    }
  }

  const res = await githubFetch(githubContentsUrl(item.path), 'application/vnd.github.raw');
  return res.text();
}

export async function loadCatalystDocBundle(): Promise<CatalystDocBundle> {
  const items = await listCatalystDocsFromGitHub();
  const files = await Promise.all(
    items.map(async function loadFile(item) {
      return {
        item,
        content: await readCatalystFileFromGitHub(item),
      };
    }),
  );

  return {
    branch: gitConfig.branch,
    directory: gitConfig.directory,
    files,
  };
}
