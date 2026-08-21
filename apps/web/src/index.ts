import { Hono } from "hono";

// 公開サイトの動的レンダリングWorker。
// header/footer共通化・News/Seminarの動的レンダリング・募集期限のサーバーサイド
// ロック判定はPhase 4で実装する（実装計画 3章）。
// 現時点ではデプロイ可能な最小のfetchハンドラのみを置く。
const app = new Hono();

app.get("/__health", (c) => c.json({ ok: true, service: "bitcraft-web" }));

export default app;
