import { describe, expect, it } from "vitest";
import { computeTriggerInstant, isTriggerDue, isValidJstTime } from "./email-schedule";

describe("computeTriggerInstant", () => {
  it("on_submitはnullを返す(即時送信のため事前計算不要)", () => {
    expect(computeTriggerInstant({ type: "on_submit" }, "2026-09-19")).toBeNull();
  });

  it("absoluteはsendAtをそのままDateにする", () => {
    const instant = computeTriggerInstant({ type: "absolute", sendAt: "2026-09-01T00:00:00.000Z" }, "2026-09-19");
    expect(instant?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("relative_to_event: 開催日3日前 10:00 JST を正しく計算する", () => {
    // event_date=2026-09-19、3日前=2026-09-16、10:00 JST = 01:00 UTC
    const instant = computeTriggerInstant(
      { type: "relative_to_event", offsetDays: -3, timeJst: "10:00" },
      "2026-09-19",
    );
    expect(instant?.toISOString()).toBe("2026-09-16T01:00:00.000Z");
  });

  it("relative_to_event: 開催日当日 09:30 JST を正しく計算する(offsetDays=0)", () => {
    const instant = computeTriggerInstant(
      { type: "relative_to_event", offsetDays: 0, timeJst: "09:30" },
      "2026-09-19",
    );
    // JST 2026-09-19 09:30 = UTC 2026-09-19 00:30
    expect(instant?.toISOString()).toBe("2026-09-19T00:30:00.000Z");
  });

  it("relative_to_event: 開催後のフォローアップ(offsetDays正)も計算できる", () => {
    const instant = computeTriggerInstant(
      { type: "relative_to_event", offsetDays: 1, timeJst: "18:00" },
      "2026-09-19",
    );
    // 翌日2026-09-20 18:00 JST = 09:00 UTC
    expect(instant?.toISOString()).toBe("2026-09-20T09:00:00.000Z");
  });
});

describe("isTriggerDue", () => {
  const trigger = { type: "relative_to_event" as const, offsetDays: -3, timeJst: "10:00" };

  it("計算時刻より前はfalse", () => {
    expect(isTriggerDue(trigger, "2026-09-19", new Date("2026-09-16T00:59:59.000Z"))).toBe(false);
  });

  it("計算時刻ちょうどはtrue", () => {
    expect(isTriggerDue(trigger, "2026-09-19", new Date("2026-09-16T01:00:00.000Z"))).toBe(true);
  });

  it("計算時刻より後はtrue", () => {
    expect(isTriggerDue(trigger, "2026-09-19", new Date("2026-09-17T00:00:00.000Z"))).toBe(true);
  });

  it("on_submitは常にfalse(cronスイープの対象外)", () => {
    expect(isTriggerDue({ type: "on_submit" }, "2026-09-19")).toBe(false);
  });
});

describe("isValidJstTime", () => {
  it("正しいHH:MM形式を受け入れる", () => {
    expect(isValidJstTime("00:00")).toBe(true);
    expect(isValidJstTime("09:30")).toBe(true);
    expect(isValidJstTime("23:59")).toBe(true);
  });

  it("不正な形式を拒否する", () => {
    expect(isValidJstTime("24:00")).toBe(false);
    expect(isValidJstTime("9:30")).toBe(false);
    expect(isValidJstTime("10:60")).toBe(false);
    expect(isValidJstTime("morning")).toBe(false);
  });
});
