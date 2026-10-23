import type { DataRow, DataTable, FilterSpec, Scope } from '@/schema/types';

export function rowsOf(data: Scope['data'], table: string): DataRow[] {
  return data[table]?.rows ?? [];
}

export function rowsForPeriod(rows: DataRow[], range: string): DataRow[] {
  if (!range || range === 'all') return rows;
  return rows.filter((row) => {
    const span = String(row.span ?? '');
    if (!span) return false;
    if (range === 'month') return span === 'week' || span === 'month';
    if (range === 'week') return span === 'week';
    return span === range;
  });
}

export function applyFilter(
  rows: DataRow[],
  filter: FilterSpec | undefined,
  state: Scope['state'],
): DataRow[] {
  if (!filter) return rows;
  const raw = state[filter.state];
  const value = raw == null || raw === '' ? 'all' : String(raw);
  if (filter.mode === 'all' || value === 'all') return rows;
  if (filter.mode === 'period') return rowsForPeriod(rows, value);
  if (filter.mode === 'contains') {
    const query = value.toLowerCase();
    const fields = filter.fields ?? [];
    return rows.filter((row) =>
      fields.some((field) => String(row[field] ?? '').toLowerCase().includes(query)),
    );
  }
  const field = filter.field ?? '';
  return rows.filter((row) => String(row[field] ?? '') === value);
}

export function applyWhere(
  rows: DataRow[],
  where: { field: string; value: string } | undefined,
): DataRow[] {
  if (!where) return rows;
  return rows.filter((row) => String(row[where.field] ?? '') === where.value);
}

export function applySort(
  rows: DataRow[],
  field: string | undefined,
  direction: 'asc' | 'desc' | undefined,
): DataRow[] {
  if (!field) return rows;
  const copy = [...rows];
  copy.sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    const an = typeof av === 'number' ? av : Number(av);
    const bn = typeof bv === 'number' ? bv : Number(bv);
    const bothNumeric =
      typeof av !== 'boolean' &&
      typeof bv !== 'boolean' &&
      av !== '' &&
      bv !== '' &&
      !Number.isNaN(an) &&
      !Number.isNaN(bn);
    const compared = bothNumeric ? an - bn : String(av ?? '').localeCompare(String(bv ?? ''));
    return direction === 'asc' ? compared : -compared;
  });
  return copy;
}

export function visibleTableRows(
  table: DataTable | undefined,
  filter: FilterSpec | undefined,
  where: { field: string; value: string } | undefined,
  state: Scope['state'],
  sortField?: string,
  sortDir?: 'asc' | 'desc',
): DataRow[] {
  const filtered = applyWhere(applyFilter(table?.rows ?? [], filter, state), where);
  return applySort(filtered, sortField, sortDir);
}

export interface SeriesPoint {
  label: string;
  value: number;
}

export function seriesFromRows(
  rows: DataRow[],
  labelField: string,
  valueField: string,
): SeriesPoint[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const label = String(row[labelField] ?? 'Other');
    const amount = Number(row[valueField] ?? 0);
    totals.set(label, (totals.get(label) ?? 0) + (Number.isFinite(amount) ? amount : 0));
  }
  return [...totals.entries()].map(([label, value]) => ({ label, value }));
}

export function sumRows(rows: DataRow[], field: string): number {
  return rows.reduce((total, row) => total + (Number(row[field] ?? 0) || 0), 0);
}
