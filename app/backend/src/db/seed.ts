import { eq } from "drizzle-orm";
import { auth } from "../auth/better-auth";
import { env } from "../env";
import { db } from ".";
import { user } from "./schema";

const admin = {
  email: "admin@example.com",
  name: "Admin",
  password: "ChangeMe",
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
    .select({ role: user.role })
    .from(user)
    .where(eq(user.email, admin.email))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      await db
        .update(user)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(user.email, admin.email));
      console.log("development user promoted to admin; password left unchanged");
      return;
    }
    console.log("development admin already exists; password left unchanged");
    return;
  }

  await auth.api.createUser({
    body: { ...admin, role: "admin" },
  });
  console.log(`development admin created: ${admin.email} / ${admin.password}`);
}

try {
  await seed();
} finally {
  await db.$client.end();
}
