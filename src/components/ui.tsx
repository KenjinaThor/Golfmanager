import React from 'react';
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

export const Field = ({ label, ...p }: { label: string } & TextInputProps) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={s.label}>{label}</Text>
    <TextInput {...p} style={s.input} placeholderTextColor="#9ca3af" />
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
  label: { fontSize: 12, color: colors.mute, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, fontSize: 16, backgroundColor: '#fff', color: colors.text },
});

/** Bestätigungsdialog; Alert.alert mit Buttons funktioniert im Web nicht, dort window.confirm. */
export function confirmDialog(title: string, message: string, okLabel: string, onOk: () => void, destructive = false) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}
