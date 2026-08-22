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

// seminars.apply_form_json (D1) の型。
// 申込フォームはGoogleフォームへのno-cors直POSTから、CMS API(apps/api)が
// D1(applications テーブル)へ直接書き込む自前実装に置き換えた。entry IDの
// ようなGoogleフォーム固有の識別子は不要になり、フォーム内で一意な`id`が
// そのままinputのname属性・applications.answers_jsonのキーになる。
// セミナーごとに入力項目を自由に設定できるAPI（PATCH /v1/seminars/:slug/apply-form）
// を提供するため、ラベル・入力種別・選択肢を含めてデータとして保持する。
export type SeminarApplyFormField = {
  id: string; // フォーム内で一意なキー（例: "name", "occupation"）。answers_jsonのキーにもなる
  section: string; // フォーム内のグルーピング見出し（例: "基本情報"）
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "radio" | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: string[]; // radio/checkbox の選択肢
  otherOption?: boolean; // 「その他」自由記述欄を持つか（answers_json上は `${id}.other` キー）
};

export type SeminarApplyForm = {
  fields: SeminarApplyFormField[];
};

// applications.answers_json (D1) の型。
// キーは SeminarApplyFormField.id、値はtext系なら文字列、checkbox(複数選択)なら
// 文字列配列。otherOptionを選んだ場合は `${id}.other` キーに自由記述を格納する。
export type ApplicationAnswers = Record<string, string | string[]>;
