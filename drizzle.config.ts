import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  casing: "snake_case",
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
