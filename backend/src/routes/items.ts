import { ItemCreateSchema, ItemSchema, ItemUpdateSchema, PaginationSchema } from "@cen/shared";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { type AuthEnv, requireAuth } from "../auth";
import { db } from "../db";
import { items } from "../db/schema";
import { json, notFound } from "./lib";

// The canonical resource. Every new resource copies this file's structure:
// schemas from @cen/shared, shared route helpers from ./lib, createRoute
// definitions, one OpenAPIHono chain.

const IdParam = z.object({ id: z.uuid() });

const NotFound = notFound("Item");

const listItems = createRoute({
  method: "get",
  path: "/",
  tags: ["items"],
  request: { query: PaginationSchema },
  responses: { 200: json(z.array(ItemSchema), "List items") },
});

const createItem = createRoute({
  method: "post",
  path: "/",
  tags: ["items"],
  request: { body: json(ItemCreateSchema, "Item to create") },
  responses: { 201: json(ItemSchema, "Created item") },
});

const getItem = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["items"],
  request: { params: IdParam },
  responses: { 200: json(ItemSchema, "The item"), 404: NotFound },
});

const updateItem = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["items"],
  request: { params: IdParam, body: json(ItemUpdateSchema, "Fields to update") },
  responses: { 200: json(ItemSchema, "Updated item"), 404: NotFound },
});

const deleteItem = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["items"],
  request: { params: IdParam },
  responses: { 204: { description: "Deleted" }, 404: NotFound },
});

function serialize(row: typeof items.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

const app = new OpenAPIHono<AuthEnv>();
app.use(requireAuth);

export const itemsRoute = app
  .openapi(listItems, async (c) => {
    const { limit, offset } = c.req.valid("query");
    const userId = c.get("session").user.id;
    const rows = await db.query.items.findMany({
      where: eq(items.ownerId, userId),
      limit,
      offset,
    });
    return c.json(rows.map(serialize), 200);
  })
  .openapi(createItem, async (c) => {
    const body = c.req.valid("json");
    const ownerId = c.get("session").user.id;
    const [row] = await db
      .insert(items)
      .values({ ...body, ownerId })
      .returning();
    if (!row) throw new Error("insert returned no row");
    return c.json(serialize(row), 201);
  })
  .openapi(getItem, async (c) => {
    const { id } = c.req.valid("param");
    const userId = c.get("session").user.id;
    const row = await db.query.items.findFirst({
      where: and(eq(items.id, id), eq(items.ownerId, userId)),
    });
    if (!row) return c.json({ error: "Item not found" }, 404);
    return c.json(serialize(row), 200);
  })
  .openapi(updateItem, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const userId = c.get("session").user.id;
    const [row] = await db
      .update(items)
      .set(body)
      .where(and(eq(items.id, id), eq(items.ownerId, userId)))
      .returning();
    if (!row) return c.json({ error: "Item not found" }, 404);
    return c.json(serialize(row), 200);
  })
  .openapi(deleteItem, async (c) => {
    const { id } = c.req.valid("param");
    const userId = c.get("session").user.id;
    const [row] = await db
      .delete(items)
      .where(and(eq(items.id, id), eq(items.ownerId, userId)))
      .returning();
    if (!row) return c.json({ error: "Item not found" }, 404);
    return c.body(null, 204);
  });
