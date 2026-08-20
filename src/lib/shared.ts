export const appName = 'Haiilo Catalyst';
export const docsRoute = '/';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
  user: 'haiilo',
  repo: 'catalyst',
  branch: process.env.CATALYST_DOCS_BRANCH ?? 'docs/flat-component-docs',
  directory: process.env.CATALYST_DOCS_DIRECTORY ?? 'docs',
};
