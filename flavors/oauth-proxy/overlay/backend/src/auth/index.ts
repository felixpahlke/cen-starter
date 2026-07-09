// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import type { Context, MiddlewareHandler } from "hono";
import { db } from "../db";
import { user } from "../db/schema";

// The auth seam. Routes only ever touch getSession/requireAuth — never the
// implementation behind them. In this flavor, oauth2-proxy owns the login flow.

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

export async function getSession(c: Context): Promise<Session | null> {
  // These headers are trusted only because the app is reachable exclusively through
  // oauth2-proxy: docker compose locally, and a sidecar in production.
  const email = c.req.header("x-forwarded-email");
  if (!email) return null;

  const subject = c.req.header("x-forwarded-user");
  if (!subject) return null;

  const name = c.req.header("x-forwarded-preferred-username") ?? email;

  const [row] = await db
    .insert(user)
    .values({ id: subject, email, name })
    .onConflictDoUpdate({
      target: user.id,
      set: { email, name, updatedAt: new Date() },
    })
    .returning({ role: user.role });
  if (!row) throw new Error("user upsert returned no row");

  return {
    user: {
      id: subject,
      email,
      name,
      role: row.role === "admin" ? "admin" : "user",
    },
  };
}

export const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const session = await getSession(c);
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("session", session);
  await next();
};
