import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPreviewMeta, remarkComponentExamples } from './remark-component-examples';

test('hasPreviewMeta matches the preview token', () => {
  assert.equal(hasPreviewMeta(undefined), false);
  assert.equal(hasPreviewMeta(''), false);
  assert.equal(hasPreviewMeta('preview'), true);
  assert.equal(hasPreviewMeta('preview wrap'), true);
  assert.equal(hasPreviewMeta('no-preview'), false);
});

test('remarkComponentExamples only transforms html preview fences', () => {
  const tree = {
    children: [
      { type: 'code', lang: 'html', value: '<div></div>' },
      { type: 'code', lang: 'html', meta: 'preview', value: '<cat-button></cat-button>' },
      { type: 'code', lang: 'js', meta: 'preview', value: 'foo()' },
    ],
  };

  remarkComponentExamples()(tree);

  assert.equal(tree.children[0]?.type, 'code');
  assert.equal(tree.children[1]?.type, 'mdxJsxFlowElement');
  assert.equal((tree.children[1] as { name?: string }).name, 'ComponentExample');
  assert.equal(tree.children[2]?.type, 'code');
});
