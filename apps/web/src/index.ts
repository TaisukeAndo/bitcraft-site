import { Hono } from "hono";
import type { Bindings } from "./lib/bindings";
import { registerTopRoute } from "./routes/top";
import { registerNewsRoutes } from "./routes/news";
import { registerSeminarRoutes } from "./routes/seminars";
import { registerMediaRoutes } from "./routes/media";
import { registerStaticPageRoutes } from "./routes/static-pages";

// 公開サイトの動的レンダリングWorker（実装計画3章）。
const app = new Hono<{ Bindings: Bindings }>();

app.get("/__health", (c) => c.json({ ok: true, service: "bitcraft-web" }));

registerTopRoute(app);
registerNewsRoutes(app);
registerSeminarRoutes(app);
registerMediaRoutes(app);
registerStaticPageRoutes(app);

export default app;
