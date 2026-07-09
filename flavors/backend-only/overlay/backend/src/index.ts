// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { auth } from "./auth/better-auth";
import { migrateOnStart } from "./db/migrate-on-start";
import { env } from "./env";
import { healthRoute } from "./routes/health";
import { itemsRoute } from "./routes/items";

// Chained so AppType captures every route registered on the API.
const api = new OpenAPIHono().route("/health", healthRoute).route("/items", itemsRoute);

export type AppType = typeof api;

const app = new OpenAPIHono();
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
app.route("/api", api);

app.doc31("/api/openapi.json", {
  openapi: "3.1.0",
  info: { title: "CEN Starter API", version: "0.1.0" },
});
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

await migrateOnStart();
serve({ fetch: app.fetch, port: env.API_PORT ?? env.PORT ?? 3000 }, (info) => {
  console.log(`api ready on http://localhost:${info.port}  (Swagger UI: /api/docs)`);
});
