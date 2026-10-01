import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { holeImages } from '../data/holeImages';
import { colors } from './ui';

/** Verhältnis Breite/Höhe der zugeschnittenen Lochseiten (≈ 439×720 px); Übersicht und Legende weichen leicht ab. */
const ASPECT: Record<string, number> = { legende: 416 / 302 };

/** Bild eines Lochs; Tippen öffnet die Vollansicht mit Vergrösserung. */
export function HoleImage({ imageKey, fullWidth = true }: { imageKey?: string; fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const src = imageKey ? holeImages[imageKey] : undefined;
  if (!src) return null;
  const aspect = ASPECT[imageKey!] ?? 0.61;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityLabel="Lochlayout vergrössern">
        <Image source={src} resizeMode="contain" style={[{ width: '100%', aspectRatio: aspect, maxWidth: fullWidth ? undefined : 260 }, st.img]} />
        <Text style={st.hint}>Tippen zum Vergrössern</Text>
      </Pressable>
      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={st.modal}>
          <View style={st.bar}>
            <Pressable onPress={() => setZoom((z) => !z)} style={st.barBtn}><Text style={st.barTxt}>{zoom ? 'Verkleinern' : 'Vergrössern'}</Text></Pressable>
            <Pressable onPress={() => { setOpen(false); setZoom(false); }} style={st.barBtn}><Text style={st.barTxt}>Schliessen</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ alignItems: 'center' }} maximumZoomScale={3} minimumZoomScale={1}>
            <ScrollView horizontal contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
              <Image source={src} resizeMode="contain" style={{ width: zoom ? 900 : 380, aspectRatio: aspect, maxWidth: zoom ? undefined : '100%' }} />
            </ScrollView>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/** Aufklappbares Lochlayout (z. B. in der Runde); bleibt beim Blättern zum nächsten Loch aufgeklappt. */
export function HoleLayoutToggle({ imageKey, defaultOpen = false }: { imageKey?: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!imageKey || !holeImages[imageKey]) return null;
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} style={st.toggle}>
        <Text style={st.toggleTxt}>{open ? 'Lochlayout ausblenden' : 'Lochlayout anzeigen'}</Text>
      </Pressable>
      {open && <HoleImage imageKey={imageKey} />}
    </View>
  );
}

const st = StyleSheet.create({
  img: { borderRadius: 8, backgroundColor: '#eef2ee', marginTop: 6 },
  hint: { color: colors.mute, fontSize: 11, textAlign: 'center', marginTop: 2 },
  toggle: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.light, marginTop: 8 },
  toggleTxt: { color: colors.green, fontWeight: '600', fontSize: 13 },
  modal: { flex: 1, backgroundColor: '#101614' },
  bar: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, paddingTop: 20 },
  barBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)' },
  barTxt: { color: '#fff', fontWeight: '600' },
});
