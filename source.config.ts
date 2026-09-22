import { defineConfig, remarkInclude } from 'fumadocs-mdx/config';
import { remarkComponentExamples } from './src/lib/catalyst/remark-component-examples';

export default defineConfig({
  mdxOptions: {
    remarkPlugins: (plugins) => [...plugins, remarkInclude, remarkComponentExamples],
  },
});
