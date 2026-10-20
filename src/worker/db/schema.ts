import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// All timestamps are integer unix milliseconds. Every data row is user-scoped.

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  googleSub: text("google_sub").unique(),
  createdAt: integer("created_at").notNull(),
});

export const devices = sqliteTable(
  "devices",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: integer("created_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    revokedAt: integer("revoked_at"),
  },
  (t) => [index("devices_user_idx").on(t.userId)],
);

export const pairingRequests = sqliteTable(
  "pairing_requests",
  {
    id: text("id").primaryKey(),
    codeHash: text("code_hash").notNull().unique(),
    pollSecretHash: text("poll_secret_hash").notNull().unique(),
    // pending | approved | consumed
    status: text("status").notNull().default("pending"),
    userId: text("user_id").references(() => users.id),
    deviceName: text("device_name"),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("pairing_status_expires_idx").on(t.status, t.expiresAt)],
);

export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  nightStart: text("night_start").notNull().default("23:00"),
  nightEnd: text("night_end").notNull().default("06:00"),
});
