// seminars.sections_json (D1) の型。
// 既存の service/seminar/claude-code-1day/index.html の9セクション構成のうち、
// HERO以外の本文セクションをここに格納する（HERO相当のフィールドは seminars
// テーブルの正規化カラム: title/catchLine/heroSub/priceDisplay/capacity/seatsLeft 等）。
export type SeminarSections = {
  target: {
    title: string;
    items: { text: string }[];
  };
  benefits: {
    items: { num: string; title: string; desc: string }[];
  };
  timeline: {
    items: {
      time: string;
      title: string;
      desc?: string;
      modifier?: "break" | "end";
    }[];
  };
  voices: {
    items: { text: string; name: string; job: string }[];
    note?: string;
  };
  speakers: {
    items: {
      photoKey?: string;
      tags: string[];
      name: string;
      kana: string;
      affil: string;
      desc: string;
    }[];
  };
  overview: {
    rows: { label: string; valueHtml: string }[];
  };
  faq: {
    items: { question: string; answer: string }[];
  };
  cta: {
    closing: string;
    sub: string;
    meta?: string;
    btnLabel: string;
  };
};

// seminars.google_form_fields_json (D1) の型。
// entry ID はGoogleフォームインスタンスごとに完全に固有なため
// （.claude/skills/add-seminar/references/google-form-fields.md のパターンA/Bに
// 対応）、apps/web が申込フォームをHTMLとして描画できるよう、ラベル・入力種別・
// 選択肢まで含めてセミナーごとにデータとして保持する（entry IDだけの
// マッピングでは「何のフォームか」をレンダリングできないため）。
export type SeminarFormField = {
  section: string; // フォーム内のグルーピング見出し（例: "基本情報"）
  label: string;
  entryId: string; // "entry.xxxxxxxxx"
  type: "text" | "email" | "tel" | "textarea" | "radio" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: string[]; // radio/checkbox の選択肢
  otherOption?: boolean; // 「その他」自由記述欄を持つか（entryId + ".other_option_response"）
};

export type SeminarFormDefinition = {
  fields: SeminarFormField[];
};
