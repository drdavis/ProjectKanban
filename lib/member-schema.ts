import { index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import type { MemberRole } from "./member-fields";

export const productMembers = pgTable("product_members", {
  productId: uuid("product_id").notNull(),
  userId: text("user_id").notNull(),
  role: text().$type<MemberRole>().notNull(),
}, (table) => [
  primaryKey({columns: [table.productId, table.userId]}),
  index("product_members_user").on(table.userId),
]);
