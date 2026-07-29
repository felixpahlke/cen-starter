// @ts-nocheck — skill asset: reference implementation; delete this line when copying it into the app
import {
  PaginationSchema,
  ProjectCreateSchema,
  ProjectSchema,
  ProjectUpdateSchema,
} from "@cen/shared";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { projects } from "../db/schema";
import { json, notFound, protectedRouter } from "./lib";

const IdParam = z.object({ id: z.uuid() });

const NotFound = notFound("Project");

const listProjects = createRoute({
  method: "get",
  path: "/",
  tags: ["projects"],
  request: { query: PaginationSchema },
  responses: { 200: json(z.array(ProjectSchema), "List projects") },
});

const createProject = createRoute({
  method: "post",
  path: "/",
  tags: ["projects"],
  request: { body: json(ProjectCreateSchema, "Project to create") },
  responses: { 201: json(ProjectSchema, "Created project") },
});

const getProject = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["projects"],
  request: { params: IdParam },
  responses: { 200: json(ProjectSchema, "The project"), 404: NotFound },
});

const updateProject = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["projects"],
  request: { params: IdParam, body: json(ProjectUpdateSchema, "Fields to update") },
  responses: { 200: json(ProjectSchema, "Updated project"), 404: NotFound },
});

const deleteProject = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["projects"],
  request: { params: IdParam },
  responses: { 204: { description: "Deleted" }, 404: NotFound },
});

function serialize(row: typeof projects.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

export const projectsRoute = protectedRouter()
  .openapi(listProjects, async (c) => {
    const { limit, offset } = c.req.valid("query");
    const userId = c.get("session").user.id;
    const rows = await db.query.projects.findMany({
      where: eq(projects.ownerId, userId),
      limit,
      offset,
    });
    return c.json(rows.map(serialize), 200);
  })
  .openapi(createProject, async (c) => {
    const body = c.req.valid("json");
    const ownerId = c.get("session").user.id;
    const [row] = await db
      .insert(projects)
      .values({ ...body, ownerId })
      .returning();
    if (!row) throw new Error("insert returned no row");
    return c.json(serialize(row), 201);
  })
  .openapi(getProject, async (c) => {
    const { id } = c.req.valid("param");
    const userId = c.get("session").user.id;
    const row = await db.query.projects.findFirst({
      where: and(eq(projects.id, id), eq(projects.ownerId, userId)),
    });
    if (!row) return c.json({ error: "Project not found" }, 404);
    return c.json(serialize(row), 200);
  })
  .openapi(updateProject, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const userId = c.get("session").user.id;
    const [row] = await db
      .update(projects)
      .set(body)
      .where(and(eq(projects.id, id), eq(projects.ownerId, userId)))
      .returning();
    if (!row) return c.json({ error: "Project not found" }, 404);
    return c.json(serialize(row), 200);
  })
  .openapi(deleteProject, async (c) => {
    const { id } = c.req.valid("param");
    const userId = c.get("session").user.id;
    const [row] = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, userId)))
      .returning();
    if (!row) return c.json({ error: "Project not found" }, 404);
    return c.body(null, 204);
  });
