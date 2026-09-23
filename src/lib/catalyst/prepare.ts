import { API_REFERENCE_HEADING, replaceApiReferenceTableWithTypeTable } from './property-table';

function stripHtmlComments(content: string): string {
  return content.replace(/<!--[\s\S]*?-->/g, '');
}

/** Canonical preamble strip — used for compile, search index, and LLM export. */
function stripCatalystPreambleText(content: string): string {
  const lines = stripHtmlComments(content).split('\n');

  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i += 1;
  if (lines[i]?.startsWith('# ')) {
    lines.splice(i, 1);
  }

  const overviewIndex = lines.findIndex(function isOverview(line) {
    return /^## Overview\s*$/i.test(line.trim());
  });
  if (overviewIndex !== -1) {
    let end = overviewIndex + 1;
    while (end < lines.length && !lines[end].startsWith('## ')) end += 1;
    lines.splice(overviewIndex, end - overviewIndex);
  }

  return lines.join('\n').trim();
}

const STENCIL_PROPERTIES_HEADING = /^## Properties\s*$/gm;

function escapeMdxExpressionSyntax(content: string): string {
  return content.replace(/\{@/g, String.raw`\{@`);
}

/** Markdown for search, structured data, and LLM export. Keeps markdown tables. */
export function prepareCatalystComponentDocs(content: string): string {
  return stripCatalystPreambleText(content).replace(STENCIL_PROPERTIES_HEADING, API_REFERENCE_HEADING);
}

/** MDX for rendered API fragments. Replaces the API reference table with TypeTable. */
export function prepareCatalystComponentMdx(processed: string): string {
  return escapeMdxExpressionSyntax(replaceApiReferenceTableWithTypeTable(processed));
}
