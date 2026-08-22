// R2オブジェクトキー → /media/<key> の同一オリジンURLへ変換する。
// 同一オリジンにすることでOGPクローラー等との互換性を高める（実装計画3章）。
export function mediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `/media/${key}`;
}
