import { applyFilter, applySort, applyWhere, rowsForPeriod, rowsOf, seriesFromRows, sumRows, visibleTableRows } from '@/engine/data';
import { evaluate, formatValue, interpolate } from '@/engine/expr';
import type { Project, Runtime, Scope, TouchNode } from '@/schema/types';

export function scopeFor(project: Project, runtime: Runtime): Scope {
  return { state: runtime.state, data: project.data };
}

export function isOn(node: TouchNode, scope: Scope): boolean {
  if (!node.visibleWhen) return true;
  try {
    return Boolean(evaluate(node.visibleWhen, scope));
  } catch {
    return true;
  }
}

export function isActive(node: TouchNode, scope: Scope): boolean {
  if (!node.activeWhen) return false;
  try {
    return Boolean(evaluate(node.activeWhen, scope));
  } catch {
    return false;
  }
}

export function readText(node: TouchNode, scope: Scope): string {
  const raw = node.text ?? '';
  return raw.includes('{{') ? interpolate(raw, scope) : raw;
}

export function readMetric(node: TouchNode, scope: Scope): string {
  if (!node.valueExpr) return '';
  try {
    return formatValue(evaluate(node.valueExpr, scope), node.format);
  } catch {
    return '·';
  }
}

export function readProgress(node: TouchNode, scope: Scope): number {
  if (!node.progressExpr) return 0;
  try {
    const value = Number(evaluate(node.progressExpr, scope));
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  } catch {
    return 0;
  }
}

export function chartSeries(node: TouchNode, scope: Scope): { label: string; value: number }[] {
  const chart = node.chart;
  if (!chart) return [];
  if (chart.staticSeries?.length) return chart.staticSeries;
  let rows = rowsOf(scope.data, chart.table);
  rows = applyFilter(rows, chart.filter, scope.state);
  rows = applyWhere(rows, chart.where);
  if (chart.filter?.mode === 'period') {
    const range = String(scope.state[chart.filter.state] ?? 'all');
    rows = rowsForPeriod(applyWhere(rowsOf(scope.data, chart.table), chart.where), range);
  }
  return seriesFromRows(rows, chart.label, chart.value);
}

export function tableRows(node: TouchNode, scope: Scope) {
  const table = node.table;
  if (!table) return [];
  const source = scope.data[table.source];
  const sortField = table.sortState ? String(scope.state[table.sortState] ?? '') : undefined;
  const sortDir = table.sortDirState ? (scope.state[table.sortDirState] === 'asc' ? 'asc' : 'desc') : 'desc';
  return visibleTableRows(source, table.filter, table.where, scope.state, sortField || undefined, sortField ? sortDir : undefined);
}

export function sumCheck(project: Project, runtime: Runtime, expression: string): number {
  const value = evaluate(expression, scopeFor(project, runtime));
  return typeof value === 'number' ? value : Number(value) || 0;
}

export { applySort, sumRows };
