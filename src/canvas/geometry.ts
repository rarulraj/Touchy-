import type { Frame, TouchNode } from '@/schema/types';

export interface Point {
  x: number;
  y: number;
}

export interface Guide {
  orientation: 'x' | 'y';
  at: number;
}

export function pointInFrame(frame: Frame, x: number, y: number): boolean {
  return x >= frame.x && y >= frame.y && x <= frame.x + frame.width && y <= frame.y + frame.height;
}

export function hitTest(order: string[], nodes: Record<string, TouchNode>, x: number, y: number): TouchNode | null {
  for (let index = order.length - 1; index >= 0; index -= 1) {
    const node = nodes[order[index] ?? ''];
    if (!node) continue;
    if (pointInFrame(node.frame, x, y)) return node;
  }
  return null;
}

export type HandleKind = 'nw' | 'ne' | 'se' | 'sw' | 'rotate';

export function hitHandle(
  nodes: TouchNode[],
  x: number,
  y: number,
): { id: string; kind: HandleKind } | null {
  const reach = 18;
  for (const node of nodes) {
    const { frame } = node;
    const corners: { kind: HandleKind; x: number; y: number }[] = [
      { kind: 'nw', x: frame.x, y: frame.y },
      { kind: 'ne', x: frame.x + frame.width, y: frame.y },
      { kind: 'se', x: frame.x + frame.width, y: frame.y + frame.height },
      { kind: 'sw', x: frame.x, y: frame.y + frame.height },
      { kind: 'rotate', x: frame.x + frame.width / 2, y: frame.y - 28 },
    ];
    for (const corner of corners) {
      if (Math.abs(corner.x - x) <= reach && Math.abs(corner.y - y) <= reach) {
        return { id: node.id, kind: corner.kind };
      }
    }
  }
  return null;
}

export function pointInPolygon(polygon: Point[], point: Point): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    const intersect =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || 0.00001) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function nodesInLasso(order: string[], nodes: Record<string, TouchNode>, polygon: Point[]): TouchNode[] {
  if (polygon.length < 3) return [];
  const hits: TouchNode[] = [];
  for (const id of order) {
    const node = nodes[id];
    if (node && frameHitsPolygon(node.frame, polygon)) hits.push(node);
  }
  return hits;
}

function frameHitsPolygon(frame: Frame, polygon: Point[]): boolean {
  const corners = [
    { x: frame.x, y: frame.y },
    { x: frame.x + frame.width, y: frame.y },
    { x: frame.x + frame.width, y: frame.y + frame.height },
    { x: frame.x, y: frame.y + frame.height },
    { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 },
  ];
  if (corners.some((corner) => pointInPolygon(polygon, corner))) return true;
  return polygon.some((point) => pointInFrame(frame, point.x, point.y));
}

export function resizeFrame(frame: Frame, kind: HandleKind, dx: number, dy: number): Frame {
  let { x, y, width, height } = frame;
  if (kind === 'rotate') return frame;
  if (kind === 'ne' || kind === 'se') width += dx;
  if (kind === 'nw' || kind === 'sw') {
    x += dx;
    width -= dx;
  }
  if (kind === 'sw' || kind === 'se') height += dy;
  if (kind === 'nw' || kind === 'ne') {
    y += dy;
    height -= dy;
  }
  if (width < 36) {
    if (kind === 'nw' || kind === 'sw') x -= 36 - width;
    width = 36;
  }
  if (height < 28) {
    if (kind === 'nw' || kind === 'ne') y -= 28 - height;
    height = 28;
  }
  return { ...frame, x, y, width, height };
}

export function rotationFromCenter(frame: Frame, x: number, y: number): number {
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  return (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
}

export function snapMove(
  frame: Frame,
  others: Frame[],
  pageWidth: number,
  threshold = 6,
): { x: number; y: number; guides: Guide[] } {
  let x = frame.x;
  let y = frame.y;
  const guides: Guide[] = [];
  const vertical = [0, pageWidth / 2 - frame.width / 2, pageWidth - frame.width];
  const movingX = [x, x + frame.width / 2, x + frame.width];
  const targetsX = vertical.flatMap((edge, index) => {
    if (index === 0) return [{ edge, delta: edge - x, guide: 0 }];
    if (index === 1) return [{ edge, delta: edge - x, guide: pageWidth / 2 }];
    return [{ edge, delta: edge - x, guide: pageWidth }];
  });
  for (const other of others) {
    targetsX.push(
      { edge: other.x, delta: other.x - x, guide: other.x },
      { edge: other.x + other.width, delta: other.x + other.width - (x + frame.width), guide: other.x + other.width },
      {
        edge: other.x + other.width / 2,
        delta: other.x + other.width / 2 - (x + frame.width / 2),
        guide: other.x + other.width / 2,
      },
    );
  }
  const bestX = targetsX
    .filter((target) => Math.abs(target.delta) <= threshold)
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  if (bestX) {
    x += bestX.delta;
    guides.push({ orientation: 'x', at: bestX.guide });
  }
  const targetsY = [
    { delta: 0 - y, guide: 0 },
    ...others.flatMap((other) => [
      { delta: other.y - y, guide: other.y },
      { delta: other.y + other.height - (y + frame.height), guide: other.y + other.height },
      { delta: other.y + other.height / 2 - (y + frame.height / 2), guide: other.y + other.height / 2 },
    ]),
  ];
  const bestY = targetsY
    .filter((target) => Math.abs(target.delta) <= threshold)
    .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))[0];
  if (bestY) {
    y += bestY.delta;
    guides.push({ orientation: 'y', at: bestY.guide });
  }
  void movingX;
  return { x, y, guides };
}

export function alignNodes(
  nodes: TouchNode[],
  how: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
): Record<string, { x: number; y: number }> {
  if (!nodes.length) return {};
  const left = Math.min(...nodes.map((node) => node.frame.x));
  const top = Math.min(...nodes.map((node) => node.frame.y));
  const right = Math.max(...nodes.map((node) => node.frame.x + node.frame.width));
  const bottom = Math.max(...nodes.map((node) => node.frame.y + node.frame.height));
  const moves: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    let x = node.frame.x;
    let y = node.frame.y;
    if (how === 'left') x = left;
    if (how === 'right') x = right - node.frame.width;
    if (how === 'center') x = left + (right - left) / 2 - node.frame.width / 2;
    if (how === 'top') y = top;
    if (how === 'bottom') y = bottom - node.frame.height;
    if (how === 'middle') y = top + (bottom - top) / 2 - node.frame.height / 2;
    moves[node.id] = { x, y };
  }
  return moves;
}

export function screenToCanvas(x: number, y: number, tx: number, ty: number, scale: number): Point {
  const safe = scale || 1;
  return { x: (x - tx) / safe, y: (y - ty) / safe };
}

export function clampFrame(frame: Frame, pageWidth: number, pageHeight: number): Frame {
  const width = Math.min(frame.width, pageWidth);
  const height = Math.min(frame.height, pageHeight);
  return {
    ...frame,
    width,
    height,
    x: clamp(frame.x, 0, Math.max(0, pageWidth - width)),
    y: clamp(frame.y, 0, Math.max(0, pageHeight - height)),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
