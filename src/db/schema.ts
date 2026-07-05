import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Single-row game state (id is always 1).
export const gameState = pgTable("game_state", {
  id: integer("id").primaryKey().default(1),
  username: text("username").notNull().default(""),
  score: integer("score").notNull().default(0),
  rosePoints: integer("rose_points").notNull().default(-1),
  giftPoints: integer("gift_points").notNull().default(1),
  roseCount: integer("rose_count").notNull().default(0),
  giftCount: integer("gift_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Log of every scoring event so the operator has a history.
export const eventLog = pgTable("event_log", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "rose" | "gift" | "manual" | "reset"
  giftName: text("gift_name").notNull().default(""),
  sender: text("sender").notNull().default(""),
  quantity: integer("quantity").notNull().default(1),
  delta: integer("delta").notNull().default(0),
  scoreAfter: integer("score_after").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GameStateRow = typeof gameState.$inferSelect;
export type EventLogRow = typeof eventLog.$inferSelect;
