export const CREATION_TYPES = [
  'website',
  'dashboard',
  'presentation',
  'document',
  'graphic',
  'interactive',
  'diagram',
  'moodboard',
] as const;

export type CreationType = (typeof CREATION_TYPES)[number];

export const NODE_TYPES = [
  'text',
  'image',
  'shape',
  'container',
  'button',
  'input',
  'chart',
  'table',
  'nav',
  'metric',
  'swatch',
  'progress',
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export type Cell = string | number | boolean;

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

export interface Style {
  background?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  fontSize?: number;
  fontWeight?: '400' | '500' | '600' | '700' | '800';
  align?: 'left' | 'center' | 'right';
  padding?: number;
  opacity?: number;
  shadow?: boolean;
  letterSpacing?: number;
  italic?: boolean;
  font?: 'display' | 'body';
}

export interface DataRow {
  [key: string]: Cell | undefined;
}

export interface DataTable {
  columns?: string[];
  rows: DataRow[];
}

export type FilterMode = 'all' | 'equals' | 'period' | 'contains';

export interface FilterSpec {
  state: string;
  field?: string;
  mode: FilterMode;
  fields?: string[];
}

export interface ChartSpec {
  kind: 'bar' | 'line' | 'donut' | 'area';
  table: string;
  label: string;
  value: string;
  filter?: FilterSpec;
  where?: { field: string; value: string };
  staticSeries?: { label: string; value: number }[];
}

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableSpec {
  source: string;
  columns: TableColumn[];
  filter?: FilterSpec;
  where?: { field: string; value: string };
  sortState?: string;
  sortDirState?: string;
}

export type Action =
  | { type: 'navigate'; pageId: string }
  | { type: 'set'; key: string; value: Cell }
  | { type: 'setExpr'; key: string; expr: string }
  | { type: 'toggle'; key: string }
  | { type: 'inc'; key: string; by?: number }
  | { type: 'calculate'; target: string; expression: string }
  | { type: 'filter'; key: string; value: Cell }
  | { type: 'sort'; key: string; field: string; direction: 'asc' | 'desc' }
  | { type: 'submit'; message?: string }
  | { type: 'message'; text: string }
  | { type: 'link'; url: string };

export interface Interaction {
  event: 'press' | 'change';
  actions: Action[];
}

export interface NavItem {
  label: string;
  pageId: string;
}

export interface TouchNode {
  id: string;
  type: NodeType;
  name: string;
  frame: Frame;
  style: Style;
  text?: string;
  placeholder?: string;
  src?: string;
  label?: string;
  valueExpr?: string;
  format?: 'number' | 'currency' | 'percent';
  shape?: 'rect' | 'ellipse' | 'line';
  bind?: string;
  chart?: ChartSpec;
  table?: TableSpec;
  items?: NavItem[];
  progressExpr?: string;
  interactions?: Interaction[];
  visibleWhen?: string;
  activeWhen?: string;
  activeStyle?: Style;
  locked?: boolean;
}

export interface Page {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  nodeIds: string[];
}

export interface Theme {
  ink: string;
  paper: string;
  card: string;
  muted: string;
  line: string;
  accent: string;
  accentText: string;
  accent2: string;
  good: string;
  warn: string;
}

export interface ProjectMeta {
  provider: 'engine' | 'openai';
  sample?: boolean;
  layout?: 'free' | 'stack' | 'grid';
}

export interface Project {
  id: string;
  name: string;
  type: CreationType;
  prompt: string;
  pages: Page[];
  nodes: Record<string, TouchNode>;
  state: Record<string, Cell>;
  data: Record<string, DataTable>;
  theme: Theme;
  meta: ProjectMeta;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface VersionSnap {
  id: string;
  at: string;
  label: string;
  snapshot: Project;
}

export interface PublishedProject {
  slug: string;
  projectId: string;
  name: string;
  snapshot: Project;
  at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
}

export type VariationTone = 'minimal' | 'bold' | 'playful';

export type Operation =
  | { op: 'create_page'; page: Page }
  | { op: 'update_page'; id: string; patch: Partial<Pick<Page, 'name' | 'width' | 'height' | 'background'>> }
  | { op: 'add_component'; pageId: string; component: TouchNode }
  | { op: 'update_component'; id: string; patch: Partial<TouchNode> }
  | { op: 'remove_component'; id: string }
  | { op: 'move_component'; id: string; x: number; y: number }
  | { op: 'resize_component'; id: string; width: number; height: number }
  | { op: 'update_style'; id: string; style: Partial<Style> }
  | { op: 'update_interaction'; id: string; interactions: Interaction[] }
  | { op: 'generate_image'; id: string; prompt: string; url?: string }
  | { op: 'create_variation'; tone?: VariationTone }
  | { op: 'inspect_project' }
  | { op: 'validate_project' }
  | { op: 'publish_project' }
  | { op: 'set_state_default'; key: string; value: Cell }
  | { op: 'rename_project'; name: string }
  | { op: 'set_type'; creationType: CreationType }
  | { op: 'update_data'; table: string; rows: DataRow[] }
  | { op: 'reorder_component'; id: string; direction: 'front' | 'back' | 'forward' | 'backward' };

export interface Runtime {
  pageId: string;
  state: Record<string, Cell>;
  message: string | null;
  link: string | null;
}

export interface Scope {
  state: Record<string, Cell>;
  data: Record<string, DataTable>;
}
