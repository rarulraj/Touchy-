import { answerFor } from '@/ai/answer';
import { UniversalCanvas, type CanvasMode } from '@/canvas/UniversalCanvas';
import { alignNodes } from '@/canvas/geometry';
import { createRuntime, runActions } from '@/engine/actions';
import { say } from '@/island/presence';
import { endStroke, useLibrary } from '@/store/library';
import { Notch } from '@/ui/Notch';
import { Sheet, colors } from '@/ui/Sheet';
import { useVoice } from '@/voice/store';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Project, TouchNode } from '@/schema/types';

export default function EditorScreen() {
  const { id, talk } = useLocalSearchParams<{ id: string; talk?: string }>();
  const projectId = String(id ?? '');
  const project = useLibrary((state) => state.projects[projectId]);
  const past = useLibrary((state) => state.past[projectId]?.length ?? 0);
  const future = useLibrary((state) => state.future[projectId]?.length ?? 0);
  const live = useLibrary((state) => state.live);
  const commit = useLibrary((state) => state.commit);
  const undo = useLibrary((state) => state.undo);
  const redo = useLibrary((state) => state.redo);
  const editWithAI = useLibrary((state) => state.editWithAI);
  const publish = useLibrary((state) => state.publish);
  const adoptVariant = useLibrary((state) => state.adoptVariant);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<CanvasMode>(talk === '1' ? 'circle' : project?.type === 'moodboard' || project?.type === 'diagram' || project?.type === 'graphic' ? 'edit' : 'play');
  const [pageId, setPageId] = useState(project?.pages[0]?.id ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [runtime, setRuntime] = useState(() => (project ? createRuntime(project) : null));
  const [ask, setAsk] = useState('');
  const [answer, setAnswer] = useState('');
  const [notchOpen, setNotchOpen] = useState(true);
  const [circling, setCircling] = useState(true);
  const [working, setWorking] = useState(false);
  const [sheet, setSheet] = useState<'input' | 'variants' | null>(null);
  const [variants, setVariants] = useState<Project[]>([]);
  const [inputId, setInputId] = useState<string | null>(null);
  const listening = useVoice((state) => state.listening);
  const toggle = useVoice((state) => state.toggle);
  const spoken = useRef('');
  const runAskRef = useRef<(text: string) => void>(() => undefined);

  useFocusEffect(
    useCallback(() => {
      useVoice.getState().setOnFinal((text) => runAskRef.current(text));
      return () => useVoice.getState().setOnFinal(null);
    }, []),
  );

  useEffect(() => {
    if (project && !runtime) {
      const next = createRuntime(project);
      setRuntime(next);
      setPageId(next.pageId);
    }
  }, [project, runtime]);

  useEffect(() => {
    if (!answer || answer === spoken.current) return;
    spoken.current = answer;
    say(answer);
  }, [answer]);

  useEffect(() => {
    if (!runtime?.link) return;
    void Linking.openURL(runtime.link);
    setRuntime({ ...runtime, link: null });
  }, [runtime]);

  const page = project?.pages.find((item) => item.id === (runtime?.pageId || pageId)) ?? project?.pages[0];
  const activeRuntime = useMemo(() => (runtime && page ? { ...runtime, pageId: page.id } : runtime), [runtime, page]);

  if (!project || !page || !activeRuntime) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>That creation is not on this device.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const runAsk = async (instruction: string) => {
    const text = instruction.trim();
    if (!text) return;
    setAsk('');
    setNotchOpen(true);
    if (isQuestion(text) || !isEdit(text)) {
      setAnswer(answerFor(project, activeRuntime, selected, text));
      setCircling(true);
      return;
    }
    setWorking(true);
    try {
      const result = await editWithAI(project.id, text, selected);
      setAnswer(result.summary);
      if (result.variants.length) {
        setVariants(result.variants);
        setSheet('variants');
      }
    } finally {
      setWorking(false);
    }
  };
  runAskRef.current = (text) => {
    void runAsk(text);
  };

  const inputNode = inputId ? project.nodes[inputId] : undefined;

  return (
    <View style={styles.screen}>
      <UniversalCanvas
        project={project}
        page={page}
        runtime={activeRuntime}
        mode={circling ? 'circle' : mode}
        selectedIds={selected}
        onSelect={(ids) => {
          setSelected(ids);
          if (!circling) return;
          setNotchOpen(true);
          setAnswer(ids.length ? answerFor(project, activeRuntime, ids) : 'Nothing in that circle. Draw around a piece.');
        }}
        onLiveFrames={(frames) => {
          live(project.id, (current) => {
            const nodes = { ...current.nodes };
            for (const [nodeId, frame] of Object.entries(frames)) {
              const node = nodes[nodeId];
              if (node) nodes[nodeId] = { ...node, frame };
            }
            return { ...current, nodes };
          });
        }}
        onStrokeEnd={(moved) => {
          if (moved) endStroke(project.id);
        }}
        onActivate={(node, localX) => {
          if (node.type === 'nav' && node.items?.length) {
            const index = Math.min(node.items.length - 1, Math.max(0, Math.floor((localX / node.frame.width) * node.items.length)));
            const target = node.items[index];
            if (target) setRuntime(runActions(project, activeRuntime, [{ type: 'navigate', pageId: target.pageId }]));
            return;
          }
          if (node.type === 'input') {
            setInputId(node.id);
            setSheet('input');
            return;
          }
          const interaction = node.interactions?.find((item) => item.event === 'press');
          if (!interaction) return;
          const next = runActions(project, activeRuntime, interaction.actions);
          setRuntime(next);
          if (next.message) setAnswer(next.message);
        }}
      />
      <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable style={styles.pill} onPress={() => router.back()}>
          <Text style={styles.pillText}>Home</Text>
        </Pressable>
        <View style={styles.notchSlot} />
        <Pressable style={styles.pill} onPress={() => undo(project.id)} disabled={!past}>
          <Text style={styles.pillText}>Undo</Text>
        </Pressable>
        <Pressable style={styles.pill} onPress={() => redo(project.id)} disabled={!future}>
          <Text style={styles.pillText}>Redo</Text>
        </Pressable>
      </View>
      <View style={[styles.islandFloat, { top: insets.top + 4 }]} pointerEvents="box-none">
        <Notch
          open={notchOpen || working}
          face={working ? 'work' : listening ? 'listen' : answer ? 'done' : 'idle'}
          seen={selected.length ? `${selected.length} circled on ${project.name}` : `all of ${project.name}`}
          line={working ? 'Reading what you circled.' : listening ? 'Listening.' : answer || 'Circle anything on the screen. I will say the next tap, and I stay in the real notch if you leave.'}
          detail={project.name}
          value={ask}
          busy={working}
          listening={listening}
          placeholder="ask about the circle, or tap listen"
          onChangeText={setAsk}
          onPress={() => {
            setNotchOpen(true);
            setCircling(true);
            void toggle();
          }}
          onListen={() => void toggle()}
          onSend={() => void runAsk(ask)}
        />
      </View>
      <ScrollView horizontal style={[styles.pages, { top: insets.top + (notchOpen ? 188 : 52) }]} contentContainerStyle={styles.pageRow} showsHorizontalScrollIndicator={false}>
        {project.pages.map((item) => (
          <Pressable key={item.id} style={[styles.pageChip, item.id === page.id && styles.pageOn]} onPress={() => setRuntime({ ...activeRuntime, pageId: item.id })}>
            <Text style={[styles.pageText, item.id === page.id && styles.pageTextOn]}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {answer && !notchOpen ? (
        <Pressable style={[styles.toast, { top: insets.top + 96 }]} onPress={() => setAnswer('')}>
          <Text style={styles.toastText}>{answer}</Text>
        </Pressable>
      ) : null}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 10 }]}>
        {selected.length > 0 && mode !== 'play' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
            <Tool label="Ask" onPress={() => { setNotchOpen(true); setCircling(true); setAnswer(answerFor(project, activeRuntime, selected)); }} />
            <Tool label="Duplicate" onPress={() => commit(project.id, (current) => duplicateSelected(current, page.id, selected), 'Duplicated')} />
            <Tool
              label="Align"
              onPress={() => {
                const nodes = selected.map((nodeId) => project.nodes[nodeId]).filter((node): node is TouchNode => Boolean(node));
                const moves = alignNodes(nodes, 'left');
                commit(project.id, (current) => moveAll(current, moves), 'Aligned');
              }}
            />
            <Tool label="Front" onPress={() => commit(project.id, (current) => reorder(current, selected, 'front'), 'Layer')} />
            <Tool label="Delete" onPress={() => { commit(project.id, (current) => removeNodes(current, selected), 'Deleted'); setSelected([]); }} />
          </ScrollView>
        ) : null}
        <View style={styles.modes}>
          {(['play', 'edit', 'circle'] as const).map((item) => (
            <Pressable
              key={item}
              style={[styles.mode, (item === 'circle' ? circling : mode === item && !circling) && styles.modeOn]}
              onPress={() => {
                if (item === 'circle') {
                  setCircling(true);
                  setNotchOpen(true);
                  return;
                }
                setCircling(false);
                setMode(item);
              }}
            >
              <Text style={[styles.modeText, (item === 'circle' ? circling : mode === item && !circling) && styles.modeTextOn]}>{item === 'edit' ? 'touch' : item}</Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.mode}
            onPress={() => {
              const shared = publish(project.id);
              if (!shared) return;
              void Share.share({ message: `${shared.name} ${process.env.EXPO_PUBLIC_SHARE_BASE_URL ?? ''}/share/${shared.slug}` });
              router.push({ pathname: '/share/[id]', params: { id: shared.slug } });
            }}
          >
            <Text style={styles.modeText}>Share</Text>
          </Pressable>
        </View>
      </View>
      {sheet === 'input' && inputNode?.bind ? (
        <Sheet title={inputNode.placeholder || 'Edit'} onClose={() => setSheet(null)}>
          <TextInput
            value={String(activeRuntime.state[inputNode.bind] ?? '')}
            onChangeText={(value) => setRuntime({ ...activeRuntime, state: { ...activeRuntime.state, [inputNode.bind!]: value } })}
            style={styles.sheetInput}
            autoFocus
          />
        </Sheet>
      ) : null}
      {sheet === 'variants' ? (
        <Sheet title="Three directions" onClose={() => setSheet(null)}>
          {variants.map((variant) => (
            <Pressable key={variant.id} style={styles.variant} onPress={() => { adoptVariant(project.id, variant); setSheet(null); }}>
              <Text style={styles.variantName}>{variant.name}</Text>
            </Pressable>
          ))}
        </Sheet>
      ) : null}
    </View>
  );
}

function Tool({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.tool} onPress={onPress}>
      <Text style={styles.toolText}>{label}</Text>
    </Pressable>
  );
}

function isQuestion(text: string): boolean {
  return /\?$/.test(text.trim()) || /^(what|why|how|who|when|which|explain|tell me)\b/i.test(text.trim());
}

function isEdit(text: string): boolean {
  return /\b(make|add|change|delete|remove|color|bigger|smaller|quieter|move|resize|chart|page|rename|duplicate)\b/i.test(text);
}

function duplicateSelected(project: Project, pageId: string, ids: string[]): Project {
  const page = project.pages.find((item) => item.id === pageId);
  if (!page) return project;
  const nodes = { ...project.nodes };
  const nodeIds = [...page.nodeIds];
  ids.forEach((id, index) => {
    const node = nodes[id];
    if (!node) return;
    const copyId = `${id}_copy_${index}`;
    nodes[copyId] = { ...node, id: copyId, name: `${node.name} copy`, frame: { ...node.frame, x: node.frame.x + 18, y: node.frame.y + 18 } };
    nodeIds.push(copyId);
  });
  return { ...project, nodes, pages: project.pages.map((item) => (item.id === pageId ? { ...item, nodeIds } : item)) };
}

function moveAll(project: Project, moves: Record<string, { x: number; y: number }>): Project {
  const nodes = { ...project.nodes };
  for (const [id, move] of Object.entries(moves)) {
    const node = nodes[id];
    if (node) nodes[id] = { ...node, frame: { ...node.frame, ...move } };
  }
  return { ...project, nodes };
}

function reorder(project: Project, ids: string[], direction: 'front' | 'back'): Project {
  return {
    ...project,
    pages: project.pages.map((page) => {
      const keep = page.nodeIds.filter((id) => !ids.includes(id));
      const moving = page.nodeIds.filter((id) => ids.includes(id));
      return { ...page, nodeIds: direction === 'front' ? [...keep, ...moving] : [...moving, ...keep] };
    }),
  };
}

function removeNodes(project: Project, ids: string[]): Project {
  const nodes = { ...project.nodes };
  ids.forEach((id) => {
    if (!nodes[id]?.locked) delete nodes[id];
  });
  return {
    ...project,
    nodes,
    pages: project.pages.map((page) => ({ ...page, nodeIds: page.nodeIds.filter((id) => nodes[id]) })),
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.paper },
  emptyText: { fontFamily: 'Outfit_500Medium', color: colors.ink },
  link: { color: colors.coral, fontFamily: 'Outfit_700Bold' },
  top: { position: 'absolute', left: 10, right: 10, flexDirection: 'row', gap: 6, alignItems: 'center' },
  pill: { backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8 },
  pillText: { fontFamily: 'Outfit_600SemiBold', color: colors.ink, fontSize: 12 },
  notchSlot: { flex: 1, alignItems: 'center' },
  islandFloat: { position: 'absolute', left: 16, right: 16, zIndex: 30, alignItems: 'center' },
  pages: { position: 'absolute', left: 0, right: 0, maxHeight: 36 },
  pageRow: { paddingHorizontal: 12, gap: 6 },
  pageChip: { backgroundColor: 'rgba(255,249,242,0.9)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  pageOn: { backgroundColor: colors.ink },
  pageText: { fontFamily: 'Outfit_600SemiBold', color: colors.ink, fontSize: 12 },
  pageTextOn: { color: colors.card },
  toast: { position: 'absolute', left: 16, right: 16, backgroundColor: colors.ink, borderRadius: 14, padding: 10 },
  toastText: { color: colors.card, fontFamily: 'Outfit_500Medium' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 8 },
  tools: { paddingHorizontal: 12, gap: 6 },
  tool: { backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  toolText: { fontFamily: 'Outfit_600SemiBold', color: colors.ink, fontSize: 13 },
  askRow: { marginHorizontal: 12, backgroundColor: colors.card, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 6, minHeight: 52 },
  askInput: { flex: 1, fontFamily: 'Outfit_500Medium', color: colors.ink, fontSize: 15, paddingVertical: 10 },
  askSend: { backgroundColor: colors.coral, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  askSendText: { color: '#fff', fontFamily: 'Outfit_700Bold' },
  modes: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  mode: { backgroundColor: 'rgba(255,249,242,0.92)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  modeOn: { backgroundColor: colors.ink },
  modeText: { fontFamily: 'Outfit_600SemiBold', color: colors.ink, fontSize: 13 },
  modeTextOn: { color: colors.card },
  help: { fontFamily: 'Outfit_400Regular', color: colors.muted },
  sheetInput: { backgroundColor: colors.paper, borderRadius: 14, padding: 12, fontFamily: 'Outfit_500Medium', color: colors.ink },
  primary: { backgroundColor: colors.ink, borderRadius: 16, padding: 14, alignItems: 'center' },
  primaryText: { color: colors.card, fontFamily: 'Outfit_700Bold' },
  variant: { backgroundColor: colors.paper, borderRadius: 14, padding: 12 },
  variantName: { fontFamily: 'Outfit_600SemiBold', color: colors.ink },
});
