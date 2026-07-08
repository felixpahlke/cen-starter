import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";

const health = createRoute({
  method: "get",
  path: "/",
  tags: ["health"],
  responses: {
    200: {
      description: "Service is up",
      content: {
        "application/json": {
          schema: z.object({ status: z.literal("ok") }),
        },
      },
    },
  },
});

export const healthRoute = new OpenAPIHono().openapi(health, (c) =>
  c.json({ status: "ok" as const }, 200),
);
