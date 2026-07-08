import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";
import { env } from "../env";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  // Dev only: the browser reaches the API through the Vite proxy, so auth requests
  // carry the web origin. In production the API serves the SPA — same origin.
  trustedOrigins: env.NODE_ENV === "development" ? [`http://localhost:${env.WEB_PORT}`] : undefined,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [admin()],
});
