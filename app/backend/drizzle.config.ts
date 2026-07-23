import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile("../.env");
} catch {
  // production: DATABASE_URL comes from the real environment
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // biome-ignore lint/style/noNonNullAssertion: validated by env.ts at runtime; drizzle-kit runs standalone
    url: process.env.DATABASE_URL!,
  },
});
