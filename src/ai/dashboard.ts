import type { Intent } from '@/ai/intent';
import { box, draft, press } from '@/ai/kit';
import type { DataRow, Project } from '@/schema/types';

const FINANCE_ROWS: DataRow[] = [
  { name: 'Groceries', category: 'Food', amount: 120, span: 'week', kind: 'expense' },
  { name: 'Cafe', category: 'Food', amount: 18, span: 'week', kind: 'expense' },
  { name: 'Metro', category: 'Travel', amount: 32, span: 'week', kind: 'expense' },
  { name: 'Dinner', category: 'Food', amount: 64, span: 'week', kind: 'expense' },
  { name: 'Rent', category: 'Home', amount: 1800, span: 'month', kind: 'expense' },
  { name: 'Utilities', category: 'Home', amount: 140, span: 'month', kind: 'expense' },
  { name: 'Gym', category: 'Health', amount: 48, span: 'month', kind: 'expense' },
  { name: 'Insurance', category: 'Home', amount: 220, span: 'older', kind: 'expense' },
  { name: 'Flight', category: 'Travel', amount: 540, span: 'older', kind: 'expense' },
  { name: 'Paycheck', category: 'Income', amount: 1400, span: 'week', kind: 'income' },
  { name: 'Paycheck', category: 'Income', amount: 2800, span: 'month', kind: 'income' },
  { name: 'Bonus', category: 'Income', amount: 2200, span: 'older', kind: 'income' },
];

export function buildDashboard(intent: Intent): Project {
  const d = draft(intent);
  const theme = intent.theme;
  const finance = /finance|budget|spend|money|expense|personal/.test(
    `${intent.prompt} ${intent.subject}`.toLowerCase(),
  );
  d.state.range = 'all';
  d.state.txSort = 'amount';
  d.state.txSortDir = 'desc';
  d.data.transactions = {
    columns: ['name', 'category', 'amount', 'span', 'kind'],
    rows: finance ? FINANCE_ROWS : themedRows(intent.subject),
  };

  const page = d.page('board', 'Board', 360, 1080, theme.paper);
  d.put(page.id, 'shape', box(0, 0, 360, 168), {
    name: 'header wash',
    shape: 'rect',
    style: { background: theme.accent, radius: 0 },
  });
  d.put(page.id, 'text', box(20, 28, 240, 18), {
    name: 'eyebrow',
    text: finance ? 'money, in one place' : intent.subject,
    style: { color: 'rgba(255,255,255,0.78)', fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  });
  d.put(page.id, 'text', box(20, 50, 300, 46), {
    name: 'title',
    text: intent.title,
    style: { color: '#FFFFFF', fontSize: 34, font: 'display', fontWeight: '700' },
  });
  d.put(page.id, 'text', box(20, 104, 300, 36), {
    name: 'dek',
    text: 'Week, month, and everything. Same records, different cut.',
    style: { color: 'rgba(255,255,255,0.86)', fontSize: 14 },
  });

  const filters = [
    ['all', 'All', 16],
    ['week', 'Week', 124],
    ['month', 'Month', 232],
  ] as const;
  for (const [value, label, x] of filters) {
    d.put(page.id, 'button', box(x, 188, 100, 40), {
      name: `${label} filter`,
      text: label,
      style: {
        background: theme.card,
        color: theme.ink,
        radius: 20,
        fontSize: 14,
        fontWeight: '600',
        align: 'center',
        borderColor: theme.line,
        borderWidth: 1,
        shadow: true,
      },
      activeWhen: `state.range == '${value}'`,
      activeStyle: { background: theme.ink, color: theme.paper, borderColor: theme.ink },
      interactions: press([{ type: 'filter', key: 'range', value }]),
    });
  }

  d.put(page.id, 'metric', box(16, 246, 160, 92), {
    name: 'spent',
    label: finance ? 'Spent' : 'Activity',
    format: 'currency',
    valueExpr: "sumFiltered('transactions','amount', state.range, 'kind', 'expense')",
    style: { background: theme.card, color: theme.ink, radius: 22, padding: 14, shadow: true, font: 'display', fontSize: 28 },
  });
  d.put(page.id, 'metric', box(184, 246, 160, 92), {
    name: 'left',
    label: finance ? 'Left' : 'Net',
    format: 'currency',
    valueExpr:
      "sumFiltered('transactions','amount', state.range, 'kind', 'income') - sumFiltered('transactions','amount', state.range, 'kind', 'expense')",
    style: { background: theme.ink, color: theme.paper, radius: 22, padding: 14, font: 'display', fontSize: 28 },
  });

  d.put(page.id, 'container', box(16, 354, 328, 236), {
    name: 'chart card',
    style: { background: theme.card, radius: 24, shadow: true },
  });
  d.put(page.id, 'text', box(32, 368, 200, 22), {
    name: 'chart label',
    text: 'By category',
    style: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  });
  d.put(page.id, 'chart', box(32, 396, 296, 176), {
    name: 'spend chart',
    chart: {
      kind: 'bar',
      table: 'transactions',
      label: 'category',
      value: 'amount',
      filter: { state: 'range', mode: 'period' },
      where: { field: 'kind', value: 'expense' },
    },
    style: { color: theme.accent, background: 'transparent' },
  });

  d.put(page.id, 'text', box(20, 608, 160, 24), {
    name: 'table label',
    text: 'Transactions',
    style: { color: theme.ink, fontSize: 18, font: 'display' },
  });
  d.put(page.id, 'button', box(188, 604, 74, 32), {
    name: 'sort amount',
    text: 'Amount',
    style: { background: theme.card, color: theme.ink, radius: 16, fontSize: 12, fontWeight: '600', align: 'center', borderWidth: 1, borderColor: theme.line },
    activeWhen: "state.txSort == 'amount'",
    activeStyle: { background: theme.accent, color: theme.accentText, borderColor: theme.accent },
    interactions: press([{ type: 'sort', key: 'txSort', field: 'amount', direction: 'desc' }]),
  });
  d.put(page.id, 'button', box(268, 604, 76, 32), {
    name: 'sort name',
    text: 'Name',
    style: { background: theme.card, color: theme.ink, radius: 16, fontSize: 12, fontWeight: '600', align: 'center', borderWidth: 1, borderColor: theme.line },
    activeWhen: "state.txSort == 'name'",
    activeStyle: { background: theme.accent, color: theme.accentText, borderColor: theme.accent },
    interactions: press([{ type: 'sort', key: 'txSort', field: 'name', direction: 'asc' }]),
  });
  d.put(page.id, 'table', box(16, 648, 328, 400), {
    name: 'transactions',
    table: {
      source: 'transactions',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount' },
      ],
      filter: { state: 'range', mode: 'period' },
      where: { field: 'kind', value: 'expense' },
      sortState: 'txSort',
      sortDirState: 'txSortDir',
    },
    style: { background: theme.card, radius: 22, color: theme.ink, fontSize: 13 },
  });

  return d.finish(finance ? 'Personal finance' : intent.title, 'dashboard');
}

function themedRows(subject: string): DataRow[] {
  const name = subject || 'Item';
  return [
    { name: `${name} small`, category: 'Core', amount: 80, span: 'week', kind: 'expense' },
    { name: `${name} visit`, category: 'People', amount: 45, span: 'week', kind: 'expense' },
    { name: `${name} tools`, category: 'Tools', amount: 30, span: 'week', kind: 'expense' },
    { name: `${name} retainer`, category: 'Core', amount: 600, span: 'month', kind: 'expense' },
    { name: `${name} studio`, category: 'Tools', amount: 220, span: 'month', kind: 'expense' },
    { name: `${name} archive`, category: 'Extra', amount: 140, span: 'older', kind: 'expense' },
    { name: 'Incoming', category: 'Income', amount: 900, span: 'week', kind: 'income' },
    { name: 'Incoming', category: 'Income', amount: 1600, span: 'month', kind: 'income' },
    { name: 'Incoming', category: 'Income', amount: 400, span: 'older', kind: 'income' },
  ];
}
