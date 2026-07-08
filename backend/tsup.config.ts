import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  clean: true,
  // Workspace packages ship as TypeScript source — bundle them so the
  // production build has no runtime dependency on .ts files.
  noExternal: [/^@cen\//],
});
