// email_templates.cc/bcc・contact_email_templates.cc/bccの符号化/復号。
// どちらのテーブルもTEXT列にstring[]をJSON文字列として保存する形が共通のため、
// routes/emails.ts・routes/contact-emails.tsの両方から使う共通コンポーネントに
// している。
export function encodeRecipients(list: string[] | undefined): string | null {
  if (list === undefined || list.length === 0) return null;
  return JSON.stringify(list);
}

export function decodeRecipients(json: string | null): string[] | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}
