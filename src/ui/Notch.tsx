import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const faces = {
  idle: '^ ω ^',
  listen: '{ ^-^ }',
  work: '(¬_¬)',
  done: '^ ω ^',
} as const;

export type NotchFace = keyof typeof faces;

export function Notch({
  detail,
  face = 'idle',
  open,
  seen,
  line,
  value,
  placeholder,
  busy,
  onPress,
  onClose,
  onChangeText,
  onSend,
}: {
  detail?: string;
  face?: NotchFace;
  open?: boolean;
  seen?: string;
  line?: string;
  value?: string;
  placeholder?: string;
  busy?: boolean;
  onPress?: () => void;
  onClose?: () => void;
  onChangeText?: (value: string) => void;
  onSend?: () => void;
}) {
  const body = (
    <>
      <View style={styles.row}>
        <Text style={styles.face}>{faces[face]}</Text>
        <Text style={styles.word}>touchy</Text>
        {!open && detail ? (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {open ? (
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeHit}>
            <Text style={styles.close}>close</Text>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <View style={styles.body}>
          <Text style={styles.seen}>sees {seen || 'this screen'}</Text>
          {line ? <Text style={styles.line}>{line}</Text> : null}
          <View style={styles.talk}>
            <TextInput
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder || 'tell touchy'}
              placeholderTextColor="#8A7B6E"
              style={styles.input}
              autoFocus
              editable={!busy}
              onSubmitEditing={onSend}
            />
            <Pressable style={[styles.go, busy && styles.goOff]} onPress={onSend} disabled={busy}>
              <Text style={styles.goText}>{busy ? '…' : 'go'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.wrap, open && styles.wrapOpen]} pointerEvents="box-none">
      {open ? (
        <View style={[styles.island, styles.islandOpen]}>{body}</View>
      ) : (
        <Pressable onPress={onPress} style={styles.island} disabled={!onPress}>
          {body}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', maxWidth: '100%' },
  wrapOpen: { width: '100%' },
  island: {
    flexDirection: 'column',
    alignSelf: 'center',
    maxWidth: 250,
    minHeight: 36,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 7,
    backgroundColor: '#0E0C0B',
    borderRadius: 22,
  },
  islandOpen: { maxWidth: 420, width: '100%', borderRadius: 28, paddingBottom: 12, paddingTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  face: { color: '#FFF9F2', fontSize: 13, fontFamily: 'Outfit_700Bold' },
  word: { fontFamily: 'Outfit_700Bold', color: '#FFF9F2', fontSize: 14, letterSpacing: 0.3 },
  detail: { flexShrink: 1, fontFamily: 'Outfit_500Medium', color: '#E7D9C6', fontSize: 13 },
  closeHit: { marginLeft: 'auto' },
  close: { fontFamily: 'Outfit_600SemiBold', color: '#FF4B3E', fontSize: 13 },
  body: { marginTop: 10, gap: 8 },
  seen: { fontFamily: 'Outfit_600SemiBold', color: '#FF4B3E', fontSize: 12, letterSpacing: 0.4 },
  line: { fontFamily: 'Outfit_500Medium', color: '#FFF9F2', fontSize: 15, lineHeight: 20 },
  talk: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1C1714',
    color: '#FFF9F2',
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
  },
  go: { backgroundColor: '#FF4B3E', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  goOff: { opacity: 0.5 },
  goText: { color: '#FFF9F2', fontFamily: 'Outfit_700Bold' },
});
