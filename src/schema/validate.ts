import { z } from 'zod';

import { CREATION_TYPES, NODE_TYPES, type Operation, type Project } from '@/schema/types';

const cell = z.union([z.string(), z.number(), z.boolean()]);

const frameSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().optional(),
});

const styleSchema = z.object({
  background: z.string().optional(),
  color: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  radius: z.number().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.enum(['400', '500', '600', '700', '800']).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  padding: z.number().optional(),
  opacity: z.number().optional(),
  shadow: z.boolean().optional(),
  letterSpacing: z.number().optional(),
  italic: z.boolean().optional(),
  font: z.enum(['display', 'body']).optional(),
});

const filterSchema = z.object({
  state: z.string(),
  field: z.string().optional(),
  mode: z.enum(['all', 'equals', 'period', 'contains']),
  fields: z.array(z.string()).optional(),
});

const whereSchema = z.object({ field: z.string(), value: z.string() });

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('navigate'), pageId: z.string() }),
  z.object({ type: z.literal('set'), key: z.string(), value: cell }),
  z.object({ type: z.literal('setExpr'), key: z.string(), expr: z.string().max(500) }),
  z.object({ type: z.literal('toggle'), key: z.string() }),
  z.object({ type: z.literal('inc'), key: z.string(), by: z.number().optional() }),
  z.object({ type: z.literal('calculate'), target: z.string(), expression: z.string().max(500) }),
  z.object({ type: z.literal('filter'), key: z.string(), value: cell }),
  z.object({
    type: z.literal('sort'),
    key: z.string(),
    field: z.string(),
    direction: z.enum(['asc', 'desc']),
  }),
  z.object({ type: z.literal('submit'), message: z.string().optional() }),
  z.object({ type: z.literal('message'), text: z.string().max(400) }),
  z.object({ type: z.literal('link'), url: z.string().max(500) }),
]);

const nodeSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(NODE_TYPES),
  name: z.string().max(120),
  frame: frameSchema,
  style: styleSchema,
  text: z.string().max(2000).optional(),
  placeholder: z.string().max(200).optional(),
  src: z.string().max(800).optional(),
  label: z.string().max(200).optional(),
  valueExpr: z.string().max(500).optional(),
  format: z.enum(['number', 'currency', 'percent']).optional(),
  shape: z.enum(['rect', 'ellipse', 'line']).optional(),
  bind: z.string().max(80).optional(),
  chart: z
    .object({
      kind: z.enum(['bar', 'line', 'donut', 'area']),
      table: z.string(),
      label: z.string(),
      value: z.string(),
      filter: filterSchema.optional(),
      where: whereSchema.optional(),
      staticSeries: z.array(z.object({ label: z.string(), value: z.number() })).optional(),
    })
    .optional(),
  table: z
    .object({
      source: z.string(),
      columns: z.array(z.object({ key: z.string(), label: z.string() })),
      filter: filterSchema.optional(),
      where: whereSchema.optional(),
      sortState: z.string().optional(),
      sortDirState: z.string().optional(),
    })
    .optional(),
  items: z.array(z.object({ label: z.string(), pageId: z.string() })).optional(),
  progressExpr: z.string().max(500).optional(),
  interactions: z.array(z.object({ event: z.enum(['press', 'change']), actions: z.array(actionSchema) })).optional(),
  visibleWhen: z.string().max(300).optional(),
  activeWhen: z.string().max(300).optional(),
  activeStyle: styleSchema.optional(),
  locked: z.boolean().optional(),
});

const pageSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().max(80),
  width: z.number().positive(),
  height: z.number().positive(),
  background: z.string(),
  nodeIds: z.array(z.string()),
});

const themeSchema = z.object({
  ink: z.string(),
  paper: z.string(),
  card: z.string(),
  muted: z.string(),
  line: z.string(),
  accent: z.string(),
  accentText: z.string(),
  accent2: z.string(),
  good: z.string(),
  warn: z.string(),
});

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  type: z.enum(CREATION_TYPES),
  prompt: z.string().max(2000),
  pages: z.array(pageSchema).min(1).max(24),
  nodes: z.record(z.string(), nodeSchema),
  state: z.record(z.string(), cell),
  data: z.record(
    z.string(),
    z.object({
      columns: z.array(z.string()).optional(),
      rows: z.array(z.record(z.string(), cell)).max(200),
    }),
  ),
  theme: themeSchema,
  meta: z
    .object({
      provider: z.enum(['engine', 'openai']).default('engine'),
      sample: z.boolean().optional(),
      layout: z.enum(['free', 'stack', 'grid']).optional(),
    })
    .default({ provider: 'engine' }),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().nonnegative(),
});

const operationSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create_page'), page: pageSchema }),
  z.object({
    op: z.literal('update_page'),
    id: z.string(),
    patch: z.object({
      name: z.string().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      background: z.string().optional(),
    }),
  }),
  z.object({ op: z.literal('add_component'), pageId: z.string(), component: nodeSchema }),
  z.object({ op: z.literal('update_component'), id: z.string(), patch: nodeSchema.partial() }),
  z.object({ op: z.literal('remove_component'), id: z.string() }),
  z.object({ op: z.literal('move_component'), id: z.string(), x: z.number(), y: z.number() }),
  z.object({ op: z.literal('resize_component'), id: z.string(), width: z.number().positive(), height: z.number().positive() }),
  z.object({ op: z.literal('update_style'), id: z.string(), style: styleSchema.partial() }),
  z.object({
    op: z.literal('update_interaction'),
    id: z.string(),
    interactions: z.array(z.object({ event: z.enum(['press', 'change']), actions: z.array(actionSchema) })),
  }),
  z.object({
    op: z.literal('generate_image'),
    id: z.string(),
    prompt: z.string().max(400),
    url: z.string().max(800).optional(),
  }),
  z.object({ op: z.literal('create_variation'), tone: z.enum(['minimal', 'bold', 'playful']).optional() }),
  z.object({ op: z.literal('inspect_project') }),
  z.object({ op: z.literal('validate_project') }),
  z.object({ op: z.literal('publish_project') }),
  z.object({ op: z.literal('set_state_default'), key: z.string(), value: cell }),
  z.object({ op: z.literal('rename_project'), name: z.string().min(1).max(80) }),
  z.object({ op: z.literal('set_type'), creationType: z.enum(CREATION_TYPES) }),
  z.object({
    op: z.literal('update_data'),
    table: z.string(),
    rows: z.array(z.record(z.string(), cell)).max(200),
  }),
  z.object({
    op: z.literal('reorder_component'),
    id: z.string(),
    direction: z.enum(['front', 'back', 'forward', 'backward']),
  }),
]);

export function validateProject(input: unknown): { ok: true; project: Project } | { ok: false; errors: string[] } {
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
  }
  const project = parsed.data as Project;
  const structural = structuralErrors(project);
  if (structural.length) return { ok: false, errors: structural };
  return { ok: true, project };
}

export function validateOperations(input: unknown): { ok: true; operations: Operation[] } | { ok: false; errors: string[] } {
  const parsed = z.array(operationSchema).max(80).safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
  }
  return { ok: true, operations: parsed.data as Operation[] };
}

export function structuralErrors(project: Project): string[] {
  const errors: string[] = [];
  const pageIds = new Set<string>();
  for (const page of project.pages) {
    if (pageIds.has(page.id)) errors.push(`Duplicate page ${page.id}`);
    pageIds.add(page.id);
    for (const nodeId of page.nodeIds) {
      if (!project.nodes[nodeId]) errors.push(`Page ${page.name} is missing component ${nodeId}`);
    }
  }
  if (Object.keys(project.nodes).length > 400) errors.push('A creation can hold up to 400 components');
  return errors;
}
