/**
 * セミナーの募集期限判定ロジック。
 *
 * 募集期限は「開催日(event_date)当日 JST 00:00:00 の 1ms 前」、
 * すなわち「開催日前日 23:59:59.999 JST」。
 *
 * 旧 service/seminar/<slug>/deadline.js のクライアントサイド実装（event-date meta
 * タグを読み、開催日前日23:59:59を締切として算出しCTA/申込フォームをロックする）
 * を、apps/web でのサーバーサイドレンダリング時に使えるよう移植したもの。
 *
 * 「募集期限のみが申込ページのロック条件であり、他の複合条件を導入しない」
 * というリポジトリの既存の意思決定（apply-locked廃止）を踏襲する。
 */

export function computeDeadline(eventDateISO: string): Date {
  // event_date 当日 JST 00:00:00 の瞬間から 1ms 引くことで、
  // 「前日 23:59:59.999 JST」を一段階の計算で正しく求める。
  // (「JST 00:00 から 24h 引いてから UTC hours を setする」ような2段階の実装は、
  //  UTC日付境界の扱いを誤ってちょうど1日早く締め切ってしまうオフバイワンを起こしやすいので避けること)
  const eventMidnightJST = new Date(`${eventDateISO}T00:00:00+09:00`);
  return new Date(eventMidnightJST.getTime() - 1);
}

export function isRegistrationClosed(eventDateISO: string, now: Date = new Date()): boolean {
  return now.getTime() > computeDeadline(eventDateISO).getTime();
}

/**
 * 「開催予定/過去開催」振り分け用の判定。event_date(JST calendar date)が
 * 今日(JST)より過去かどうかを文字列比較で判定する（ISO 'YYYY-MM-DD'は
 * 辞書順比較がそのまま日付順比較になるため）。
 *
 * apps/webのレンダリング時に都度計算する派生値であり、DBには保存しない
 * （実装計画 2章）。
 */
export function isPastEvent(eventDateISO: string, now: Date = new Date()): boolean {
  const todayJstIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(now);
  return eventDateISO < todayJstIso;
}
