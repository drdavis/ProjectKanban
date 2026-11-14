import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function connect() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL to connect ProjectKanban.");
  return drizzle(postgres(process.env.DATABASE_URL, {max: 3, prepare: false}), {schema, casing: "snake_case"});
}

const runtime = globalThis as typeof globalThis & { kanbanDb?: ReturnType<typeof connect> };
export function database() {
  return runtime.kanbanDb ??= connect();
}
