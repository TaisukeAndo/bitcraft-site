// 既存の静的HTML（news/, service/seminar/）から目視で書き起こしたseedデータ。
// 件数が少ない（News 1件、Seminar詳細2件+過去カードのみ3件）ため、汎用HTMLパーサーを
// 書く代わりに各ソースファイルを直接読んで構造化オブジェクトへ書き起こす方針を採った。
//
// 実行: npx tsx scripts/migrate-legacy/seed-data.ts
// 出力: scripts/migrate-legacy/seed.sql （wrangler d1 execute --file で投入する）
//
// 手動確認が必要だった点（実装計画9章の「手動確認が必要な箇所」に対応）:
// - claude-code-1day の meta description が実際のページ内容（2026-06-14開催・
//   5,000円税込）と食い違っていた（"2025年5月25日開催・10,000円（税別）"という
//   古い記載が残っていた）。新CMSに古い誤りを引き継がないよう、実際のページ内容に
//   合わせて補正した値を採用している。
// - 過去開催の3件（LP制作/教育/AI運用）は詳細ページが存在しないため、
//   sections_json は空のプレースホルダー、meta descriptionはカード説明文を流用。
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SeminarSections } from "../../packages/shared/src/types";

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlJson(value: unknown): string {
  return sqlString(JSON.stringify(value));
}

function sqlInt(value: number | null): string {
  return value === null ? "NULL" : String(value);
}

const emptySections: SeminarSections = {
  target: { title: "", items: [] },
  benefits: { items: [] },
  timeline: { items: [] },
  voices: { items: [] },
  speakers: { items: [] },
  overview: { rows: [] },
  faq: { items: [] },
  cta: { closing: "", sub: "", btnLabel: "" },
};

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

const newsRows = [
  {
    slug: "ai-agent-1day-open",
    status: "published",
    date: "2026-08-15",
    tag: "セミナー",
    title: "Claude Code AIエージェント構築1Dayセミナー、申込受付を開始しました",
    summary:
      "AIを「使う」から「任せる」へ。企業のAI担当者向け対面1Dayセミナー「Claude Code AIエージェント構築1Dayセミナー」（2026年9月19日・鳥取県鳥取市 SANDBOX TOTTORI）の申込受付を開始しました。",
    metaDescription:
      "AIを「使う」から「任せる」へ。企業のAI担当者向け対面1Dayセミナー「Claude Code AIエージェント構築1Dayセミナー」（2026年9月19日・鳥取県鳥取市 SANDBOX TOTTORI）の申込受付を開始しました。",
    metaKeywords: "bitcraft,お知らせ,News,Claude Code,AIエージェント,セミナー,鳥取,安藤太亮",
    ogImageKey: null as string | null,
    bodyHtml: `<p>チャットに質問して終わっていませんか？<br>
Claude Codeであなた専用のAIエージェントを構築し、書類作成・データ集計・定常業務を自動化する、企業のAI担当者向け対面1Dayセミナー「Claude Code AIエージェント構築1Dayセミナー」の申込受付を開始しました。</p>

<h2>開催概要</h2>
<ul>
<li>日時：2026年9月19日（土） 10:00〜17:00</li>
<li>会場：SANDBOX TOTTORI（鳥取県鳥取市浜坂1390-224）</li>
<li>定員：10名（少人数・先着順）</li>
<li>参加費：5,500円（税込）</li>
</ul>

<p>プログラミング未経験の方でも安心してご参加いただける内容です。詳しいカリキュラムやお申込みは、セミナー詳細ページをご確認ください。</p>

<p><a href="/service/seminar/ai-agent-1day/">Claude Code AIエージェント構築1Dayセミナー 詳細ページを見る</a></p>`,
    relatedSeminarSlug: "ai-agent-1day" as string | null,
  },
];

// ---------------------------------------------------------------------------
// Seminars
// ---------------------------------------------------------------------------

const aiAgent1daySections: SeminarSections = {
  target: {
    title: "こんな方に届けたい",
    items: [
      { text: "「AIを活用している」と掲げているけれど、<br>実際の業務プロセスはまだ何も変わっていない。" },
      { text: "ChatGPTなどのチャットAIは使ったことがある。<br>でも、それを「仕組み」として業務に組み込めていない。" },
      { text: "社内でAI活用を進めたいが、<br>何から手をつければいいか分からない。" },
      { text: "属人化した業務のうち、<br>どこをAIに任せられるのか見極め方が分からない。" },
    ],
  },
  benefits: {
    items: [
      {
        num: "01",
        title: "「チャットで終わる使い方」と「業務が回る使い方」の違いが分かる",
        desc: "質問して終わる使い方と、成果物が自動で生まれ続ける使い方の差を、ハンズオンを通じて体感します。",
      },
      {
        num: "02",
        title: "自社の業務を題材に、実際に動くAIエージェントを構築できる",
        desc: "コードは一行も書きません。それでも、今日はじめて触った方が、当日中に自社業務専用のAIエージェントを完成させます。",
      },
      {
        num: "03",
        title: "明日から現場で使える「仕組み」を持ち帰れる",
        desc: "セミナー終了時点で、あなたの会社の業務に合わせた自動化の仕組みが手元にあります。明日から現場に導入できます。",
      },
      {
        num: "04",
        title: "1ヶ月間の無料フォローアップ付き",
        desc: "導入後につまずいたところは、オンラインでいつでも質問可能。1ヶ月間、社内定着までを伴走します。",
      },
    ],
  },
  timeline: {
    items: [
      { time: "9:30〜", title: "受付開始", desc: "10:00より講義を開始いたします。受付までお越しください。" },
      {
        time: "10:00〜12:00",
        title: "午前の部：AIエージェントへの「仕事の渡し方」を学ぶ",
        desc: "【全体の土台】AIに仕事を任せるための考え方を身につけたうえで、自社の業務を洗い出し、AIに任せる仕事を判断軸を持って見極めます。",
      },
      { time: "12:00〜13:00", title: "昼休憩", modifier: "break" },
      {
        time: "13:00〜16:00",
        title: "午後の部：自社専用のAIエージェントを構築する",
        desc: "書類作成・データ集計・定常業務のいずれかを題材に、実際に動くAIエージェントを組み立て、作って終わりにせず運用し続けられる仕組みに仕上げます。後半では自社の業務課題を持ち込んで、その場で解決策を完成させます。",
      },
      {
        time: "16:00〜17:00",
        title: "交流会・ネットワーキング",
        desc: "参加者同士で学んだ内容や自社の課題を共有しながら交流を深めます。明日から社内に広げるためのヒントや運用ノウハウも、この時間で情報交換できます。",
      },
      { time: "17:00", title: "終了", modifier: "end" },
    ],
  },
  voices: {
    items: [
      { text: "とても大きな学びを得ました！1日集中して学べたこと、さらに対面だったことでつまづいても手厚いサポートをしていただけたことが大きいです。全くの素人だった私がClaudeを触れていることにびっくりしています。本当にありがとうございました。", name: "", job: "" },
      { text: "前提知識が乏しい中でもわからないことを気軽に質問できる雰囲気だったのが大変助かりました。聞きづらい雰囲気だったら、不完全燃焼で終わっていたと思います。", name: "", job: "" },
      { text: "今日作ったスキルズを、明日の仕事で早速試してみようと思っています。", name: "", job: "" },
      { text: "講座と実践のバランスが良く、お話も非常に聞きやすく、進行も上手で楽しかったです。", name: "", job: "" },
      { text: "あっという間の有意義な時間でした！", name: "", job: "" },
      { text: "とても勉強になりました。丁寧に教えて頂きありがとうございました。", name: "", job: "" },
    ],
    note: "※ 過去に開催した同シリーズセミナー（松江開催）でいただいた参加者の声です",
  },
  speakers: {
    items: [
      {
        photoKey: "seminars/ai-agent-1day/speakers/speaker_ando.jpg",
        tags: ["エンジニア", "AIコンサルタント"],
        name: "安藤 太亮",
        kana: "あんどう たいすけ",
        affil: "bitcraft 代表 / エンジニア",
        desc: "鳥取県立鳥取西高校出身。株式会社ゲームガムの創業に携わり、ゲーム開発支援や教育事業などを手がける。個人でも開業し、地方の生産性を高め、新しいビジネスへの挑戦ができる環境をつくることを目的に、企業内DXの支援を各社へ提供している。自らコミュニティアプリを開発・運用し、エンジニアとしての技術的な視点と、事業として成立させるための検証を重ねる視点の両方を大切にしている。現在は複数の企業でClaude環境の構築・導入を支援しており、「現場で本当に使える業務効率化」にこだわった実践的な視点から、日々の業務を変えるClaude Codeの使い方をお伝えします。",
      },
      {
        photoKey: "seminars/ai-agent-1day/speakers/speaker_yoshii.png",
        tags: ["生成AI研修講師", "元IT企業役員", "ファシリテーター"],
        name: "吉井 秀三",
        kana: "よしい しゅうぞう",
        affil: "生成AI研修講師 / 元IT企業役員",
        desc: "ガイアックスの創業期から約20年在籍し、営業・事業部長・子会社社長としてM&Aや新規事業立ち上げを数多く経験。独立後は鳥取を拠点に、企業・自治体向けの生成AI研修やセミナーを数多く担当し、Google GeminiやNotebookLMなど最新の生成AIツールの実践的な活用法を検証・発信している。シニア向けの生成AI教室から子ども向けプログラミング教室まで、世代を問わない学びの場「SESSION」も運営している。当日はファシリテーターとして、参加者が自社の業務にAIエージェントを「任せる」具体的な一歩を踏み出せるようサポートします。",
      },
    ],
  },
  overview: {
    rows: [
      { label: "日時", valueHtml: "2026年9月19日（土） 10:00〜17:00" },
      {
        label: "会場",
        valueHtml:
          'SANDBOX TOTTORI（鳥取県鳥取市浜坂1390-224）<br>鳥取砂丘 西側入口から徒歩1分。<br>※SANDBOX TOTTORI様のご厚意で特別に会場をご提供いただいております。恐れ入りますが、施設内カフェでの1ドリンクのご注文にご協力をお願いいたします。<br><strong>駐車場：</strong>徒歩約1分の「県営砂丘駐車場」（普通車60台）をご利用ください。<iframe src="https://www.google.com/maps?q=鳥取県鳥取市浜坂1390-224+SANDBOX+TOTTORI&output=embed" class="sd-map-iframe" allowfullscreen loading="lazy"></iframe>',
      },
      { label: "定員", valueHtml: "10名（少人数・先着順）<br>※ お申込み状況により、定員は変更になる場合がございます。" },
      {
        label: "参加費",
        valueHtml:
          "5,500円（税込）<br>※事前のお振込みにてお支払いをお願いいたします。振込先はお申し込み後にお送りする確認メールにてご案内します。法人でのお申し込みなど、事前のお振込みが難しい場合は個別にご相談ください。",
      },
      {
        label: "持ち物",
        valueHtml:
          "ノートPC（MacまたはWindows）、Claudeアカウント<br>※当日は <strong>Claude Code（Proプラン）</strong> を使用します。Proプランはセミナー参加費とは別途、<strong>月額 $22（約3,400円目安）</strong> のサブスクリプションをご自身でご加入いただく必要があります。申込後にお送りする事前準備ガイドに登録手順を記載します。",
      },
      {
        label: "講師",
        valueHtml:
          '<a href="https://bitcraft.work/#about" target="_blank">安藤 太亮（あんどう たいすけ）</a><br><a href="https://www.instagram.com/shuzo.yoshii/" target="_blank">吉井 秀三（よしい しゅうぞう）</a>',
      },
    ],
  },
  faq: {
    items: [
      { question: "プログラミング経験がなくても大丈夫ですか？", answer: "はい。コードを書く必要は一切ありません。AIへの「指示の出し方」と「任せ方」を学ぶセミナーです。" },
      { question: "どんな立場の方が対象ですか？", answer: "社内でAI活用を推進したい担当者・経営者・情報システム担当など、企業でAI導入を検討しているすべての方が対象です。個人事業主の方の参加も歓迎します。" },
      { question: "当日使う環境は事前に準備が必要ですか？", answer: "申込後に事前準備ガイドをお送りします。Claudeアカウントの作成のみ事前にお願いしています。" },
      { question: "録画や資料は後日共有されますか？", answer: "当日の資料（スライド・スクリプト）はPDFで共有します。録画配信はありません。" },
      {
        question: "ClaudeCodeの課金体系は、APIによる従量課金ではダメですか？（Proプランは必須ですか？）",
        answer: "最初はSkillを構築（AIを育てる）作業を多く実施するため、多くのTokenを消費することが見込まれます。そのため、定額で使いやすいProプラン（月額$22）を使用することをお勧めしております。",
      },
      {
        question: "鳥取県内在住でないと参加できませんか？",
        answer: 'いいえ、県外からのご参加も歓迎します。現在は対面のみですが、オンライン開催のご要望が一定数集まれば検討します。<a href="/contact/">お問い合わせ</a>からご連絡ください。',
      },
    ],
  },
  cta: {
    closing: "「使っているのに変わらない」と感じているなら、<br>それはツールではなく、使い方の問題です。",
    sub: "1日の終わりに、動くAIエージェントを手に持って帰ってください。",
    meta: "2026年9月19日（土）10:00〜17:00　SANDBOX TOTTORI（鳥取市）<br>参加費 5,500円（税込）",
    btnLabel: "参加申込はこちら",
  },
};

const claudeCode1daySections: SeminarSections = {
  target: {
    title: "こんな方に届けたい",
    items: [
      { text: "「AIを使っている」と言えるけれど、<br>毎週の提案書も、毎月の請求書も、結局自分で作っている。" },
      { text: "ChatGPTで文章を直してもらったことはある。<br>でも、業務の流れそのものは何も変わっていない。" },
      { text: "「もっとうまく使えれば…」と思いながら、<br>今日もタスクをこなしている。" },
    ],
  },
  benefits: {
    items: [
      { num: "01", title: "「渡せる仕事」と「自分がすべき仕事」が分かれる", desc: "毎週繰り返していた作業の8割は、実はAIに渡せます。その判断軸を、ハンズオンを通じて身体で覚えます。" },
      { num: "02", title: "「動くもの」を自分で作った実感がある", desc: "コードは一行も書きません。それでも、今日初めて触った人が、当日中に自分の業務ツールを完成させます。" },
      { num: "03", title: "明日から使い続けられる「仕組み」を持ち帰れる", desc: "セミナー終了時点で、あなたの実際の業務に合わせた自動化の仕組みが手元にあります。明日から本番で使えます。" },
      { num: "04", title: "1ヶ月間の無料フォローアップ付き", desc: "セミナー終了後、実際の業務でつまずいたところは、Slackでいつでも質問可能。1ヶ月間、あなたの伴走者としてサポートします。" },
    ],
  },
  timeline: {
    items: [
      { time: "9:30〜", title: "受付開始", desc: "10:00より講義を開始いたします。受付までお越しください。" },
      { time: "10:00〜", title: "AIへの「仕事の渡し方」を身につける", desc: "【全体の土台】ここさえ押さえれば、あとは何でも応用できます。" },
      { time: "11:00〜", title: "書類仕事を丸投げする", desc: "提案書・報告書・メールをテンプレ化。<br>次回からボタン一つで生成できる形で完成させます。" },
      { time: "12:00〜", title: "昼休憩", modifier: "break" },
      { time: "13:00〜", title: "数字仕事を丸投げする", desc: "経費入力・請求書・集計をAIが代行。<br>毎月2〜3時間の作業を15分に圧縮します。" },
      { time: "14:15〜", title: "繰り返し仕事を丸投げする", desc: "スケジュール調整・タスク整理・フォローメール。<br>「また同じ作業か」をなくします。" },
      { time: "15:30〜", title: "あなた専用スタッフを育てる", desc: "自分の業務課題を持ち込んで、その場で解決策を完成。<br>AIで効率化できるタスクを見極め、AIスタッフに任せる方法を学びます。" },
      { time: "16:30〜", title: "明日から使い続けるために", desc: "習慣化・アップデート対応・Q&A" },
      { time: "17:00", title: "終了", modifier: "end" },
    ],
  },
  voices: {
    items: [
      {
        text: "「仕事の性質上、クライアントごとに依存する業務が多かったですが、それらの業務の中から効率化できそうな部分を見極め、Claude Codeを活用することで、業務の品質を維持したまま作業効率を大幅に改善することができました。」",
        name: "A.Tさん",
        job: "フリーランス デザイナー",
      },
      {
        text: "「これまで、解像度の低い指示によって多くのトークンを消費してしまうことが多かったですが、的確なツール選択とプロンプトを意識することで、最小限のコストで業務改善を実現できるようになりました。」",
        name: "O.Tさん",
        job: "個人事業主 コンサルタント",
      },
    ],
    note: "※ 開催後に実績として掲載予定",
  },
  speakers: {
    items: [
      {
        photoKey: "seminars/claude-code-1day/speakers/speaker_ando.jpg",
        tags: ["バックエンドエンジニア", "AIコンサルタント"],
        name: "安藤 太亮",
        kana: "あんどう たいすけ",
        affil: "bitcraft 代表 / バックエンドエンジニア",
        desc: "バックエンドエンジニアとしての技術的素地を持ちながら、マーケティング・会社経営にも携わる実務家。現在は複数の企業でClaude環境の構築・セットアップを手がけ、AIを活用した業務改善コンサルティングを実施している。「現場で本当に使える自動化」にこだわった実践的な視点から、日々の業務を変えるClaudeCodeの使い方を伝えます。",
      },
      {
        photoKey: "seminars/claude-code-1day/speakers/speaker_matsuishi.png",
        tags: ["データサイエンス", "AI研究者"],
        name: "松石 将治",
        kana: "まついし まさはる",
        affil: "島根大学大学院 自然科学研究科 / データサイエンス研究",
        desc: "島根大学大学院自然科学研究科にてデータサイエンスを研究。AIの「なぜ動くのか」「どう考えるべきか」という理論的背景を、難解な専門用語を使わず平易に伝えることを得意とする。ClaudeCodeを使いこなすための概念・思考フレームワークを深掘りし、受講者が「なんとなく使っている」から「確信を持って使える」状態になれるよう導きます。",
      },
    ],
  },
  overview: {
    rows: [
      { label: "日時", valueHtml: "2026年6月14日（日） 10:00〜17:00" },
      {
        label: "会場",
        valueHtml:
          '島根県松江市<br>※現時点ではオープンソースラボを予定しておりますが、変更になる可能性もございます。変更がある場合は、参加者へ別途ご連絡いたします。<iframe src="https://www.google.com/maps?q=島根県松江市&output=embed" class="sd-map-iframe" allowfullscreen loading="lazy"></iframe>',
      },
      { label: "定員", valueHtml: "20名（少人数・先着順）（当時の残席表示: 残り3名）" },
      { label: "参加費", valueHtml: "5,000円（税込）<br>※当日、現地会場にてお支払いいただきます。" },
      {
        label: "持ち物",
        valueHtml:
          "ノートPC（MacまたはWindows）、Claudeアカウント<br>※当日は <strong>Claude Code（Proプラン）</strong> を使用します。Proプランはセミナー参加費とは別途、<strong>月額 $22（約3,400円目安）</strong> のサブスクリプションをご自身でご加入いただく必要があります。申込後にお送りする事前準備ガイドに登録手順を記載します。",
      },
      { label: "講師", valueHtml: '<a href="https://bitcraft.work/#about" target="_blank">安藤 太亮（あんどう たいすけ）</a><br>松石 将治（まついし まさはる）' },
    ],
  },
  faq: {
    items: [
      { question: "プログラミング経験がなくても大丈夫ですか？", answer: "はい。コードを書く必要は一切ありません。AIへの「指示の出し方」を学ぶセミナーです。" },
      { question: "どんな職種の方が対象ですか？", answer: "フリーランス・個人事業主・副業中の会社員など、自分の業務効率を上げたいすべての方が対象です。" },
      { question: "当日使う環境は事前に準備が必要ですか？", answer: "申込後に事前準備ガイドをお送りします。Claudeアカウントの作成のみ事前にお願いしています。" },
      { question: "録画や資料は後日共有されますか？", answer: "当日の資料（スライド・スクリプト）はPDFで共有します。録画配信はありません。" },
      {
        question: "ClaudeCodeの課金体系は、APIによる従量課金ではダメですか？（Proプランは必須ですか？）",
        answer: "最初はSkillを構築（AIを育てる）作業を多く実施するため、多くのTokenを消費することが見込まれます。そのため、定額で使いやすいProプラン（月額$22）を使用することをお勧めしております。",
      },
      {
        question: "島根在住でないと参加できませんか？",
        answer: '現在は対面のみですが、オンライン開催のご要望が一定数集まれば検討します。<a href="/contact/">お問い合わせ</a>からご連絡ください。',
      },
    ],
  },
  cta: {
    closing: "「使っているのに変わらない」と感じているなら、<br>それはツールではなく、使い方の問題です。",
    sub: "1日の終わりに、動くものを手に持って帰ってください。",
    meta: "2026年6月14日（日）10:00〜17:00　松江市内会場<br>参加費 5,000円（税込）",
    btnLabel: "参加申込はこちら",
  },
};

const seminarRows: {
  slug: string;
  status: "draft" | "before_registration" | "open" | "closed";
  detailPage: number;
  eventDate: string;
  eventDateDisplay: string;
  seminarType: string;
  title: string;
  catchLine: string | null;
  heroSub: string | null;
  description: string;
  priceDisplay: string | null;
  priceNote: string | null;
  capacity: number | null;
  seatsLeft: number | null;
  heroImageKey: string | null;
  cardImageKey: string | null;
  venueSummary: string | null;
  sections: SeminarSections;
  googleFormUrl: string | null;
  googleFormFields: Record<string, string> | null;
  gasConfigured: number;
  metaDescription: string;
  metaKeywords: string | null;
}[] = [
  {
    slug: "ai-agent-1day",
    status: "open",
    detailPage: 1,
    eventDate: "2026-09-19",
    eventDateDisplay: "2026年9月19日（土）",
    seminarType: "1Dayセミナー",
    title: "AIを「使う」から、AIに「任せる」へ。<br>Claude Code AIエージェント構築1Dayセミナー",
    catchLine: "AIを「使う」から、<br>AIに「任せる」へ。",
    heroSub:
      "チャットに質問して、終わっていませんか？<br>Claude Codeなら、あなた専用の「AIエージェント」を構築できます。<br>書類作成・データ集計・定常業務が自動で動き続ける仕組みを、<br>1日で作り上げる実践セミナー。",
    description:
      "チャットに質問して終わっていませんか？Claude Codeであなた専用のAIエージェントを構築し、書類作成・データ集計・定常業務を自動化する、企業のAI担当者向け対面1Dayセミナー。",
    priceDisplay: "¥5,500",
    priceNote: "（税込）",
    capacity: 10,
    seatsLeft: null,
    heroImageKey: "seminars/ai-agent-1day/hero-bg.png",
    cardImageKey: "seminars/ai-agent-1day/sns-image.png",
    venueSummary: "SANDBOX TOTTORI（鳥取県鳥取市浜坂1390-224）",
    sections: aiAgent1daySections,
    googleFormUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLScDbru2yfQwWov5n5heSOexj0-xeDSZMldRmxB8Dw7Mh9poHw/formResponse",
    googleFormFields: {
      name: "entry.205820999",
      email: "entry.2104214894",
      tel: "entry.1793219310",
      company: "entry.1094658355",
      occupation: "entry.533540802",
      "occupation.other": "entry.533540802.other_option_response",
      aiUsageLevel: "entry.534106054",
      aiTools: "entry.415787217",
      "aiTools.other": "entry.415787217.other_option_response",
      aiPurpose: "entry.1964328202",
      automationAreas: "entry.1572322710",
      "automationAreas.other": "entry.1572322710.other_option_response",
      googleServices: "entry.1781068288",
      microsoftServices: "entry.432587233",
      otherTools: "entry.918529685",
      expectations: "entry.1304167824",
      automationDetail: "entry.1865271042",
      questions: "entry.466496510",
      privacyConsent: "entry.972091842",
    },
    gasConfigured: 1,
    metaDescription:
      "チャットに質問して終わっていませんか？Claude Codeであなた専用のAIエージェントを構築し、書類作成・データ集計・定常業務を自動化する、企業のAI担当者向け対面1Dayセミナー。2026年9月19日（土）開催。参加費5,500円（税込）。",
    metaKeywords: "Claude Code,AIエージェント,セミナー,AI導入,業務効率化,bitcraft,安藤太亮,吉井秀三",
  },
  {
    slug: "claude-code-1day",
    status: "closed",
    detailPage: 1,
    eventDate: "2026-06-14",
    eventDateDisplay: "2026年6月14日（日）",
    seminarType: "1Dayセミナー",
    title: "AIに「仕事を渡せる人」に、今日なる。<br>Claude Code 実践1Dayセミナー",
    catchLine: "AIに「仕事を渡せる人」に、<br>今日なる。",
    heroSub:
      "ChatGPTに質問するだけで止まっているなら、次のステップへ。<br>Claude Codeは「道具」ではなく、あなた専用のスタッフです。<br>指示するだけで、書類・請求・定常業務が動き続ける仕組みを<br>1日で作り上げる実践セミナー。",
    description:
      "ChatGPTに質問するだけで止まっているなら、次のステップへ。指示するだけで、書類・請求・定常業務が動き続ける仕組みを1日で作り上げる実践セミナー。",
    priceDisplay: "¥5,000",
    priceNote: "（税込）",
    capacity: 20,
    seatsLeft: 3,
    heroImageKey: "seminars/claude-code-1day/hero-bg.png",
    cardImageKey: "seminars/claude-code-1day/sns-image.png",
    venueSummary: "島根県松江市",
    sections: claudeCode1daySections,
    googleFormUrl:
      "https://docs.google.com/forms/u/0/d/e/1FAIpQLScfh0RytGYaCDME32fxCtmYFTSYOK2axD46jZmSIbyeYiKM0A/formResponse",
    googleFormFields: {
      name: "entry.1046348761",
      email: "entry.711113366",
      tel: "entry.2147140863",
      occupation: "entry.2125373593",
      industry: "entry.1573105122",
      aiUsageLevel: "entry.1521330138",
      aiTools: "entry.1462533075",
      aiPurpose: "entry.1106682812",
      accountingTools: "entry.1755619368",
      googleServices: "entry.1824330249",
      microsoftServices: "entry.1938327397",
      otherTools: "entry.1617688847",
      expectations: "entry.1037635033",
      automationDetail: "entry.1387595515",
      questions: "entry.781250550",
      privacyConsent: "entry.1015516558",
    },
    gasConfigured: 0,
    // 注意: 元ページのmeta descriptionは「2025年5月25日開催・参加費10,000円（税別）」という、
    // 実際のページ内容（2026-06-14開催・5,000円税込）と食い違う古い記載だった。
    // 新CMSに古い誤りを引き継がないよう、実際のページ内容に合わせて補正している。
    metaDescription:
      "ChatGPTに質問するだけで止まっているなら、次のステップへ。指示するだけで、書類・請求・定常業務が動き続ける仕組みを1日で作り上げる実践セミナー。2026年6月14日（日）開催。参加費5,000円（税込）。",
    metaKeywords: "Claude Code,セミナー,AI,自動化,フリーランス,業務効率化,bitcraft,安藤太亮",
  },
  {
    slug: "lp-vibe-coding-workshop",
    status: "closed",
    detailPage: 0,
    eventDate: "2026-04-15",
    eventDateDisplay: "2026年4月15日（水）",
    seminarType: "ワークショップ",
    title: "バイブコーディングによる<br>爆速LP制作ワークショップ",
    catchLine: null,
    heroSub: null,
    description: "生成AIを活用した「バイブコーディング」手法で、デザインから実装までノーコード感覚でLPを作成する実践講座。",
    priceDisplay: "¥11,000",
    priceNote: "（税別）",
    capacity: 15,
    seatsLeft: null,
    heroImageKey: null,
    cardImageKey: "seminars/_archive/past-seminar-lp.png",
    venueSummary: null,
    sections: emptySections,
    googleFormUrl: null,
    googleFormFields: null,
    gasConfigured: 0,
    metaDescription: "生成AIを活用した「バイブコーディング」手法で、デザインから実装までノーコード感覚でLPを作成する実践講座。",
    metaKeywords: null,
  },
  {
    slug: "ai-education-inquiry-based-learning",
    status: "closed",
    detailPage: 0,
    eventDate: "2026-03-20",
    eventDateDisplay: "2026年3月20日（金）",
    seminarType: "1Dayセミナー",
    title: "【教育機関向け】<br>「探究学習」×「生成AI」の新しい授業デザイン",
    catchLine: null,
    heroSub: null,
    description: "生徒の「問い」を深める生成AIの効果的な活用方法と、探究学習を加速させるプロンプト設計を学ぶ教育者向けセミナー。",
    priceDisplay: "¥12,000",
    priceNote: "（税別）",
    capacity: 30,
    seatsLeft: null,
    heroImageKey: null,
    cardImageKey: "seminars/_archive/past-seminar-edu.png",
    venueSummary: null,
    sections: emptySections,
    googleFormUrl: null,
    googleFormFields: null,
    gasConfigured: 0,
    metaDescription: "生徒の「問い」を深める生成AIの効果的な活用方法と、探究学習を加速させるプロンプト設計を学ぶ教育者向けセミナー。",
    metaKeywords: null,
  },
  {
    slug: "ai-ops-automation-course",
    status: "closed",
    detailPage: 0,
    eventDate: "2026-02-20",
    eventDateDisplay: "2026年2月20日（金）",
    seminarType: "オンライン講座",
    title: "システム保守運用の<br>AI完全自動化 実践講座",
    catchLine: null,
    heroSub: null,
    description:
      "システムの保守運用をAIで効率化。ユーザーからのFBを元に、Issueの発案からPRの作成、コードレビューまで全て自動化する手法を学びます。",
    priceDisplay: "¥18,000",
    priceNote: "（税別）",
    capacity: 50,
    seatsLeft: null,
    heroImageKey: null,
    cardImageKey: "seminars/_archive/past-seminar-ai-ops.png",
    venueSummary: null,
    sections: emptySections,
    googleFormUrl: null,
    googleFormFields: null,
    gasConfigured: 0,
    metaDescription:
      "システムの保守運用をAIで効率化。ユーザーからのFBを元に、Issueの発案からPRの作成、コードレビューまで全て自動化する手法を学びます。",
    metaKeywords: null,
  },
];

// ---------------------------------------------------------------------------
// SQL生成
// ---------------------------------------------------------------------------

const statements: string[] = [];

for (const n of newsRows) {
  statements.push(
    `INSERT INTO news (slug, status, date, tag, title, summary, meta_description, meta_keywords, og_image_key, body_html, related_seminar_slug) VALUES (${sqlString(n.slug)}, ${sqlString(n.status)}, ${sqlString(n.date)}, ${sqlString(n.tag)}, ${sqlString(n.title)}, ${sqlString(n.summary)}, ${sqlString(n.metaDescription)}, ${sqlString(n.metaKeywords)}, ${sqlString(n.ogImageKey)}, ${sqlString(n.bodyHtml)}, ${sqlString(n.relatedSeminarSlug)});`,
  );
}

for (const s of seminarRows) {
  statements.push(
    `INSERT INTO seminars (slug, status, detail_page, event_date, event_date_display, seminar_type, title, catch_line, hero_sub, description, price_display, price_note, capacity, seats_left, hero_image_key, card_image_key, venue_summary, sections_json, google_form_url, google_form_fields_json, gas_configured, meta_description, meta_keywords) VALUES (${sqlString(s.slug)}, ${sqlString(s.status)}, ${sqlInt(s.detailPage)}, ${sqlString(s.eventDate)}, ${sqlString(s.eventDateDisplay)}, ${sqlString(s.seminarType)}, ${sqlString(s.title)}, ${sqlString(s.catchLine)}, ${sqlString(s.heroSub)}, ${sqlString(s.description)}, ${sqlString(s.priceDisplay)}, ${sqlString(s.priceNote)}, ${sqlInt(s.capacity)}, ${sqlInt(s.seatsLeft)}, ${sqlString(s.heroImageKey)}, ${sqlString(s.cardImageKey)}, ${sqlString(s.venueSummary)}, ${sqlJson(s.sections)}, ${sqlString(s.googleFormUrl)}, ${s.googleFormFields ? sqlJson(s.googleFormFields) : "NULL"}, ${sqlInt(s.gasConfigured)}, ${sqlString(s.metaDescription)}, ${sqlString(s.metaKeywords)});`,
  );
}

const outPath = join(import.meta.dirname, "seed.sql");
writeFileSync(outPath, statements.join("\n") + "\n", "utf-8");
console.log(`Wrote ${statements.length} statements to ${outPath}`);
