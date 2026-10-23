import { useLibrary } from '@/store/library';
import { Notch } from '@/ui/Notch';
import { Sheet, colors } from '@/ui/Sheet';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const order = useLibrary((state) => state.order);
  const projects = useLibrary((state) => state.projects);
  const versions = useLibrary((state) => state.versions);
  const rename = useLibrary((state) => state.rename);
  const duplicate = useLibrary((state) => state.duplicate);
  const remove = useLibrary((state) => state.remove);
  const publish = useLibrary((state) => state.publish);
  const restore = useLibrary((state) => state.restore);
  const [menu, setMenu] = useState<string | null>(null);
  const [name, setName] = useState('');
  const current = menu ? projects[menu] : undefined;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.top}>
        <Pressable style={styles.side} onPress={() => router.back()}>
          <Text style={styles.link}>Home</Text>
        </Pressable>
        <Notch detail="library" />
        <View style={styles.side} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
        {order.map((id) => {
          const project = projects[id];
          if (!project) return null;
          return (
            <Pressable key={id} style={styles.card} onPress={() => router.push({ pathname: '/editor/[id]', params: { id } })} onLongPress={() => { setMenu(id); setName(project.name); }}>
              <Text style={styles.kind}>{project.type}</Text>
              <Text style={styles.name}>{project.name}</Text>
              <Text style={styles.meta}>{project.pages.length} pages · v{project.version}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.footer}>Projects stay on this device. Add Supabase keys to sync, and an OpenAI key on the server when you want the model instead of the Touchy engine.</Text>
      {current ? (
        <Sheet title={current.name} onClose={() => setMenu(null)}>
          <TextInput value={name} onChangeText={setName} style={styles.input} />
          <Pressable style={styles.button} onPress={() => { rename(current.id, name); setMenu(null); }}>
            <Text style={styles.buttonText}>Rename</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => { const copy = duplicate(current.id); if (copy) router.push({ pathname: '/editor/[id]', params: { id: copy.id } }); }}>
            <Text style={styles.buttonText}>Duplicate</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => { const shared = publish(current.id); if (shared) router.push({ pathname: '/share/[id]', params: { id: shared.slug } }); }}>
            <Text style={styles.buttonText}>Share snapshot</Text>
          </Pressable>
          {(versions[current.id] ?? []).slice(0, 5).map((version) => (
            <Pressable key={version.id} onPress={() => { restore(current.id, version.id); setMenu(null); }}>
              <Text style={styles.version}>{version.label}</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => { remove(current.id); setMenu(null); }}>
            <Text style={styles.delete}>Delete</Text>
          </Pressable>
        </Sheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 64 },
  link: { fontFamily: 'Outfit_600SemiBold', color: colors.coral },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line },
  kind: { fontFamily: 'Outfit_600SemiBold', color: colors.coral, fontSize: 12 },
  name: { fontFamily: 'Fraunces_600SemiBold', fontSize: 24, color: colors.ink, marginTop: 4 },
  meta: { fontFamily: 'Outfit_400Regular', color: colors.muted, marginTop: 4 },
  footer: { padding: 16, fontFamily: 'Outfit_400Regular', color: colors.muted, fontSize: 13 },
  input: { backgroundColor: colors.paper, borderRadius: 12, padding: 12, fontFamily: 'Outfit_500Medium' },
  button: { paddingVertical: 8 },
  buttonText: { fontFamily: 'Outfit_600SemiBold', color: colors.ink, fontSize: 16 },
  version: { fontFamily: 'Outfit_400Regular', color: colors.muted, paddingVertical: 4 },
  delete: { fontFamily: 'Outfit_700Bold', color: colors.coral, marginTop: 8 },
});
