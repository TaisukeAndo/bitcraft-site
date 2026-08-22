import { describe, expect, it } from "vitest";
import { validateApplyFormAnswers } from "./apply-form";
import type { SeminarApplyForm } from "./types";

const form: SeminarApplyForm = {
  fields: [
    { id: "name", section: "基本情報", label: "お名前", type: "text", required: true },
    { id: "tel", section: "基本情報", label: "電話番号", type: "tel" },
    { id: "tools", section: "AI活用状況", label: "利用ツール", type: "checkbox", required: true, otherOption: true },
  ],
};

describe("validateApplyFormAnswers", () => {
  it("必須項目が全て埋まっていればエラーなし", () => {
    const errors = validateApplyFormAnswers(form, { name: "山田太郎", tools: ["ChatGPT"] });
    expect(errors).toEqual([]);
  });

  it("必須項目が空だとエラーになる", () => {
    const errors = validateApplyFormAnswers(form, { name: "", tools: [] });
    expect(errors.map((e) => e.fieldId)).toEqual(["name", "tools"]);
  });

  it("未知のfieldIdが混入しているとエラーになる", () => {
    const errors = validateApplyFormAnswers(form, { name: "山田太郎", tools: ["Claude"], bogus: "x" });
    expect(errors.some((e) => e.fieldId === "bogus")).toBe(true);
  });

  it("otherOptionの自由記述キー(id.other)は許可される", () => {
    const errors = validateApplyFormAnswers(form, { name: "山田太郎", tools: ["その他"], "tools.other": "独自ツール" });
    expect(errors).toEqual([]);
  });

  it("任意項目(tel)が無くてもエラーにならない", () => {
    const errors = validateApplyFormAnswers(form, { name: "山田太郎", tools: ["ChatGPT"] });
    expect(errors.some((e) => e.fieldId === "tel")).toBe(false);
  });
});
