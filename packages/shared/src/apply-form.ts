import type { ApplicationAnswers, SeminarApplyForm } from "./types";

export type ApplyFormValidationError = { fieldId: string; message: string };

/**
 * セミナー申込フォームの回答を、フォーム定義(SeminarApplyForm)に対して検証する。
 * apps/api の公開申込エンドポイント(POST /v1/seminars/:slug/applications)から
 * 呼び出す想定。「必須項目が空でないか」「未知のfieldId混入」を機械的に弾く。
 * 選択肢(options)の値そのものが正しいかまでは検証しない
 * （将来的にフォーム定義が変わっても過去の回答を壊さないため、緩めに倒す）。
 */
export function validateApplyFormAnswers(
  form: SeminarApplyForm,
  answers: unknown,
): ApplyFormValidationError[] {
  const errors: ApplyFormValidationError[] = [];

  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
    return [{ fieldId: "_root", message: "answersはオブジェクトである必要があります" }];
  }

  const knownIds = new Set(form.fields.map((f) => f.id));
  const typed = answers as ApplicationAnswers;

  for (const key of Object.keys(typed)) {
    const baseId = key.endsWith(".other") ? key.slice(0, -".other".length) : key;
    if (!knownIds.has(baseId)) {
      errors.push({ fieldId: key, message: `未知の項目です: ${key}` });
    }
  }

  for (const field of form.fields) {
    const value = typed[field.id];
    if (!field.required) continue;

    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      errors.push({ fieldId: field.id, message: `${field.label} は必須項目です` });
    }
  }

  return errors;
}
