-- 既存の手書きニュース記事（news/ai-agent-1day-open/）をDBへ取り込むための1回限りのseed。
--
-- なぜ必要か: cms/worker は「DBのpublishedな行 = /news/以下とindex.html #newsの正」として
-- 動的にレンダリングする。この記事がDBに無いまま本番でCloudflare Routeを有効化すると、
-- 既存の手書き記事が一覧・トップページから消えてしまう（news/配下の静的HTMLファイル自体は
-- 残るが、Route有効化後はオリジンとして参照されなくなるため）。
-- Route有効化前に必ず一度だけ実行すること（2回実行してもslug UNIQUE制約でエラーになるだけで
-- 二重登録はされない）。
--
--   npx wrangler d1 execute bitcraft-cms --remote --file=../migrations/0002_seed_existing_news.sql

INSERT INTO news (
  slug, title, category, published_at, list_desc, body_html, keywords, description, status, show_on_top, created_by
) VALUES (
  'ai-agent-1day-open',
  'Claude Code AIエージェント構築1Dayセミナー、申込受付を開始しました',
  'セミナー',
  '2026-08-15',
  'AIを「使う」から「任せる」へ。企業のAI担当者向け対面1Dayセミナー「Claude Code AIエージェント構築1Dayセミナー」（2026年9月19日・鳥取県鳥取市 SANDBOX TOTTORI）の申込受付を開始しました。',
  '<p>チャットに質問して終わっていませんか？<br>
                Claude Codeであなた専用のAIエージェントを構築し、書類作成・データ集計・定常業務を自動化する、企業のAI担当者向け対面1Dayセミナー「Claude Code AIエージェント構築1Dayセミナー」の申込受付を開始しました。</p>

                <h2>開催概要</h2>
                <ul>
                    <li>日時：2026年9月19日（土） 10:00〜17:00</li>
                    <li>会場：SANDBOX TOTTORI（鳥取県鳥取市浜坂1390-224）</li>
                    <li>定員：20名（少人数・先着順）</li>
                    <li>参加費：5,500円（税込）</li>
                </ul>

                <p>プログラミング未経験の方でも安心してご参加いただける内容です。詳しいカリキュラムやお申込みは、セミナー詳細ページをご確認ください。</p>

                <p><a href="/service/seminar/ai-agent-1day/">Claude Code AIエージェント構築1Dayセミナー 詳細ページを見る</a></p>',
  'Claude Code,AIエージェント,セミナー,鳥取',
  NULL,
  'published',
  1,
  'seed:migration-0002'
)
ON CONFLICT (slug) DO NOTHING;
