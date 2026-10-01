import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';

export const colors = { green: '#1f7a3a', light: '#e8f3ec', text: '#14213d', mute: '#6b7280', line: '#e5e7eb', bad: '#b42318', bg: '#f7f8f7' };

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[s.card, style]}>{children}</View>
);

export const H = ({ children }: { children: React.ReactNode }) => <Text style={s.h}>{children}</Text>;

export const Btn = ({ title, onPress, kind = 'primary', disabled }: { title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; disabled?: boolean }) => (
  <Pressable onPress={onPress} disabled={disabled} style={[s.btn, kind === 'ghost' && s.ghost, kind === 'danger' && s.danger, disabled && { opacity: 0.4 }]}>
    <Text style={[s.btnT, kind === 'ghost' && { color: colors.green }]}>{title}</Text>
  </Pressable>
);

export type Visibility = 'public' | 'friends';
const TAGS: Record<Visibility, { text: string; bg: string; fg: string }> = {
  public: { text: 'öffentlich', bg: '#fff1d6', fg: '#8a4b00' },
  friends: { text: 'Freunde', bg: '#e3edff', fg: '#1c46b8' },
};

/** Kennzeichnet, wer ein Datenfeld nach der Übertragung sehen kann. */
export const Tag = ({ kind }: { kind: Visibility }) => (
  <View style={{ backgroundColor: TAGS[kind].bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
    <Text style={{ color: TAGS[kind].fg, fontSize: 11, fontWeight: '700' }}>{TAGS[kind].text}</Text>
  </View>
);

export const Field = ({ label, inputRef, visible, ...p }: { label: string; inputRef?: React.Ref<TextInput>; visible?: Visibility } & TextInputProps) => (
  <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
      <Text style={[s.label, { flex: 1, marginBottom: 0 }]}>{label}</Text>
      {visible && <Tag kind={visible} />}
    </View>
    <TextInput {...p} ref={inputRef} style={s.input} placeholderTextColor="#9ca3af" />
  </View>
);

export const Row = ({ children, style }: { children: React.ReactNode; style?: ViewStyle }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>
);

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('de-CH');

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  h: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  btn: { backgroundColor: colors.green, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', marginVertical: 4 },
  ghost: { backgroundColor: colors.light },
  danger: { backgroundColor: colors.bad },
  btnT: { color: '#fff', fontWeight: '600', fontSize: 15 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24, zIndex: 100 },
  dialog: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  label: { fontSize: 12, color: colors.mute, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff', color: colors.text },
});

type Pending = { title: string; message: string; okLabel: string; onOk: () => void; destructive: boolean } | null;
let showPending: ((p: Pending) => void) | null = null;

/** Im Web gerendert (einmal in App), weil window.confirm/Alert dort nicht überall verfügbar sind. */
export function ConfirmHost() {
  const [p, setP] = useState<Pending>(null);
  useEffect(() => {
    showPending = setP;
    return () => { showPending = null; };
  }, []);
  if (!p) return null;
  const close = () => setP(null);
  return (
    <View style={s.overlay}>
      <View style={s.dialog}>
        <Text style={s.h}>{p.title}</Text>
        <Text style={{ color: colors.text, marginBottom: 8 }}>{p.message}</Text>
        <Btn title={p.okLabel} kind={p.destructive ? 'danger' : 'primary'} onPress={() => { close(); p.onOk(); }} />
        <Btn title="Abbrechen" kind="ghost" onPress={close} />
      </View>
    </View>
  );
}

/** Bestätigungsdialog: nativ Alert.alert, im Web eine In-App-Bestätigung. */
export function confirmDialog(title: string, message: string, okLabel: string, onOk: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    if (showPending) showPending({ title, message, okLabel, onOk, destructive });
    else onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

/** Einfache Meldung: nativ Alert.alert, im Web window.alert. */
export function notify(title: string, message = '') {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}
