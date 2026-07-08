import { z } from "zod";

// Single source of truth for the Item resource: the backend validates requests
// against these schemas (and derives the OpenAPI spec from them), the frontend
// reuses them for form validation.

export const ItemSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  ownerId: z.string(),
  createdAt: z.iso.datetime(),
});

export const ItemCreateSchema = ItemSchema.pick({
  title: true,
}).extend({
  description: ItemSchema.shape.description.default(null),
});

export const ItemUpdateSchema = ItemSchema.pick({
  title: true,
  description: true,
}).partial();

export type Item = z.infer<typeof ItemSchema>;
export type ItemCreate = z.infer<typeof ItemCreateSchema>;
export type ItemUpdate = z.infer<typeof ItemUpdateSchema>;
