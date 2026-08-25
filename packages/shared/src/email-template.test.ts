import { describe, expect, it } from "vitest";
import { findUnknownPlaceholders, renderEmailTemplate, SEMINAR_EMAIL_TOKENS } from "./email-template";

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

// {{name}}(contact用)と{{applicantName}}(seminar用)の取り違えにより、実際の
// 送信で申込者名が空欄になる事故が起きたことへの回帰テスト。
describe("findUnknownPlaceholders", () => {
  it("既知のトークンのみなら空配列を返す", () => {
    const result = findUnknownPlaceholders("{{applicantName}}様、{{seminarTitle}}のご案内", SEMINAR_EMAIL_TOKENS);
    expect(result).toEqual([]);
  });

  it("contact用の{{name}}をseminar用テンプレートに使うと検出する", () => {
    const result = findUnknownPlaceholders("{{name}} 様", SEMINAR_EMAIL_TOKENS);
    expect(result).toEqual(["name"]);
  });

  it("同じ未知トークンが複数回登場しても重複排除する", () => {
    const result = findUnknownPlaceholders("{{typo}}...{{typo}}", SEMINAR_EMAIL_TOKENS);
    expect(result).toEqual(["typo"]);
  });
});
