import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  elo: integer("elo").notNull().default(1000),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const duelQueue = sqliteTable(
  "duel_queue",
  {
    userId: text("user_id").primaryKey(),
    difficulty: text("difficulty").notNull(),
    joinedAt: integer("joined_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("duel_queue_diff_idx").on(t.difficulty)]
);

export const duelMatches = sqliteTable(
  "duel_matches",
  {
    id: text("id").primaryKey(),
    difficulty: text("difficulty").notNull(),
    seed: text("seed").notNull(),
    safeX: integer("safe_x").notNull(),
    safeY: integer("safe_y").notNull(),
    player1Id: text("player1_id")
      .notNull()
      .references(() => users.id),
    player2Id: text("player2_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("active"),
    winnerId: text("winner_id"),
    player1Outcome: text("player1_outcome"),
    player2Outcome: text("player2_outcome"),
    player1TimeMs: integer("player1_time_ms"),
    player2TimeMs: integer("player2_time_ms"),
    player1EloDelta: integer("player1_elo_delta"),
    player2EloDelta: integer("player2_elo_delta"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp" }),
  },
  (t) => [
    index("duel_matches_status_idx").on(t.status),
    index("duel_matches_players_idx").on(t.player1Id, t.player2Id),
  ]
);

export const games = sqliteTable(
  "games",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    seed: text("seed").notNull(),
    difficulty: text("difficulty").notNull(),
    mode: text("mode").notNull().default("standard"),
    ranked: integer("ranked", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("playing"),
    seasonId: text("season_id"),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    timeMs: integer("time_ms"),
    clicks: integer("clicks"),
    threeBv: integer("three_bv"),
    movesJson: text("moves_json"),
  },
  (t) => [
    index("games_user_idx").on(t.userId),
    index("games_leaderboard_idx").on(t.difficulty, t.seasonId, t.timeMs),
  ]
);

export const personalBests = sqliteTable(
  "personal_bests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    difficulty: text("difficulty").notNull(),
    mode: text("mode").notNull().default("standard"),
    timeMs: integer("time_ms").notNull(),
    threeBv: integer("three_bv").notNull(),
    gameId: text("game_id").references(() => games.id),
    achievedAt: integer("achieved_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("pb_user_diff_idx").on(t.userId, t.difficulty, t.mode)]
);
