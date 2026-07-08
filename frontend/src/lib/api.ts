import type { AppType } from "@cen/backend";
import { hc } from "hono/client";

// Fully typed API client — types flow from the backend's route chain, no codegen.
// The import must stay type-only: a value import would pull server code into the bundle.
export const api = hc<AppType>("/api");
