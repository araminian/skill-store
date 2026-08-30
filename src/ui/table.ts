import pc from 'picocolors';

export interface Column<T> {
  header: string;
  key?: keyof T;
  render?: (item: T) => string;
  minWidth?: number;
  align?: 'left' | 'right';
}

function stripAnsi(str: string): string {
  return str.replace(
    // eslint-disable-next-line no-control-regex
    /[][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
}

export function renderTable<T>(items: T[], columns: Column<T>[]): string {
  if (items.length === 0) {
    return pc.dim('  (No items found)');
  }

  // Compute column widths
  const widths = columns.map((col) => {
    let max = stripAnsi(col.header).length;
    for (const item of items) {
      const val = col.render ? col.render(item) : col.key ? String(item[col.key] ?? '') : '';
      const len = stripAnsi(val).length;
      if (len > max) max = len;
    }
    if (col.minWidth && max < col.minWidth) {
      max = col.minWidth;
    }
    return max;
  });

  const headerRow = columns
    .map((col, i) => {
      const text = col.header;
      const pad = (widths[i] ?? 10) - stripAnsi(text).length;
      return pc.bold(pc.underline(text + ' '.repeat(Math.max(0, pad))));
    })
    .join('   ');

  const rows = items.map((item) => {
    return columns
      .map((col, i) => {
        const val = col.render ? col.render(item) : col.key ? String(item[col.key] ?? '') : '';
        const rawLen = stripAnsi(val).length;
        const pad = (widths[i] ?? 10) - rawLen;
        if (col.align === 'right') {
          return ' '.repeat(Math.max(0, pad)) + val;
        }
        return val + ' '.repeat(Math.max(0, pad));
      })
      .join('   ');
  });

  return [headerRow, ...rows].join('\n');
}
