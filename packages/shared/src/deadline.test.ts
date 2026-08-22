import { describe, expect, it } from "vitest";
import { computeDeadline, isRegistrationClosed } from "./deadline";

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
