import { photoFor, themeFor, type Tone } from '@/ai/palette';
import { clone, createId, nowIso } from '@/schema/ids';
import { structuralErrors, validateProject } from '@/schema/validate';
import type { Operation, Page, Project, Style, TouchNode, VariationTone } from '@/schema/types';

export interface ApplyResult {
  project: Project;
  notes: string[];
  variants: Project[];
  publish: boolean;
}

export function applyOperations(project: Project, operations: Operation[]): ApplyResult {
  let next = clone(project);
  const notes: string[] = [];
  const variants: Project[] = [];
  let publish = false;
  for (const operation of operations) {
    try {
      const step = applyOne(next, operation);
      next = step.project;
      notes.push(...step.notes);
      variants.push(...step.variants);
      publish = publish || step.publish;
    } catch (error) {
      notes.push(error instanceof Error ? error.message : 'Skipped one change.');
    }
  }
  next.updatedAt = nowIso();
  next.version += 1;
  return { project: next, notes, variants, publish };
}

function applyOne(project: Project, operation: Operation): ApplyResult {
  const notes: string[] = [];
  const variants: Project[] = [];
  switch (operation.op) {
    case 'create_page': {
      if (project.pages.some((page) => page.id === operation.page.id)) {
        notes.push(`Page ${operation.page.name} is already there.`);
        return { project, notes, variants, publish: false };
      }
      project.pages.push(operation.page);
      notes.push(`Added ${operation.page.name}.`);
      return { project, notes, variants, publish: false };
    }
    case 'update_page': {
      const page = project.pages.find((item) => item.id === operation.id);
      if (!page) return miss(project, operation.id);
      Object.assign(page, operation.patch);
      notes.push(`Updated ${page.name}.`);
      return { project, notes, variants, publish: false };
    }
    case 'add_component': {
      const page = project.pages.find((item) => item.id === operation.pageId);
      if (!page) return miss(project, operation.pageId);
      project.nodes[operation.component.id] = operation.component;
      page.nodeIds.push(operation.component.id);
      notes.push(`Added ${operation.component.name}.`);
      return { project, notes, variants, publish: false };
    }
    case 'update_component': {
      const node = project.nodes[operation.id];
      if (!node) return miss(project, operation.id);
      const patch = operation.patch;
      project.nodes[operation.id] = {
        ...node,
        ...patch,
        frame: patch.frame ? { ...node.frame, ...patch.frame } : node.frame,
        style: patch.style ? { ...node.style, ...patch.style } : node.style,
        chart: patch.chart ? { ...node.chart, ...patch.chart } : node.chart,
        table: patch.table ? { ...node.table, ...patch.table } : node.table,
      };
      notes.push(`Updated ${node.name}.`);
      return { project, notes, variants, publish: false };
    }
    case 'remove_component': {
      const node = project.nodes[operation.id];
      if (!node) return miss(project, operation.id);
      delete project.nodes[operation.id];
      for (const page of project.pages) page.nodeIds = page.nodeIds.filter((id) => id !== operation.id);
      notes.push(`Removed ${node.name}.`);
      return { project, notes, variants, publish: false };
    }
    case 'move_component': {
      const node = project.nodes[operation.id];
      if (!node) return miss(project, operation.id);
      node.frame = { ...node.frame, x: operation.x, y: operation.y };
      return { project, notes: [`Moved ${node.name}.`], variants, publish: false };
    }
    case 'resize_component': {
      const node = project.nodes[operation.id];
      if (!node) return miss(project, operation.id);
      node.frame = { ...node.frame, width: operation.width, height: operation.height };
      return { project, notes: [`Resized ${node.name}.`], variants, publish: false };
    }
    case 'update_style': {
      const node = project.nodes[operation.id];
      if (!node) return miss(project, operation.id);
      node.style = { ...node.style, ...operation.style };
      return { project, notes: [`Restyled ${node.name}.`], variants, publish: false };
    }
    case 'update_interaction': {
      const node = project.nodes[operation.id];
      if (!node) return miss(project, operation.id);
      node.interactions = operation.interactions;
      return { project, notes: [`Updated what ${node.name} does.`], variants, publish: false };
    }
    case 'generate_image': {
      const node = project.nodes[operation.id];
      if (!node) return miss(project, operation.id);
      node.type = node.type === 'image' ? 'image' : 'image';
      node.src = operation.url || photoFor(operation.prompt, node.src?.length ?? 0);
      return { project, notes: [`Replaced the picture on ${node.name}.`], variants, publish: false };
    }
    case 'create_variation': {
      const tones: VariationTone[] = ['minimal', 'bold', 'playful'];
      for (const tone of tones) variants.push(recolor(project, tone));
      notes.push('Three directions are ready.');
      return { project, notes, variants, publish: false };
    }
    case 'inspect_project':
      notes.push(inspect(project));
      return { project, notes, variants, publish: false };
    case 'validate_project': {
      const errors = structuralErrors(project);
      const parsed = validateProject(project);
      notes.push(parsed.ok && !errors.length ? 'This creation checks out.' : (parsed.ok ? errors : parsed.errors).join(' '));
      return { project, notes, variants, publish: false };
    }
    case 'publish_project':
      return { project, notes: ['Ready to publish.'], variants, publish: true };
    case 'set_state_default':
      project.state[operation.key] = operation.value;
      return { project, notes: [`Set ${operation.key}.`], variants, publish: false };
    case 'rename_project':
      project.name = operation.name;
      return { project, notes: [`Renamed to ${operation.name}.`], variants, publish: false };
    case 'set_type':
      project.type = operation.creationType;
      return { project, notes: [`This is now a ${operation.creationType}.`], variants, publish: false };
    case 'update_data': {
      project.data[operation.table] = { ...(project.data[operation.table] ?? {}), rows: operation.rows };
      return { project, notes: [`Updated ${operation.table}.`], variants, publish: false };
    }
    case 'reorder_component': {
      for (const page of project.pages) {
        const index = page.nodeIds.indexOf(operation.id);
        if (index < 0) continue;
        const ids = page.nodeIds.filter((id) => id !== operation.id);
        if (operation.direction === 'front') ids.push(operation.id);
        else if (operation.direction === 'back') ids.unshift(operation.id);
        else if (operation.direction === 'forward') ids.splice(Math.min(ids.length, index + 1), 0, operation.id);
        else ids.splice(Math.max(0, index - 1), 0, operation.id);
        page.nodeIds = ids;
      }
      return { project, notes: ['Reordered that layer.'], variants, publish: false };
    }
    default:
      return { project, notes, variants, publish: false };
  }
}

function miss(project: Project, id: string): ApplyResult {
  return { project, notes: [`Could not find ${id}.`], variants: [], publish: false };
}

function inspect(project: Project): string {
  const pages = project.pages.map((page) => page.name).join(', ');
  return `${project.name} is a ${project.type} with ${project.pages.length} page${project.pages.length === 1 ? '' : 's'} (${pages}) and ${Object.keys(project.nodes).length} pieces.`;
}

export function recolor(project: Project, tone: Tone): Project {
  const copy = clone(project);
  const theme = themeFor(tone, project.prompt);
  copy.id = createId('var');
  copy.name = `${project.name} · ${tone}`;
  copy.theme = theme;
  copy.meta = { ...copy.meta, sample: false };
  copy.updatedAt = nowIso();
  for (const node of Object.values(copy.nodes)) {
    if (node.style.background === project.theme.accent) node.style.background = theme.accent;
    if (node.style.color === project.theme.accent) node.style.color = theme.accent;
    if (node.style.background === project.theme.ink) node.style.background = theme.ink;
    if (node.activeStyle?.background === project.theme.accent && node.activeStyle) node.activeStyle.background = theme.accent;
  }
  return copy;
}

export function touchStyle(node: TouchNode, style: Partial<Style>): Operation {
  return { op: 'update_style', id: node.id, style };
}

export function freshPage(name: string, width: number, height: number, background: string): Page {
  return { id: createId('page'), name, width, height, background, nodeIds: [] };
}
