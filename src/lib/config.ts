export const appName = 'Haiilo Catalyst';
export const docsRoute = '/';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';
export const catalystApiDir = 'content/catalyst/api';

export const gitConfig = {
  user: 'haiilo',
  repo: 'catalyst',
  branch: process.env.CATALYST_DOCS_BRANCH ?? 'docs/flat-component-docs',
  directory: process.env.CATALYST_DOCS_DIRECTORY ?? 'docs',
};

export const docsGitConfig = {
  user: 'haiilo',
  repo: 'haiilo-documentation',
  branch: process.env.DOCS_GIT_BRANCH ?? 'main',
};
