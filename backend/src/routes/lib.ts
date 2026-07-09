import { z } from "@hono/zod-openapi";

export const json = <T extends z.ZodType>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

export const notFound = (resource: string) => ({
  description: `${resource} not found`,
  content: { "application/json": { schema: z.object({ error: z.string() }) } },
});
