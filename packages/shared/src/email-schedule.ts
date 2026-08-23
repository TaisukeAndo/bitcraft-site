// セミナーごとに複数のメール（申込確認・事前準備案内・前日リマインド等）を
// 設定できるようにするための送信タイミング定義。
//
// - on_submit: 申込直後に即時送信（従来の申込確認メールに相当）
// - relative_to_event: 開催日を基準に「N日前/後のJST HH:MMに送信」
//   （負のoffsetDaysで開催前、正で開催後のフォローアップにも使える）
// - absolute: 特定の日時（UTC ISO文字列）に送信。セミナーの開催日に関係しない
//   一度きりの案内に使う
export type EmailTrigger =
  | { type: "on_submit" }
  | { type: "relative_to_event"; offsetDays: number; timeJst: string } // timeJst: "HH:MM"
  | { type: "absolute"; sendAt: string }; // ISO datetime (UTC)

// JST正規表現("HH:MM"、00:00〜23:59)
const JST_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidJstTime(value: string): boolean {
  return JST_TIME_PATTERN.test(value);
}

/**
 * トリガーが実際に発火すべき絶対時刻を計算する。
 * on_submitは「申込のたびに即時送信」という性質上、固定の時刻を持たないため null を返す
 * （申込受付APIハンドラ側でその場で送信するため、事前計算は不要）。
 *
 * relative_to_event の日付計算は deadline.ts の computeDeadline と同じ考え方
 * （JST正午等ではなくJST日付境界を基準にミリ秒演算する）。日本にサマータイムは
 * 無いため、この単純なミリ秒加算で常に正しいJST時刻に着地する。
 */
export function computeTriggerInstant(trigger: EmailTrigger, eventDateISO: string): Date | null {
  if (trigger.type === "on_submit") {
    return null;
  }
  if (trigger.type === "absolute") {
    return new Date(trigger.sendAt);
  }

  // relative_to_event: event_date(JST 00:00) + offsetDays日 + timeJst
  const eventMidnightJst = new Date(`${eventDateISO}T00:00:00+09:00`);
  const targetMidnightJst = new Date(eventMidnightJst.getTime() + trigger.offsetDays * 24 * 60 * 60 * 1000);
  const [hh, mm] = trigger.timeJst.split(":").map(Number);
  return new Date(targetMidnightJst.getTime() + ((hh ?? 0) * 60 + (mm ?? 0)) * 60 * 1000);
}

export function isTriggerDue(trigger: EmailTrigger, eventDateISO: string, now: Date = new Date()): boolean {
  const instant = computeTriggerInstant(trigger, eventDateISO);
  if (!instant) return false;
  return instant.getTime() <= now.getTime();
}
