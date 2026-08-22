import { Hono } from "hono";
import type { Bindings } from "./lib/bindings";
import { registerNewsRoutes } from "./routes/news";

// 公開サイトの動的レンダリングWorker（実装計画3章）。
const app = new Hono<{ Bindings: Bindings }>();

app.get("/__health", (c) => c.json({ ok: true, service: "bitcraft-web" }));

registerNewsRoutes(app);

export default app;
