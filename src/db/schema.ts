import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Table: Fixtures (from TxLINE API)
export const fixtures = sqliteTable("fixtures", {
  fixtureId: integer("fixture_id").primaryKey(),
  startTime: integer("start_time").notNull(),
  competitionId: integer("competition_id").notNull(),
  competition: text("competition").notNull(),
  fixtureGroupId: integer("fixture_group_id"), // Tournament round group: 10115677=R32, 10115574=R16, etc.
  participant1: text("participant1").notNull(),
  participant2: text("participant2").notNull(),
  status: text("status").notNull(), // 'NotStarted', 'InPlay', 'Finished'
  score1: integer("score1").default(0),
  score2: integer("score2").default(0),
  lastUpdated: integer("last_updated").notNull(),
});

// Table: Bracket Predictions (Group stage predictions / knockout predictions)
export const bracketPredictions = sqliteTable("bracket_predictions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  walletAddress: text("wallet_address").notNull(),
  stage: text("stage").notNull(), // 'R16', 'QF', 'SF', 'Final', 'Winner'
  matchKey: text("match_key").notNull(), // E.g. 'R16_1', 'QF_1', 'SF_1', etc.
  predictedWinner: text("predicted_winner").notNull(), // Participant Name
  createdAt: integer("created_at").notNull(),
});

// Table: Prediction Markets (YES/NO outcome shares)
export const markets = sqliteTable("markets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // 'fixture_outcome', 'bracket_knockout', 'fantasy_points'
  fixtureId: integer("fixture_id"), // Optional: link to a specific fixture
  targetValue: text("target_value"), // Target participant or threshold
  yesPrice: integer("yes_price").notNull().default(50), // Price in cents/points (1-99)
  noPrice: integer("no_price").notNull().default(50),
  status: text("status").notNull().default("Active"), // 'Active', 'ResolvedYes', 'ResolvedNo', 'Cancelled'
  createdAt: integer("created_at").notNull(),
});

// Table: User Shares Holdings (Portfolio)
export const shares = sqliteTable("shares", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  walletAddress: text("wallet_address").notNull(),
  marketId: integer("market_id").notNull().references(() => markets.id),
  yesShares: integer("yes_shares").notNull().default(0),
  noShares: integer("no_shares").notNull().default(0),
});

// Table: Limit Orders (Open book prediction market)
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  walletAddress: text("wallet_address").notNull(),
  marketId: integer("market_id").notNull().references(() => markets.id),
  orderType: text("order_type").notNull(), // 'BuyYes', 'BuyNo', 'SellYes', 'SellNo'
  price: integer("price").notNull(), // Price per share (1-99)
  sharesCount: integer("shares_count").notNull(),
  sharesRemaining: integer("shares_remaining").notNull(),
  status: text("status").notNull().default("Open"), // 'Open', 'Filled', 'Cancelled'
  createdAt: integer("created_at").notNull(),
});

// Table: Executed Trades History
export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  marketId: integer("market_id").notNull().references(() => markets.id),
  buyer: text("buyer").notNull(),
  seller: text("seller").notNull(),
  sharesCount: integer("shares_count").notNull(),
  price: integer("price").notNull(),
  timestamp: integer("timestamp").notNull(),
});

// Table: Fantasy Players (World Cup rosters and their dynamic valuations)
export const fantasyPlayers = sqliteTable("fantasy_players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  position: text("position").notNull(), // 'GK', 'DEF', 'MID', 'FWD'
  team: text("team").notNull(),
  basePrice: integer("base_price").notNull(), // Price in millions of points/credits (e.g. 15 = $15.0M)
  currentPrice: integer("current_price").notNull(),
  goals: integer("goals").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  cleanSheets: integer("clean_sheets").notNull().default(0),
  yellowCards: integer("yellow_cards").notNull().default(0),
  redCards: integer("red_cards").notNull().default(0),
  previousPoints: integer("previous_points").notNull().default(0),
  currentPoints: integer("current_points").notNull().default(0),
  fotmobId: integer("fotmob_id"),
});

// Table: User Fantasy Squad (11-player line-ups drafted)
export const fantasySquads = sqliteTable("fantasy_squads", {
  walletAddress: text("wallet_address").primaryKey(),
  playerIds: text("player_ids").notNull(), // JSON array of player IDs (e.g. [1, 5, 12, ...])
  budgetRemaining: integer("budget_remaining").notNull(), // Remaining budget in credits/points (scaled by 10, e.g. 1000 = $100.0M)
  totalPoints: integer("total_points").notNull().default(0),
  formation: text("formation").notNull().default("4-3-3"),
  playDay: text("play_day").notNull().default("2026-06-29"),
  createdAt: integer("created_at").notNull(),
});

// Table: Solana Wallets (simulating CASH and SOL balances for prediction markets)
export const solanaWallets = sqliteTable("solana_wallets", {
  walletAddress: text("wallet_address").primaryKey(),
  cashBalance: integer("cash_balance").notNull().default(100000), // in cents ($1000.00 CASH)
  solBalance: integer("sol_balance").notNull().default(5000000000), // in lamports (5.00 SOL)
});


