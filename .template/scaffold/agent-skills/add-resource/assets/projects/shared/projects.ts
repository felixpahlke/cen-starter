// @ts-nocheck — skill asset: reference implementation; delete this line when copying it into the app
import { z } from "zod";

// Single source of truth for the Project resource: the backend validates requests
// against these schemas (and derives the OpenAPI spec from them), the frontend
// reuses them for form validation.

export const ProjectSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable(),
  ownerId: z.string(),
  createdAt: z.iso.datetime(),
});

export const ProjectCreateSchema = ProjectSchema.pick({
  name: true,
}).extend({
  description: ProjectSchema.shape.description.default(null),
});

export const ProjectUpdateSchema = ProjectSchema.pick({
  name: true,
  description: true,
})
  .partial()
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });

export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
