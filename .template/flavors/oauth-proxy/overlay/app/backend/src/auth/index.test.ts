// @ts-nocheck — template overlay; this line is stripped when `pnpm flavor apply` copies the file into place
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Hono } from "hono";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "../db/schema";

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

const store = vi.hoisted(
  (): {
    db: TestDb | null;
    env: { NODE_ENV: "development" | "production"; DATABASE_URL: string };
  } => ({
    db: null,
    env: { NODE_ENV: "development", DATABASE_URL: "postgres://postgres@localhost:5432/app" },
  }),
);

vi.mock("../db", () => {
  if (!store.db) throw new Error("test db was not initialized");
  return { db: store.db };
});

vi.mock("../env", () => ({ env: store.env }));

const dexSubject = "CiQxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTESBWxvY2Fs";
const legacySeedId = "11111111-1111-1111-1111-111111111111";

let client: PGlite;
let app: Hono;

function testDb() {
  if (!store.db) throw new Error("test db was not initialized");
  return store.db;
}

function sessionRequest(subject: string, email = "admin@example.com") {
  return app.request("/session", {
    headers: {
      "x-forwarded-email": email,
      "x-forwarded-user": subject,
      "x-forwarded-preferred-username": email.split("@")[0] ?? email,
    },
  });
}

beforeAll(async () => {
  client = new PGlite();
  store.db = drizzle(client, { schema });
  await migrate(store.db, {
    migrationsFolder: fileURLToPath(new URL("../db/migrations", import.meta.url)),
  });

  const { getSession } = await import(".");
  app = new Hono();
  app.get("/session", async (c) => c.json(await getSession(c)));
});

beforeEach(async () => {
  store.env.NODE_ENV = "development";
  store.env.DATABASE_URL = "postgres://postgres@localhost:5432/app";
  await testDb().delete(schema.items);
  await testDb().delete(schema.user);
});

afterAll(async () => {
  await client.close();
});

describe("OAuth user provisioning", () => {
  it("creates the named Dex development user as admin using the effective subject", async () => {
    const response = await sessionRequest(dexSubject);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { id: dexSubject, email: "admin@example.com", role: "admin" },
    });
    expect(await testDb().select().from(schema.user)).toMatchObject([
      { id: dexSubject, email: "admin@example.com", role: "admin" },
    ]);
  });

  it("does not grant admin to other development identities", async () => {
    const response = await sessionRequest("other-subject", "person@example.com");

    expect(await response.json()).toMatchObject({
      user: { id: "other-subject", email: "person@example.com", role: "user" },
    });
  });

  it("does not grant admin to the known email outside local development", async () => {
    store.env.NODE_ENV = "production";
    const response = await sessionRequest(dexSubject);

    expect(await response.json()).toMatchObject({ user: { role: "user" } });
  });

  it("accepts the legacy seeded development row without creating a duplicate email", async () => {
    await testDb()
      .insert(schema.user)
      .values({ id: legacySeedId, email: "admin@example.com", name: "admin", role: "admin" });

    const response = await sessionRequest(dexSubject);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      user: { id: legacySeedId, email: "admin@example.com", role: "admin" },
    });
    expect(await testDb().select().from(schema.user)).toHaveLength(1);
  });
});
