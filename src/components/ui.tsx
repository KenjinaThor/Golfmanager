import React, { useEffect, useState } from 'react';
import { Visibility } from '../types';
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

const TAGS: Record<Visibility, { text: string; bg: string; fg: string }> = {
  private: { text: 'Nur für mich', bg: '#eceff1', fg: '#37474f' },
  friends: { text: 'Für Freunde', bg: '#e3edff', fg: '#1c46b8' },
  public: { text: 'Öffentlich', bg: '#fff1d6', fg: '#8a4b00' },
};

/** Kennzeichnet, wer ein Datenfeld sehen kann. */
export const Tag = ({ kind }: { kind: Visibility }) => (
  <View style={{ backgroundColor: TAGS[kind].bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
    <Text style={{ color: TAGS[kind].fg, fontSize: 11, fontWeight: '700' }}>{TAGS[kind].text}</Text>
  </View>
);

/** Auswahl «Nur für mich / Für Freunde / Öffentlich»; `locked` zeigt nur den festen Wert (z. B. Benutzername). */
export function VisibilityPicker({ value, onChange, locked, allowed = ['private', 'friends', 'public'] }: {
  value: Visibility; onChange?: (v: Visibility) => void; locked?: boolean; allowed?: Visibility[];
}) {
  if (locked) return <Tag kind={value} />;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }} accessibilityRole="radiogroup">
      <Text style={{ fontSize: 11, color: colors.mute }}>Sichtbar:</Text>
      {allowed.map((v) => {
        const on = v === value;
        return (
          <Pressable key={v} onPress={() => onChange?.(v)} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={{ paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, borderColor: on ? TAGS[v].fg : colors.line, backgroundColor: on ? TAGS[v].bg : '#fff' }}>
            <Text style={{ fontSize: 11, fontWeight: on ? '700' : '500', color: on ? TAGS[v].fg : colors.mute }}>{TAGS[v].text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const Field = ({ label, inputRef, footer, ...p }: { label: string; inputRef?: React.Ref<TextInput>; footer?: React.ReactNode } & TextInputProps) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={[s.label, { marginBottom: 4 }]}>{label}</Text>
    <TextInput {...p} ref={inputRef} style={s.input} placeholderTextColor="#9ca3af" />
    {footer ? <View style={{ marginTop: 6 }}>{footer}</View> : null}
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
