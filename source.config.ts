import { defineConfig } from 'fumadocs-mdx/config';
import { remarkComponentApi } from './src/lib/catalyst/remark-component-api';
import { remarkComponentExamples } from './src/lib/catalyst/remark-component-examples';

export default defineConfig({
  mdxOptions: {
    // remarkComponentApi must run before the preset's heading and structure
    // plugins so the appended API sections get TOC ids and search entries.
    // The loader already prepends remarkInclude; nothing in content uses <include>.
    remarkPlugins: (plugins) => [remarkComponentApi, ...plugins, remarkComponentExamples],
  },
});
