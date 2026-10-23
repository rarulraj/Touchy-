import type { Intent } from '@/ai/intent';
import { createId, nowIso } from '@/schema/ids';
import type {
  Cell,
  CreationType,
  DataTable,
  Frame,
  NodeType,
  Page,
  Project,
  Style,
  TouchNode,
} from '@/schema/types';

export interface Draft {
  intent: Intent;
  pages: Page[];
  nodes: Record<string, TouchNode>;
  state: Record<string, Cell>;
  data: Record<string, DataTable>;
  page: (id: string, name: string, width: number, height: number, background?: string) => Page;
  put: (pageId: string, type: NodeType, box: Frame, seed?: NodeSeed) => TouchNode;
  finish: (name?: string, type?: CreationType) => Project;
}

type NodeSeed = Partial<Omit<TouchNode, 'frame' | 'type'>> & { style?: Style };

export function draft(intent: Intent): Draft {
  let count = 0;
  const pages: Page[] = [];
  const nodes: Record<string, TouchNode> = {};
  const state: Record<string, Cell> = {};
  const data: Record<string, DataTable> = {};
  return {
    intent,
    pages,
    nodes,
    state,
    data,
    page(id, name, width, height, background = intent.theme.paper) {
      const next = { id, name, width, height, background, nodeIds: [] as string[] };
      pages.push(next);
      return next;
    },
    put(pageId, type, box, seed = {}) {
      count += 1;
      const node: TouchNode = {
        ...seed,
        id: seed.id ?? `${type.slice(0, 3)}_${count}`,
        type,
        name: seed.name ?? `${type} ${count}`,
        frame: box,
        style: seed.style ?? {},
      };
      nodes[node.id] = node;
      pages.find((page) => page.id === pageId)?.nodeIds.push(node.id);
      return node;
    },
    finish(name = intent.title, type = intent.type) {
      const stamp = nowIso();
      return {
        id: createId('prj'),
        name: name.slice(0, 80),
        type,
        prompt: intent.prompt,
        pages,
        nodes,
        state,
        data,
        theme: intent.theme,
        meta: { provider: 'engine', layout: 'free' },
        createdAt: stamp,
        updatedAt: stamp,
        version: 1,
      };
    },
  };
}

export function box(x: number, y: number, width: number, height: number, rotation?: number): Frame {
  return rotation == null ? { x, y, width, height } : { x, y, width, height, rotation };
}

export function press(actions: NonNullable<TouchNode['interactions']>[number]['actions']): TouchNode['interactions'] {
  return [{ event: 'press', actions }];
}
