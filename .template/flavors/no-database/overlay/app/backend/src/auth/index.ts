// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import type { Context, MiddlewareHandler } from "hono";
import { env } from "../env";

export type Session = {
  user: {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin";
  };
};

export type AuthEnv = {
  Variables: {
    session: Session;
  };
};

const apiSession: Session = {
  user: {
    id: "api",
    email: "api@local",
    name: "API client",
    role: "admin",
  },
};

export async function getSession(c: Context): Promise<Session | null> {
  return c.req.header("x-api-key") === env.API_KEY ? apiSession : null;
}

export const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const session = await getSession(c);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("session", session);
  await next();
};
