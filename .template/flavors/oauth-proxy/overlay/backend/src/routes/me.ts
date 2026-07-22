// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { createRoute, z } from "@hono/zod-openapi";
import { json, protectedRouter } from "./lib";

const MeSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
    role: z.enum(["user", "admin"]),
  }),
});

const getMe = createRoute({
  method: "get",
  path: "/",
  tags: ["me"],
  responses: {
    200: json(MeSchema, "Current user"),
    401: json(z.object({ error: z.string() }), "Unauthorized"),
  },
});

export const meRoute = protectedRouter().openapi(getMe, async (c) => {
  return c.json({ user: c.get("session").user }, 200);
});
