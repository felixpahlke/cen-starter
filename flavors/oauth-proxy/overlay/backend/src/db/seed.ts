// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { eq, or } from "drizzle-orm";
import { env } from "../env";
import { db } from ".";
import { user } from "./schema";

const admin = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "admin@example.com",
  name: "admin",
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
    .where(or(eq(user.id, admin.id), eq(user.email, admin.email)))
    .limit(1);

  if (existing) {
    if (existing.id !== admin.id) {
      throw new Error(`${admin.email} already belongs to a different local user.`);
    }
    if (existing.role !== "admin") {
      await db
        .update(user)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(user.id, admin.id));
      console.log("development OAuth user promoted to admin");
      return;
    }
    console.log("development OAuth admin already exists");
    return;
  }

  await db.insert(user).values({ ...admin, role: "admin" });
  console.log(`development OAuth admin prepared: ${admin.email} / ChangeMe`);
}

try {
  await seed();
} finally {
  await db.$client.end();
}
