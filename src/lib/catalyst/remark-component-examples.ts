interface MdxJsxFlowElement {
  type: 'mdxJsxFlowElement';
  name: string;
  attributes: Array<{
    type: 'mdxJsxAttribute';
    name: string;
    value: string;
  }>;
  children: [];
}

type MdastNode = {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  children?: MdastNode[];
};

export function hasPreviewMeta(meta?: string | null): boolean {
  if (!meta) return false;
  return meta.split(/\s+/).includes('preview');
}

function toComponentExample(code: string, lang: string): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name: 'ComponentExample',
    attributes: [
      { type: 'mdxJsxAttribute', name: 'code', value: code },
      { type: 'mdxJsxAttribute', name: 'lang', value: lang },
    ],
    children: [],
  };
}

function transformNodes(nodes: MdastNode[]): void {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]!;

    if (node.type === 'code' && node.lang === 'html' && hasPreviewMeta(node.meta) && node.value) {
      nodes[index] = toComponentExample(node.value, node.lang);
      continue;
    }

    if (node.children) {
      transformNodes(node.children);
    }
  }
}

/**
 * Turn ```html preview fences into ComponentExample nodes so code keeps markdown
 * formatting (MDX template literals strip indentation).
 */
export function remarkComponentExamples(): (tree: { children: MdastNode[] }) => void {
  return function transform(tree: { children: MdastNode[] }): void {
    transformNodes(tree.children);
  };
}
