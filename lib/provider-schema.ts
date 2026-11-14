import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AiProvider } from "./provider-config";

export const aiConnections = pgTable("ai_connections", {
  userId: text("user_id").primaryKey(),
  provider: text().$type<AiProvider>().notNull(),
  model: text().notNull(),
  encryptedKey: text("encrypted_key").notNull(),
  revision: uuid().defaultRandom().notNull(),
  updatedAt: timestamp("updated_at", {withTimezone: true}).notNull().defaultNow(),
});
