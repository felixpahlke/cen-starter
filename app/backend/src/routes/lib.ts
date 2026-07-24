import { OpenAPIHono, z } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "../auth";

/**
 * Sub-router whose every route requires an authenticated session — handlers can rely on
 * `c.get("session")`. Route files use this instead of wiring auth themselves, so a
 * protected route can't silently lose its guard.
 */
export function protectedRouter() {
  const app = new OpenAPIHono<AuthEnv>();
  app.use(requireAuth);
  return app;
}

export const json = <T extends z.ZodType>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

export const notFound = (resource: string) => ({
  description: `${resource} not found`,
  content: { "application/json": { schema: z.object({ error: z.string() }) } },
});
