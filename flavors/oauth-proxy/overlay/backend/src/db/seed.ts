// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { eq } from "drizzle-orm";
import { env } from "../env";
import { db } from ".";
import { user } from "./schema";

const admin = {
  email: "admin@example.com",
} as const;

async function seed() {
  const databaseHost = new URL(env.DATABASE_URL).hostname;
  if (
    env.NODE_ENV !== "development" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(databaseHost)
  ) {
    throw new Error("Refusing to seed the known development account outside local development.");
  }

  const [existing] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.email, admin.email))
    .limit(1);

  if (!existing) {
    console.log("development OAuth admin will be created on first Dex login");
    return;
  }

  if (existing.role !== "admin") {
    await db
      .update(user)
      .set({ role: "admin", updatedAt: new Date() })
      .where(eq(user.id, existing.id));
    console.log("development OAuth user promoted to admin");
    return;
  }
  console.log("development OAuth admin already exists");
}

try {
  await seed();
} finally {
  await db.$client.end();
}
