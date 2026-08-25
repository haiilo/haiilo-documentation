import type { TypeNode } from 'fumadocs-ui/components/type-table';

export const API_REFERENCE_HEADING = '## API reference';

type PropertyTableEntry = Pick<TypeNode, 'description' | 'type' | 'default'>;

const PROPERTY_TABLE_COLUMNS = ['property', 'description', 'type', 'default'] as const;

type PropertyTableColumn = (typeof PROPERTY_TABLE_COLUMNS)[number];

function stripInlineCode(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^`([\s\S]*)`$/);
  return match ? match[1] : trimmed;
}

function cleanMarkdownText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\\([|\\])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCellText(raw: string): string {
  return cleanMarkdownText(stripInlineCode(raw));
}

function parseDefaultValue(raw: string): string | number | boolean | undefined {
  const trimmed = parseCellText(raw);
  if (trimmed === 'undefined') return undefined;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseMarkdownTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return null;

  const cells: string[] = [];
  let current = '';

  for (let index = 1; index < trimmed.length; index += 1) {
    const char = trimmed[index];

    if (char === '\\' && trimmed[index + 1] === '|') {
      current += '|';
      index += 1;
      continue;
    }

    if (char === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    cells.push(current.trim());
  }

  return cells.length > 0 ? cells : null;
}

function isTableSeparator(line: string): boolean {
  return /^\|\s*[-: ]+\|/.test(line.trim());
}

function parsePropertyTableRows(tableLines: string[]): string[][] | null {
  const rows: string[][] = [];

  for (const line of tableLines) {
    if (isTableSeparator(line)) continue;
    const cells = parseMarkdownTableRow(line);
    if (cells) rows.push(cells);
  }

  return rows.length >= 2 ? rows : null;
}

function propertyTableColumnIndices(header: string[]): Record<PropertyTableColumn, number> | null {
  const normalized = header.map(function normalizeHeader(cell) {
    return stripInlineCode(cell).toLowerCase();
  });
  const indices = {} as Record<PropertyTableColumn, number>;

  for (const column of PROPERTY_TABLE_COLUMNS) {
    const index = normalized.indexOf(column);
    if (index === -1) return null;
    indices[column] = index;
  }

  return indices;
}

function toPropertyTableEntry(
  row: string[],
  columns: Record<PropertyTableColumn, number>,
  columnCount: number,
): PropertyTableEntry | null {
  if (row.length < columnCount) return null;

  const entry: PropertyTableEntry = {
    description: cleanMarkdownText(row[columns.description]),
    type: parseCellText(row[columns.type]),
  };
  const parsedDefault = parseDefaultValue(row[columns.default]);

  if (parsedDefault !== undefined) {
    entry.default = parsedDefault;
  }

  return entry;
}

function propertiesTableToTypeTable(tableLines: string[]): string | null {
  const rows = parsePropertyTableRows(tableLines);
  if (!rows) return null;

  const columns = propertyTableColumnIndices(rows[0]);
  if (!columns) return null;

  const typeObject: Record<string, PropertyTableEntry> = {};
  const columnCount = rows[0].length;

  for (const row of rows.slice(1)) {
    const property = parseCellText(row[columns.property]);
    const entry = toPropertyTableEntry(row, columns, columnCount);
    if (!entry) continue;
    typeObject[property] = entry;
  }

  if (Object.keys(typeObject).length === 0) return null;

  return `<TypeTable type={${JSON.stringify(typeObject)}} />`;
}

function collectTableLines(lines: string[], startIndex: number): { tableLines: string[]; nextIndex: number } {
  const tableLines: string[] = [];
  let index = startIndex;

  while (index < lines.length && lines[index].trim().startsWith('|')) {
    tableLines.push(lines[index]);
    index += 1;
  }

  return { tableLines, nextIndex: index };
}

export function replaceApiReferenceTableWithTypeTable(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() !== API_REFERENCE_HEADING) {
      result.push(line);
      index += 1;
      continue;
    }

    result.push(line);
    index += 1;

    while (index < lines.length && lines[index].trim() === '') {
      result.push(lines[index]);
      index += 1;
    }

    const { tableLines, nextIndex } = collectTableLines(lines, index);
    index = nextIndex;

    const typeTable = propertiesTableToTypeTable(tableLines);
    if (typeTable) {
      result.push('', typeTable, '');
      continue;
    }

    result.push(...tableLines);
  }

  return result.join('\n');
}
