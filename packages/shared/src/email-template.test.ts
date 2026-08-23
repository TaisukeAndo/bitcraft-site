import { describe, expect, it } from "vitest";
import { renderEmailTemplate } from "./email-template";

describe("renderEmailTemplate", () => {
  const context = {
    applicantName: "山田太郎",
    seminarTitle: "Claude Code 1Dayセミナー",
    eventDateDisplay: "2026年9月19日（土）",
    venueSummary: "SANDBOX TOTTORI",
    priceDisplay: "¥5,500",
  };

  it("既知のトークンを値に置換する", () => {
    const result = renderEmailTemplate("{{applicantName}}様、{{seminarTitle}}への申込を受け付けました。", context);
    expect(result).toBe("山田太郎様、Claude Code 1Dayセミナーへの申込を受け付けました。");
  });

  it("複数回登場するトークンも全て置換する", () => {
    const result = renderEmailTemplate("{{eventDateDisplay}} / {{eventDateDisplay}}", context);
    expect(result).toBe("2026年9月19日（土） / 2026年9月19日（土）");
  });

  it("未知のトークンは空文字に置換する（タイプミスで送信自体を失敗させない）", () => {
    const result = renderEmailTemplate("Hello {{typo}}!", context);
    expect(result).toBe("Hello !");
  });

  it("プレースホルダーが無ければそのまま返す", () => {
    const result = renderEmailTemplate("プレーンな本文です。", context);
    expect(result).toBe("プレーンな本文です。");
  });
});
