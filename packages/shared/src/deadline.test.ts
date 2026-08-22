import { describe, expect, it } from "vitest";
import { computeDeadline, isPastEvent, isRegistrationClosed } from "./deadline";

describe("computeDeadline", () => {
  it("開催日前日 23:59:59.999 JST を返す", () => {
    const deadline = computeDeadline("2026-06-14");
    // 2026-06-13T23:59:59.999+09:00 と等しい
    expect(deadline.toISOString()).toBe("2026-06-13T14:59:59.999Z");
  });
});

describe("isRegistrationClosed", () => {
  const eventDate = "2026-06-14";

  it("締切1秒前はまだ受付中", () => {
    const now = new Date("2026-06-13T14:59:59.000Z");
    expect(isRegistrationClosed(eventDate, now)).toBe(false);
  });

  it("締切ちょうど(境界値)はまだ受付中", () => {
    const now = new Date("2026-06-13T14:59:59.999Z");
    expect(isRegistrationClosed(eventDate, now)).toBe(false);
  });

  it("締切1ms後は受付終了", () => {
    const now = new Date("2026-06-13T15:00:00.000Z");
    expect(isRegistrationClosed(eventDate, now)).toBe(true);
  });
});

describe("isPastEvent", () => {
  it("開催日が今日(JST)より未来なら過去開催ではない", () => {
    // 2026-06-14T00:00:00Z = JST 2026-06-14 09:00
    const now = new Date("2026-06-14T00:00:00.000Z");
    expect(isPastEvent("2026-06-15", now)).toBe(false);
  });

  it("開催日が今日(JST)そのものなら過去開催ではない(当日は開催予定扱い)", () => {
    const now = new Date("2026-06-14T00:00:00.000Z");
    expect(isPastEvent("2026-06-14", now)).toBe(false);
  });

  it("開催日が今日(JST)より過去なら過去開催", () => {
    const now = new Date("2026-06-14T00:00:00.000Z");
    expect(isPastEvent("2026-06-13", now)).toBe(true);
  });

  it("UTC日付境界をまたぐケース(UTC前日23:00=JST当日08:00)でもJST基準で判定する", () => {
    // UTC 2026-06-13T23:00:00Z = JST 2026-06-14T08:00:00
    const now = new Date("2026-06-13T23:00:00.000Z");
    expect(isPastEvent("2026-06-14", now)).toBe(false);
    expect(isPastEvent("2026-06-13", now)).toBe(true);
  });
});
