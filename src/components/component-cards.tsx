import { source } from '@/lib/source';
import type { Folder, Item, Node } from 'fumadocs-core/page-tree';
import { Card, Cards } from 'fumadocs-ui/components/card';
import type { ReactElement } from 'react';

function isComponentsFolder(node: Node): node is Folder {
  return node.type === 'folder' && node.$ref?.folder === 'components';
}

function isPage(node: Node): node is Item {
  return node.type === 'page';
}

function cardTitle(item: Item): string {
  const page = source.getNodePage(item);
  if (page) return page.data.title;
  if (typeof item.name === 'string') return item.name;
  return item.url;
}

/** Card grid of the Components folder, in the same order as the sidebar. */
export function ComponentCards(): ReactElement {
  const folder = source.getPageTree().children.find(isComponentsFolder);
  const pages = folder?.children.filter(isPage) ?? [];

  return (
    <Cards>
      {pages.map(function toCard(item) {
        return <Card key={item.url} title={cardTitle(item)} href={item.url} />;
      })}
    </Cards>
  );
}
