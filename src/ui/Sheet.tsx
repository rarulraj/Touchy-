import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  ink: '#1C1714',
  paper: '#F3EBDD',
  desk: '#E7D9C6',
  card: '#FFF9F2',
  line: '#E6D5C3',
  coral: '#FF4B3E',
  muted: '#8A7B6E',
};

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.panel}>
        <View style={styles.grab} />
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(28,23,20,0.28)' },
  panel: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    paddingBottom: 28,
    gap: 12,
    maxHeight: '78%',
  },
  grab: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: colors.line },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Fraunces_700Bold', fontSize: 22, color: colors.ink },
  close: { fontFamily: 'Outfit_600SemiBold', color: colors.coral },
});
