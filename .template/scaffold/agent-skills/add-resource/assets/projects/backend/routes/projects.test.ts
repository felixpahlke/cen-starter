// @ts-nocheck — skill asset: reference implementation; delete this line when copying it into the app
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { OpenAPIHono } from "@hono/zod-openapi";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Context, MiddlewareHandler } from "hono";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthEnv, Session } from "../auth";
import * as schema from "../db/schema";

type TestDb = ReturnType<typeof drizzle<typeof schema>>;
type JsonProject = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
};

const userA = "user-a";
const userB = "user-b";

const store = vi.hoisted((): { db: TestDb | null } => ({ db: null }));

vi.mock("../db", () => {
  if (!store.db) throw new Error("test db was not initialized");
  return { db: store.db };
});

vi.mock("../auth", () => {
  const getSession = async (c: Context): Promise<Session | null> => {
    const userId = c.req.header("x-test-user");
    if (!userId) return null;
    return {
      user: {
        id: userId,
        email: `${userId}@example.com`,
        name: userId,
        role: "user",
      },
    };
  };

  const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
    const session = await getSession(c);
    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("session", session);
    await next();
  };

  return { getSession, requireAuth };
});

let client: PGlite;
let app: OpenAPIHono<AuthEnv>;

function testDb() {
  if (!store.db) throw new Error("test db was not initialized");
  return store.db;
}

function requestAs(userId: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-test-user", userId);
  return app.request(path, { ...init, headers });
}

async function createProject(userId: string, body: { name: string; description?: string | null }) {
  const response = await requestAs(userId, "/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as JsonProject;
}

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client, { schema });
  store.db = db;

  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL("../db/migrations", import.meta.url)),
  });

  const { projectsRoute } = await import("./projects");
  app = new OpenAPIHono<AuthEnv>();
  app.route("/projects", projectsRoute);
});

beforeEach(async () => {
  const db = testDb();
  await db.delete(schema.projects);
  await db.delete(schema.user);
  await db.insert(schema.user).values([
    { id: userA, email: "user-a@example.com", name: "User A", role: "user" },
    { id: userB, email: "user-b@example.com", name: "User B", role: "user" },
  ]);
});

afterAll(async () => {
  await client.close();
});

describe("projects route", () => {
  it("requires authentication", async () => {
    const response = await app.request("/projects?limit=100&offset=0");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("creates projects with shared-schema trimming", async () => {
    const project = await createProject(userA, { name: "  hi  " });

    expect(project.name).toBe("hi");
  });

  it("lists only the signed-in user's projects", async () => {
    const projectA = await createProject(userA, { name: "A" });
    await createProject(userB, { name: "B" });

    const response = await requestAs(userA, "/projects?limit=100&offset=0");
    const body = (await response.json()) as JsonProject[];

    expect(response.status).toBe(200);
    expect(body.map((project) => project.id)).toEqual([projectA.id]);
  });

  it("hides another user's project from get, patch, and delete", async () => {
    const projectB = await createProject(userB, { name: "B" });

    const getResponse = await requestAs(userA, `/projects/${projectB.id}`);
    const patchResponse = await requestAs(userA, `/projects/${projectB.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "nope" }),
    });
    const deleteResponse = await requestAs(userA, `/projects/${projectB.id}`, {
      method: "DELETE",
    });

    expect(getResponse.status).toBe(404);
    expect(patchResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
  });

  it("rejects an empty patch body", async () => {
    const project = await createProject(userA, { name: "A" });

    const response = await requestAs(userA, `/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });
});
