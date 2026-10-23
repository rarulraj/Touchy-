import { freshPage, touchStyle } from '@/ai/operations';
import { photoFor } from '@/ai/palette';
import { createId } from '@/schema/ids';
import type { Operation, Project, TouchNode } from '@/schema/types';

export interface EditPlan {
  summary: string;
  operations: Operation[];
}

export function planEdits(project: Project, selectedIds: string[], instruction: string): EditPlan {
  const text = instruction.toLowerCase().trim();
  const selected = selectedIds.map((id) => project.nodes[id]).filter((node): node is TouchNode => Boolean(node));
  const page = project.pages.find((item) => item.nodeIds.some((id) => selectedIds.includes(id))) ?? project.pages[0];
  if (!page) return { summary: 'This creation has no page yet.', operations: [] };

  if (/alternative|three option|variation|show me three/.test(text)) {
    return { summary: 'Three directions, same pieces.', operations: [{ op: 'create_variation' }] };
  }
  if (/publish|share link|host/.test(text)) {
    return { summary: 'Publishing a snapshot.', operations: [{ op: 'publish_project' }] };
  }
  if (/inspect|what is this|describe/.test(text)) {
    return { summary: 'Looking at the creation.', operations: [{ op: 'inspect_project' }] };
  }
  if (/validate|check this/.test(text)) {
    return { summary: 'Checking the structure.', operations: [{ op: 'validate_project' }] };
  }
  if (/bar chart|line chart|donut|pie|area chart/.test(text)) {
    const kind = /line/.test(text) ? 'line' : /donut|pie/.test(text) ? 'donut' : /area/.test(text) ? 'area' : 'bar';
    const charts = (selected.length ? selected : Object.values(project.nodes)).filter((node) => node.chart);
    if (!charts.length) return { summary: 'There is no chart to change yet.', operations: [] };
    return {
      summary: `Switched ${charts.length} chart${charts.length === 1 ? '' : 's'} to ${kind}.`,
      operations: charts.map((node) => ({
        op: 'update_component' as const,
        id: node.id,
        patch: { chart: { ...node.chart!, kind } },
      })),
    };
  }
  if (/bigger button|larger button|buttons bigger|make these buttons/.test(text)) {
    const buttons = (selected.length ? selected : Object.values(project.nodes)).filter((node) => node.type === 'button');
    return {
      summary: `Made ${buttons.length} button${buttons.length === 1 ? '' : 's'} bigger.`,
      operations: buttons.flatMap((node) => [
        { op: 'resize_component' as const, id: node.id, width: Math.round(node.frame.width * 1.08), height: node.frame.height + 8 },
        touchStyle(node, { fontSize: (node.style.fontSize ?? 15) + 2 }),
      ]),
    };
  }
  if (/more minimal|quieter|simpler|calmer/.test(text)) {
    const targets = selected.length ? selected : Object.values(project.nodes);
    return {
      summary: 'Quieted the colors and the shadows.',
      operations: targets.map((node) =>
        touchStyle(node, {
          shadow: false,
          background: node.type === 'button' ? project.theme.card : node.style.background,
          color: node.type === 'button' ? project.theme.ink : node.style.color,
          borderWidth: node.type === 'button' ? 1 : node.style.borderWidth,
          borderColor: node.type === 'button' ? project.theme.line : node.style.borderColor,
        }),
      ),
    };
  }
  if (/more color|colorful|playful|brighter/.test(text)) {
    const targets = (selected.length ? selected : Object.values(project.nodes)).filter((node) =>
      node.type === 'container' || node.type === 'button' || node.type === 'shape' || node.type === 'swatch',
    );
    const colors = [project.theme.accent, project.theme.accent2, project.theme.good, project.theme.warn];
    return {
      summary: 'Added color to the selected pieces.',
      operations: targets.map((node, index) => touchStyle(node, { background: colors[index % colors.length], color: '#FFFFFF' })),
    };
  }
  if (/replace (this |the )?image|different photo|new photo|another picture/.test(text)) {
    const images = (selected.length ? selected : Object.values(project.nodes)).filter((node) => node.type === 'image');
    if (!images.length) return { summary: 'Circle a picture first.', operations: [] };
    return {
      summary: 'Swapped the picture.',
      operations: images.map((node, index) => ({ op: 'generate_image' as const, id: node.id, prompt: instruction, url: photoFor(instruction + index, index + 1) })),
    };
  }
  if (/another column|add a column|new column/.test(text)) {
    const table = (selected.find((node) => node.table) ?? Object.values(project.nodes).find((node) => node.table));
    if (!table?.table) return { summary: 'There is no table to extend.', operations: [] };
    const rows = (project.data[table.table.source]?.rows ?? []).map((row) => ({ ...row, note: row.note ?? '' }));
    return {
      summary: 'Added a Note column.',
      operations: [
        {
          op: 'update_component',
          id: table.id,
          patch: { table: { ...table.table, columns: [...table.table.columns, { key: 'note', label: 'Note' }] } },
        },
        { op: 'update_data', table: table.table.source, rows },
      ],
    };
  }
  if (/add (another |a )?page|new page|add a slide/.test(text)) {
    const page = freshPage(project.type === 'presentation' ? `Slide ${project.pages.length + 1}` : 'New page', project.pages[0]?.width ?? 360, project.pages[0]?.height ?? 640, project.theme.paper);
    const titleId = createId('txt');
    return {
      summary: `Added ${page.name}.`,
      operations: [
        { op: 'create_page', page },
        {
          op: 'add_component',
          pageId: page.id,
          component: {
            id: titleId,
            type: 'text',
            name: 'title',
            frame: { x: 24, y: 36, width: page.width - 48, height: 48 },
            style: { color: project.theme.ink, fontSize: 28, font: 'display' },
            text: page.name,
          },
        },
      ],
    };
  }
  if (/search bar|add search|a search/.test(text)) {
    const id = createId('search');
    const tables = Object.values(project.nodes).filter((node) => node.table);
    return {
      summary: 'Added a search field.',
      operations: [
        { op: 'set_state_default', key: 'query', value: '' },
        {
          op: 'add_component',
          pageId: page.id,
          component: {
            id,
            type: 'input',
            name: 'search',
            frame: { x: 16, y: 16, width: page.width - 32, height: 44 },
            style: { background: project.theme.card, color: project.theme.ink, radius: 14, padding: 12, borderWidth: 1, borderColor: project.theme.line },
            placeholder: 'Search',
            bind: 'query',
          },
        },
        ...tables.map((node) => ({
          op: 'update_component' as const,
          id: node.id,
          patch: {
            table: {
              ...node.table!,
              filter: {
                state: 'query',
                mode: 'contains' as const,
                fields: node.table!.columns.map((column) => column.key),
              },
            },
          },
        })),
      ],
    };
  }
  if (/make (this |it )?interactive|add a tap|make this work/.test(text)) {
    const buttonId = createId('btn');
    const labelId = createId('lbl');
    const anchor = selected[0];
    const x = anchor ? anchor.frame.x : 20;
    const y = anchor ? anchor.frame.y + anchor.frame.height + 12 : 80;
    return {
      summary: 'Added a tap that counts.',
      operations: [
        { op: 'set_state_default', key: 'taps', value: 0 },
        {
          op: 'add_component',
          pageId: page.id,
          component: {
            id: buttonId,
            type: 'button',
            name: 'tap',
            text: 'Tap',
            frame: { x, y, width: 120, height: 44 },
            style: { background: project.theme.accent, color: project.theme.accentText, radius: 22, align: 'center', fontWeight: '700' },
            interactions: [{ event: 'press', actions: [{ type: 'inc', key: 'taps', by: 1 }] }],
          },
        },
        {
          op: 'add_component',
          pageId: page.id,
          component: {
            id: labelId,
            type: 'text',
            name: 'tap count',
            text: '{{ state.taps }} taps',
            frame: { x: x + 132, y, width: 140, height: 44 },
            style: { color: project.theme.ink, fontSize: 16, fontWeight: '600' },
          },
        },
      ],
    };
  }
  if (/presentation|into a deck|make it slides/.test(text)) {
    const operations: Operation[] = [{ op: 'set_type', creationType: 'presentation' }];
    project.pages.forEach((item, index) => {
      operations.push({ op: 'update_page', id: item.id, patch: { name: `Slide ${index + 1}`, width: 360, height: 640 } });
    });
    return { summary: 'Turned the pages into slides.', operations };
  }
  if (/mobile|one column|stack|change the layout|reflow/.test(text)) {
    const nodes = page.nodeIds
      .map((id) => project.nodes[id])
      .filter((node): node is TouchNode => Boolean(node) && node.type !== 'nav' && !node.locked);
    nodes.sort((a, b) => a.frame.y - b.frame.y || a.frame.x - b.frame.x);
    let y = 72;
    const operations: Operation[] = [];
    for (const node of nodes) {
      const height = Math.max(44, Math.min(node.frame.height, 220));
      operations.push({ op: 'move_component', id: node.id, x: 16, y });
      operations.push({ op: 'resize_component', id: node.id, width: 328, height });
      y += height + 12;
    }
    operations.push({ op: 'update_page', id: page.id, patch: { width: 360, height: Math.max(640, y + 24) } });
    return { summary: 'Stacked the page into a phone column.', operations };
  }
  if (/delete|remove/.test(text) && selected.length) {
    return {
      summary: `Removed ${selected.length} piece${selected.length === 1 ? '' : 's'}.`,
      operations: selected.filter((node) => !node.locked).map((node) => ({ op: 'remove_component' as const, id: node.id })),
    };
  }
  if (/duplicate|copy this/.test(text) && selected.length) {
    return {
      summary: 'Duplicated the selection.',
      operations: selected.map((node) => ({
        op: 'add_component' as const,
        pageId: page.id,
        component: {
          ...node,
          id: createId('dup'),
          name: `${node.name} copy`,
          frame: { ...node.frame, x: node.frame.x + 16, y: node.frame.y + 16 },
        },
      })),
    };
  }
  if (/front|bring forward/.test(text) && selected.length) {
    return { summary: 'Brought them forward.', operations: selected.map((node) => ({ op: 'reorder_component' as const, id: node.id, direction: 'front' as const })) };
  }
  if (/send back|behind/.test(text) && selected.length) {
    return { summary: 'Sent them back.', operations: selected.map((node) => ({ op: 'reorder_component' as const, id: node.id, direction: 'back' as const })) };
  }
  if (/bigger text|larger type|text bigger/.test(text)) {
    const targets = (selected.length ? selected : Object.values(project.nodes)).filter((node) => node.text || node.type === 'text');
    return {
      summary: 'Increased the type.',
      operations: targets.map((node) => touchStyle(node, { fontSize: (node.style.fontSize ?? 16) + 4 })),
    };
  }

  return {
    summary: 'I can restyle, add a page, resize buttons, switch a chart, or stack the layout. Circle the piece and try one of those.',
    operations: [{ op: 'inspect_project' }],
  };
}
