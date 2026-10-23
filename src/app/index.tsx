import { DEMO_PROMPTS } from '@/ai/generate';
import { useLibrary } from '@/store/library';
import { colors } from '@/ui/Sheet';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const categories = [
  ['website', 'websites'],
  ['dashboard', 'dashboards'],
  ['presentation', 'decks'],
  ['document', 'documents'],
  ['graphic', 'graphics'],
  ['interactive', 'interactive'],
  ['diagram', 'diagrams'],
  ['moodboard', 'moodboards'],
] as const;

const starters = [
  'Build me a personal finance dashboard.',
  'Create a website for my clothing brand.',
  'Build an interactive biology study guide.',
  'Design a pitch deck for my startup.',
  'Create a habit tracker.',
  'Make a moodboard for my apartment.',
  'Build an interactive travel itinerary.',
  'Create a mind map about artificial intelligence.',
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const order = useLibrary((state) => state.order);
  const projects = useLibrary((state) => state.projects);
  const ready = useLibrary((state) => state.ready);
  const createFromPrompt = useLibrary((state) => state.createFromPrompt);
  const openBlank = useLibrary((state) => state.openBlank);
  const recent = order.map((id) => projects[id]).filter((project) => project != null).slice(0, 8);

  const make = async (value: string) => {
    const text = value.trim();
    if (!text || busy) return;
    setBusy(true);
    setNote('Shaping it.');
    try {
      const project = await createFromPrompt(text);
      router.push({ pathname: '/editor/[id]', params: { id: project.id } });
    } finally {
      setBusy(false);
      setNote('');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }}>
      <View style={styles.top}>
        <View style={styles.markRow}>
          <View style={styles.mark} />
          <Text style={styles.word}>touchie</Text>
        </View>
        <Pressable onPress={() => router.push('/library')}>
          <Text style={styles.link}>Library</Text>
        </Pressable>
      </View>
      <Text style={styles.ask}>What do you want to make?</Text>
      <Text style={styles.dek}>Anything you imagine, at your fingertips. Circle it later and say what should change.</Text>
      <View style={styles.prompt}>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="a budget tracker, a brand site, a study guide"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
        />
        <Pressable style={[styles.send, busy && styles.sendOff]} onPress={() => void make(prompt)}>
          <Text style={styles.sendText}>{busy ? '…' : 'Make'}</Text>
        </Pressable>
      </View>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {starters.map((item) => (
          <Pressable key={item} style={styles.chip} onPress={() => setPrompt(item)}>
            <Text style={styles.chipText}>{item.replace(/\.$/, '')}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.section}>Start from a kind</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {categories.map(([type, label]) => (
          <Pressable key={type} style={styles.cat} onPress={() => setPrompt(`Make a ${label.replace(/s$/, '')} about `)}>
            <Text style={styles.catText}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Recent</Text>
        <Pressable
          onPress={() => {
            const project = openBlank();
            router.push({ pathname: '/editor/[id]', params: { id: project.id } });
          }}
        >
          <Text style={styles.link}>Blank canvas</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {ready && recent.length === 0 ? <Text style={styles.note}>Nothing here yet.</Text> : null}
        {recent.map((project) => (
          <Pressable key={project.id} style={styles.card} onPress={() => router.push({ pathname: '/editor/[id]', params: { id: project.id } })}>
            <Text style={styles.cardKind}>{project.type}</Text>
            <Text style={styles.cardName}>{project.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.section}>Try one</Text>
      {Object.values(DEMO_PROMPTS).map((item) => (
        <Pressable key={item} style={styles.inspire} onPress={() => void make(item)}>
          <Text style={styles.inspireText}>{item}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.coral },
  word: { fontFamily: 'Fraunces_700Bold', fontSize: 28, color: colors.ink },
  link: { fontFamily: 'Outfit_600SemiBold', color: colors.coral, fontSize: 15 },
  ask: { fontFamily: 'Fraunces_700Bold', fontSize: 40, color: colors.ink, paddingHorizontal: 20, marginTop: 22, lineHeight: 44 },
  dek: { fontFamily: 'Outfit_400Regular', color: colors.muted, fontSize: 16, paddingHorizontal: 20, marginTop: 8, lineHeight: 22 },
  prompt: { margin: 20, backgroundColor: colors.card, borderRadius: 24, padding: 14, minHeight: 120, borderWidth: 1, borderColor: colors.line },
  input: { fontFamily: 'Outfit_500Medium', fontSize: 17, color: colors.ink, minHeight: 64 },
  send: { alignSelf: 'flex-end', backgroundColor: colors.ink, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  sendOff: { opacity: 0.5 },
  sendText: { color: colors.card, fontFamily: 'Outfit_700Bold' },
  note: { paddingHorizontal: 22, color: colors.muted, fontFamily: 'Outfit_500Medium' },
  row: { paddingHorizontal: 20, gap: 8 },
  chip: { backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, maxWidth: 240 },
  chipText: { fontFamily: 'Outfit_500Medium', color: colors.ink, fontSize: 13 },
  section: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: colors.muted, marginTop: 22, marginBottom: 10, paddingHorizontal: 20 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 20 },
  cat: { backgroundColor: colors.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12 },
  catText: { color: colors.card, fontFamily: 'Outfit_600SemiBold' },
  card: { width: 180, backgroundColor: colors.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.line },
  cardKind: { fontFamily: 'Outfit_600SemiBold', color: colors.coral, fontSize: 12, textTransform: 'lowercase' },
  cardName: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, color: colors.ink, marginTop: 8 },
  inspire: { marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.card, borderRadius: 16, padding: 14 },
  inspireText: { fontFamily: 'Outfit_500Medium', color: colors.ink, fontSize: 15 },
});
