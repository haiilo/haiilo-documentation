import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareCatalystComponentDocs, prepareCatalystComponentMdx } from './prepare';

type TypeTableProps = Record<
  string,
  { description: string; type: string; default?: string | number | boolean }
>;

const PROPERTIES_TABLE_HEADER = `
| Property | Attribute | Description | Type | Default |
| -------- | --------- | ----------- | ---- | ------- |`;

const buttonPropertiesTable = `
## Properties
${PROPERTIES_TABLE_HEADER}
| \`a11yCurrent\` | \`a11y-current\` | Sets the \`aria-current\` attribute on the button. | \`string \\| undefined\` | \`undefined\` |
| \`active\` | \`active\` | Set the button into an active state. | \`boolean\` | \`false\` |
| \`color\` | \`color\` | The color palette of the button. | \`"primary" \\| "secondary"\` | \`'secondary'\` |
`.trim();

function parseTypeTable(mdx: string): TypeTableProps {
  const match = mdx.match(/<TypeTable type=\{([\s\S]*?)\} \/>/);
  assert.ok(match, 'expected TypeTable MDX');
  return JSON.parse(match[1]!) as TypeTableProps;
}

test('prepareCatalystComponentDocs renames Properties to API reference', () => {
  const processed = prepareCatalystComponentDocs(buttonPropertiesTable);

  assert.match(processed, /^## API reference/m);
  assert.doesNotMatch(processed, /^## Properties/m);
  assert.match(processed, /^\| Property \|/m);
});

test('prepareCatalystComponentMdx converts API reference table to TypeTable', () => {
  const mdx = prepareCatalystComponentMdx(prepareCatalystComponentDocs(buttonPropertiesTable));
  const typeObject = parseTypeTable(mdx);

  assert.match(mdx, /^## API reference/m);
  assert.doesNotMatch(mdx, /^\| Property \|/m);
  assert.equal(typeObject.a11yCurrent.type, 'string | undefined');
  assert.equal(typeObject.a11yCurrent.default, undefined);
  assert.equal(typeObject.active.default, false);
  assert.equal(typeObject.color.default, 'secondary');
});

test('prepareCatalystComponentMdx escapes Stencil {@link tags', () => {
  const mdx = prepareCatalystComponentMdx(
    prepareCatalystComponentDocs(`
## API reference
${PROPERTIES_TABLE_HEADER}
| \`connector\` | \`connector\` | The {@link CatSelectConnector} of the select. | \`string\` | \`undefined\` |
`.trim()),
  );

  assert.match(mdx, /\\{@link CatSelectConnector}/);
});

test('prepareCatalystComponentMdx keeps markdown table when columns are invalid', () => {
  const mdx = prepareCatalystComponentMdx(
    prepareCatalystComponentDocs(`
## API reference

| Name | Value |
| ---- | ----- |
| \`foo\` | \`bar\` |
`.trim()),
  );

  assert.match(mdx, /^\| Name \|/m);
  assert.doesNotMatch(mdx, /<TypeTable/);
});

test('prepareCatalystComponentMdx normalizes br tags in property descriptions', () => {
  const typeObject = parseTypeTable(
    prepareCatalystComponentMdx(
      prepareCatalystComponentDocs(`
## API reference
${PROPERTIES_TABLE_HEADER}
| \`value\` | \`value\` | First line.<br />Second line. | \`string\` | \`undefined\` |
`.trim()),
    ),
  );

  assert.equal(typeObject.value.description, 'First line. Second line.');
  assert.doesNotMatch(typeObject.value.description, /<br/i);
});
