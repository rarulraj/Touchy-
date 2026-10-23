import { UniversalCanvas } from '@/canvas/UniversalCanvas';
import { createRuntime, runActions } from '@/engine/actions';
import { useLibrary } from '@/store/library';
import { colors } from '@/ui/Sheet';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Runtime, TouchNode } from '@/schema/types';

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const key = String(id ?? '');
  const published = useLibrary((state) => state.published[key]);
  const live = useLibrary((state) => state.projects[key]);
  const project = published?.snapshot ?? live ?? null;
  const [runtime, setRuntime] = useState<Runtime | null>(project ? createRuntime(project) : null);
  const page = project?.pages.find((item) => item.id === runtime?.pageId) ?? project?.pages[0];
  const active = useMemo(() => (runtime && page ? { ...runtime, pageId: page.id } : null), [runtime, page]);

  if (!project || !page || !active) {
    return (
      <View style={styles.empty}>
        <Text style={styles.text}>This link does not have a creation yet.</Text>
      </View>
    );
  }

  const activate = (node: TouchNode, localX: number) => {
    if (node.type === 'nav' && node.items?.length) {
      const index = Math.min(node.items.length - 1, Math.max(0, Math.floor((localX / node.frame.width) * node.items.length)));
      const target = node.items[index];
      if (target) setRuntime(runActions(project, active, [{ type: 'navigate', pageId: target.pageId }]));
      return;
    }
    const interaction = node.interactions?.find((item) => item.event === 'press');
    if (interaction) setRuntime(runActions(project, active, interaction.actions));
  };

  return (
    <View style={styles.screen}>
      <UniversalCanvas
        project={project}
        page={page}
        runtime={active}
        mode="play"
        selectedIds={[]}
        onSelect={() => undefined}
        onLiveFrames={() => undefined}
        onStrokeEnd={() => undefined}
        onActivate={activate}
      />
      <View style={styles.caption}>
        <Text style={styles.captionText}>{project.name} · made with touchie</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.desk },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  text: { fontFamily: 'Outfit_500Medium', color: colors.ink },
  caption: { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  captionText: { fontFamily: 'Outfit_500Medium', color: colors.muted },
});
