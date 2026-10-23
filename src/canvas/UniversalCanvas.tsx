import { clamp, hitHandle, hitTest, nodesInLasso, resizeFrame, rotationFromCenter, screenToCanvas, snapMove, type Point } from '@/canvas/geometry';
import { NodeView } from '@/renderer/NodeView';
import { scopeFor } from '@/renderer/read';
import type { Frame, Page, Project, Runtime, TouchNode } from '@/schema/types';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

export type CanvasMode = 'play' | 'edit' | 'circle';

interface Session {
  kind: 'pan' | 'node' | 'resize' | 'rotate' | 'lasso';
  moved: boolean;
  x: number;
  y: number;
  ids: string[];
  handle?: 'nw' | 'ne' | 'se' | 'sw' | 'rotate';
  frames: Record<string, Frame>;
  originTx: number;
  originTy: number;
  originScale: number;
}

export function UniversalCanvas({
  project,
  page,
  runtime,
  mode,
  selectedIds,
  onSelect,
  onLiveFrames,
  onStrokeEnd,
  onActivate,
}: {
  project: Project;
  page: Page;
  runtime: Runtime;
  mode: CanvasMode;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onLiveFrames: (frames: Record<string, Frame>) => void;
  onStrokeEnd: (moved: boolean) => void;
  onActivate: (node: TouchNode, localX: number) => void;
}) {
  const tx = useSharedValue(24);
  const ty = useSharedValue(28);
  const scale = useSharedValue(1);
  const view = useRef({ tx: 24, ty: 28, scale: 1, width: 0, height: 0 });
  const [lasso, setLasso] = useState<Point[]>([]);
  const lassoRef = useRef<Point[]>([]);
  const pinchOrigin = useRef(1);
  const rememberLasso = (points: Point[]) => {
    lassoRef.current = points;
    setLasso(points);
  };
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const session = useRef<Session | null>(null);
  const latest = useRef({ project, page, runtime, mode, selectedIds, onSelect, onLiveFrames, onStrokeEnd, onActivate });
  latest.current = { project, page, runtime, mode, selectedIds, onSelect, onLiveFrames, onStrokeEnd, onActivate };

  const center = (width = view.current.width, height = view.current.height) => {
    if (!width || !height) return;
    const next = clamp(Math.min((width - 28) / page.width, (height - 120) / page.height, 1), 0.35, 1);
    view.current.scale = next;
    view.current.tx = (width - page.width * next) / 2;
    view.current.ty = 16;
    scale.value = next;
    tx.value = view.current.tx;
    ty.value = view.current.ty;
  };

  useEffect(() => {
    center();
  }, [page.id, page.width, page.height]);

  const begin = (x: number, y: number) => {
    const state = latest.current;
    const canvasPoint = screenToCanvas(x, y, view.current.tx, view.current.ty, view.current.scale);
    const base: Session = {
      kind: 'pan',
      moved: false,
      x,
      y,
      ids: [],
      frames: {},
      originTx: view.current.tx,
      originTy: view.current.ty,
      originScale: view.current.scale,
    };
    if (state.mode === 'circle') {
      session.current = { ...base, kind: 'lasso' };
      rememberLasso([{ x, y }]);
      return;
    }
    if (state.mode === 'edit') {
      const selected = state.selectedIds.map((id) => state.project.nodes[id]).filter((node): node is TouchNode => Boolean(node));
      const handle = hitHandle(selected, canvasPoint.x, canvasPoint.y);
      if (handle) {
        session.current = {
          ...base,
          kind: handle.kind === 'rotate' ? 'rotate' : 'resize',
          handle: handle.kind,
          ids: [handle.id],
          frames: Object.fromEntries(selected.map((node) => [node.id, { ...node.frame }])),
        };
        return;
      }
      const hit = hitTest(state.page.nodeIds, state.project.nodes, canvasPoint.x, canvasPoint.y);
      if (hit && !hit.locked) {
        const ids = state.selectedIds.includes(hit.id) ? state.selectedIds : [hit.id];
        session.current = {
          ...base,
          kind: 'node',
          ids,
          frames: Object.fromEntries(ids.map((id) => [id, { ...state.project.nodes[id]!.frame }])),
        };
        return;
      }
    }
    session.current = base;
  };

  const move = (x: number, y: number, dx: number, dy: number) => {
    const current = session.current;
    const state = latest.current;
    if (!current) return;
    if (Math.abs(dx) + Math.abs(dy) > 5) current.moved = true;
    if (current.kind === 'lasso') {
      rememberLasso([...lassoRef.current, { x, y }]);
      return;
    }
    if (current.kind === 'pan') {
      view.current.tx = current.originTx + dx;
      view.current.ty = current.originTy + dy;
      tx.value = view.current.tx;
      ty.value = view.current.ty;
      return;
    }
    const cdx = dx / view.current.scale;
    const cdy = dy / view.current.scale;
    if (current.kind === 'node') {
      const primary = current.ids[0];
      const start = primary ? current.frames[primary] : undefined;
      if (!start || !primary) return;
      const others = state.page.nodeIds
        .filter((id) => !current.ids.includes(id))
        .map((id) => state.project.nodes[id]?.frame)
        .filter((frame): frame is Frame => Boolean(frame));
      const snapped = snapMove({ ...start, x: start.x + cdx, y: start.y + cdy }, others, state.page.width);
      const shiftX = snapped.x - start.x;
      const shiftY = snapped.y - start.y;
      const frames: Record<string, Frame> = {};
      for (const id of current.ids) {
        const origin = current.frames[id];
        if (!origin) continue;
        frames[id] = { ...origin, x: origin.x + shiftX, y: origin.y + shiftY };
      }
      setGuides({ x: snapped.guides.find((guide) => guide.orientation === 'x')?.at, y: snapped.guides.find((guide) => guide.orientation === 'y')?.at });
      state.onLiveFrames(frames);
      return;
    }
    if (current.kind === 'resize' && current.handle && current.handle !== 'rotate') {
      const id = current.ids[0];
      const origin = id ? current.frames[id] : undefined;
      if (!id || !origin) return;
      state.onLiveFrames({ [id]: resizeFrame(origin, current.handle, cdx, cdy) });
      return;
    }
    if (current.kind === 'rotate') {
      const id = current.ids[0];
      const origin = id ? current.frames[id] : undefined;
      if (!id || !origin) return;
      const point = screenToCanvas(x, y, view.current.tx, view.current.ty, view.current.scale);
      state.onLiveFrames({ [id]: { ...origin, rotation: rotationFromCenter(origin, point.x, point.y) } });
    }
  };

  const end = (x: number, y: number) => {
    const current = session.current;
    const state = latest.current;
    session.current = null;
    setGuides({});
    if (!current) return;
    if (current.kind === 'lasso') {
      const polygon = lassoRef.current.map((point) => screenToCanvas(point.x, point.y, view.current.tx, view.current.ty, view.current.scale));
      const hits = nodesInLasso(state.page.nodeIds, state.project.nodes, polygon);
      state.onSelect(hits.map((node) => node.id));
      rememberLasso([]);
      state.onStrokeEnd(false);
      return;
    }
    if (!current.moved) {
      const point = screenToCanvas(x, y, view.current.tx, view.current.ty, view.current.scale);
      const hit = hitTest(state.page.nodeIds, state.project.nodes, point.x, point.y);
      if (state.mode === 'play') {
        if (hit) state.onActivate(hit, point.x - hit.frame.x);
        return;
      }
      state.onSelect(hit ? [hit.id] : []);
      return;
    }
    state.onStrokeEnd(current.kind !== 'pan');
  };

  const pinchStart = () => {
    pinchOrigin.current = scale.value;
  };
  const pinch = (factor: number) => {
    const next = clamp(pinchOrigin.current * factor, 0.35, 2.6);
    scale.value = next;
    view.current.scale = next;
  };

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .maxPointers(1)
      .onStart((event) => {
        runOnJS(begin)(event.x, event.y);
      })
      .onUpdate((event) => {
        runOnJS(move)(event.x, event.y, event.translationX, event.translationY);
      })
      .onEnd((event) => {
        runOnJS(end)(event.x, event.y);
      });
    const zoom = Gesture.Pinch()
      .onStart(() => {
        runOnJS(pinchStart)();
      })
      .onUpdate((event) => {
        runOnJS(pinch)(event.scale);
      });
    return Gesture.Simultaneous(pan, zoom);
  }, []);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const scope = scopeFor(project, runtime);
  const skPath = useMemo(() => {
    const path = Skia.Path.Make();
    lasso.forEach((point, index) => {
      if (index === 0) path.moveTo(point.x, point.y);
      else path.lineTo(point.x, point.y);
    });
    return path;
  }, [lasso]);

  const selected = selectedIds.map((id) => project.nodes[id]).filter((node): node is TouchNode => Boolean(node));

  return (
    <View
      style={styles.desk}
      onLayout={(event) => {
        view.current.width = event.nativeEvent.layout.width;
        view.current.height = event.nativeEvent.layout.height;
        center(event.nativeEvent.layout.width, event.nativeEvent.layout.height);
      }}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.flex}>
          <Animated.View style={[{ width: page.width, height: page.height, transformOrigin: 'top left' }, animated]}>
            <View style={[styles.board, { width: page.width, height: page.height, backgroundColor: page.background }]}>
              {page.nodeIds.map((id) => {
                const node = project.nodes[id];
                if (!node) return null;
                return <NodeView key={id} node={node} project={project} scope={scope} runtime={runtime} mode={mode} />;
              })}
              {mode !== 'play'
                ? selected.map((node) => (
                    <View key={`sel-${node.id}`} pointerEvents="none" style={[styles.selection, { left: node.frame.x, top: node.frame.y, width: node.frame.width, height: node.frame.height }]}>
                      {(['nw', 'ne', 'se', 'sw'] as const).map((corner) => (
                        <View key={corner} style={[styles.handle, handleSpot(corner)]} />
                      ))}
                      <View style={styles.rotate} />
                    </View>
                  ))
                : null}
              {guides.x != null ? <View pointerEvents="none" style={[styles.guideX, { left: guides.x }]} /> : null}
              {guides.y != null ? <View pointerEvents="none" style={[styles.guideY, { top: guides.y }]} /> : null}
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      {lasso.length > 1 ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path path={skPath} style="stroke" strokeWidth={3} color="#FF4B3E" strokeCap="round" strokeJoin="round" />
        </Canvas>
      ) : null}
    </View>
  );
}

function handleSpot(corner: 'nw' | 'ne' | 'se' | 'sw') {
  const horizontal = corner.includes('w') ? -7 : undefined;
  const right = corner.includes('e') ? -7 : undefined;
  const top = corner.includes('n') ? -7 : undefined;
  const bottom = corner.includes('s') ? -7 : undefined;
  return { left: horizontal, right, top, bottom };
}

const styles = StyleSheet.create({
  desk: { flex: 1, backgroundColor: '#E7D9C6', overflow: 'hidden' },
  flex: { flex: 1 },
  board: { borderRadius: 28, overflow: 'hidden' },
  selection: { position: 'absolute', borderWidth: 1.5, borderColor: '#FF4B3E', borderRadius: 8 },
  handle: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#FF4B3E' },
  rotate: { position: 'absolute', top: -28, alignSelf: 'center', width: 14, height: 14, borderRadius: 7, backgroundColor: '#1C1714' },
  guideX: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#2F5BFF' },
  guideY: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#2F5BFF' },
});
