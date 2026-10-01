// Reine Hilfsfunktionen für den Export (ohne React Native, damit sie in Tests laufen)

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const exportFileName = (now = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `Golfmanager-Statistik-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.xlsx`;
};

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** Base64 ohne btoa (auf allen Plattformen gleich). */
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}
