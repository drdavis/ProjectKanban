import type { RoadmapAssignment, RoadmapRelease } from "./roadmap";
import type { Execution } from "./workflow";
import { pgTable, boolean, uuid, text, integer, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: uuid().defaultRandom().primaryKey(),
  owner: text().notNull(),
  name: text().notNull(),
  roadmap: text().notNull().default(""),
  releases: jsonb().$type<RoadmapRelease[]>().notNull().default([]),
  repository: text().notNull().default(""),
  aiEnabled: boolean("ai_enabled").notNull().default(false),
  revision: integer().notNull().default(0),
}, (t) => [uniqueIndex("products_owner_name").on(t.owner, t.name)]);

export const cards = pgTable("cards", {
  id: uuid().defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  kind: text().notNull(),
  status: text().notNull(),
  title: text().notNull(),
  description: text().notNull().default(""),
  criteria: text().notNull().default(""),
  priority: text().notNull().default("Normal"),
  severity: text().notNull().default(""),
  link: text().notNull().default(""),
  responsible: text().notNull().default(""),
  tags: jsonb().$type<string[]>().notNull().default([]),
  roadmapAssignment: jsonb("roadmap_assignment").$type<RoadmapAssignment>(),
  execution: jsonb().$type<Execution>(),
  position: integer().notNull(),
}, (t) => [index("cards_board_order").on(t.productId, t.kind, t.status, t.position)]);

export const proposals = pgTable("proposals", {
  id: uuid().defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  revision: integer().notNull(),
  operations: jsonb().notNull(),
  prompt: text().notNull(),
  state: text().notNull().default("pending"),
  createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
}, (t) => [index("proposals_product").on(t.productId, t.createdAt)]);

export const activity = pgTable("activity", {
  id: uuid().defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  actor: text().notNull(),
  action: text().notNull(),
  before: jsonb(),
  after: jsonb(),
  createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
}, (t) => [index("activity_product").on(t.productId, t.createdAt)]);
export const mcpTokens = pgTable("mcp_tokens", {
  id: uuid().defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, {onDelete: "cascade"}),
  createdBy: text("created_by").notNull(),
  label: text().notNull(),
  digest: text().notNull().unique(),
  canWrite: boolean("can_write").notNull().default(false),
  createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", {withTimezone: true}).notNull(),
}, (table) => [index("mcp_tokens_product_idx").on(table.productId)]);

export { aiConnections } from "./provider-schema";

export { productMembers } from "./member-schema";
