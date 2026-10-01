import { Platform } from 'react-native';
import { buildExport } from './exportData';
import { writeXlsx } from './xlsx';
import { exportFileName, toBase64, XLSX_MIME } from './exportFile';
import { Profile, Round } from '../types';

/**
 * Statistik als Excel-Datei ausgeben: im Browser als Download, am Handy über das Teilen-Menü
 * (Dateien, Mail, Drive …). Gibt den Dateinamen zurück.
 */
export async function exportStatsXlsx(rounds: Round[], profile: Profile): Promise<string> {
  const name = exportFileName();
  const bytes = writeXlsx(buildExport(rounds, profile));
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: XLSX_MIME }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return name;
  }
  // Nur auf dem Handy nötig; auf dem Web nicht geladen
  const FileSystem = require('expo-file-system') as typeof import('expo-file-system');
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, toBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Teilen ist auf diesem Gerät nicht verfügbar.');
  await Sharing.shareAsync(uri, { mimeType: XLSX_MIME, dialogTitle: 'Statistik exportieren', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
  return name;
}
