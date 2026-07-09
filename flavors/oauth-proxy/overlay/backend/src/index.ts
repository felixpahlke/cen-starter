// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { migrateOnStart } from "./db/migrate-on-start";
import { env } from "./env";
import { healthRoute } from "./routes/health";
import { itemsRoute } from "./routes/items";
import { meRoute } from "./routes/me";

// Chained so the frontend can infer types for every route (Hono RPC).
const api = new OpenAPIHono()
  .route("/health", healthRoute)
  .route("/me", meRoute)
  .route("/items", itemsRoute);

export type AppType = typeof api;

const app = new OpenAPIHono();
app.route("/api", api);

app.doc31("/api/openapi.json", {
  openapi: "3.1.0",
  info: { title: "CEN Starter API", version: "0.1.0" },
});
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

// Production: the container serves the built SPA next to the API (single artifact).
if (env.NODE_ENV === "production") {
  app.use("*", serveStatic({ root: "./static" }));
  app.get("*", serveStatic({ path: "./static/index.html" }));
}

await migrateOnStart();
serve({ fetch: app.fetch, port: env.API_PORT ?? env.PORT ?? 3000 }, (info) => {
  console.log(`api ready on http://localhost:${info.port}  (Swagger UI: /api/docs)`);
});
