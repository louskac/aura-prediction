import { db, initDb } from "../db/db";
import { solanaWallets, shares, trades, markets, fixtures } from "../db/schema";
import { sql, eq } from "drizzle-orm";

const TEAM_STRENGTHS: Record<string, number> = {
  Argentina: 88,
  Brazil: 85,
  France: 86,
  England: 84,
  Spain: 85,
  Germany: 82,
  Netherlands: 81,
  Portugal: 83,
  Belgium: 80,
  Croatia: 78,
  Switzerland: 77,
  Colombia: 78,
  Mexico: 75,
  Sweden: 76,
  Norway: 74,
  Morocco: 80,
  Senegal: 75,
  Japan: 76,
  Ecuador: 74,
  Australia: 73,
  Egypt: 74,
  Algeria: 73,
  "Ivory Coast": 75,
  "South Africa": 70,
  Canada: 75,
  USA: 76,
  "United States": 76,
  "DR Congo": 71,
  "Congo DR": 71,
  "Bosnia and Herzegovina": 70,
  "Bosnia & Herzegovina": 70,
  "Cape Verde": 68,
  Austria: 74,
  Paraguay: 73,
  Ghana: 72,
};

export interface SolanaMarketPrice {
  yesPrice: number; // in cents (1-99)
  noPrice: number;
  probability: number; // raw percentage (1-99)
}

export interface SolanaWalletState {
  walletAddress: string;
  cashBalance: number; // in cents
  solBalance: number; // in lamports
}

export class SolanaMarketService {
  constructor() {
    initDb();
  }

  // Ensure wallet exists in database, seed with default balances if not
  public getOrCreateWallet(walletAddress: string): SolanaWalletState {
    const existing = db.select().from(solanaWallets).where(eq(solanaWallets.walletAddress, walletAddress)).get();
    if (existing) {
      return {
        walletAddress: existing.walletAddress,
        cashBalance: existing.cashBalance,
        solBalance: existing.solBalance,
      };
    }

    const defaultWallet = {
      walletAddress,
      cashBalance: 100000, // $1000.00 CASH
      solBalance: 5000000000, // 5.00 SOL
    };

    db.insert(solanaWallets).values(defaultWallet).run();
    return defaultWallet;
  }

  // Claim Faucet: mint CASH and SOL to wallet
  public claimFaucet(walletAddress: string): { success: boolean; wallet: SolanaWalletState; txSig: string; logs: string[] } {
    const wallet = this.getOrCreateWallet(walletAddress);
    const updatedCash = wallet.cashBalance + 50000; // +$500.00 CASH
    const updatedSol = wallet.solBalance + 2000000000; // +2.00 SOL

    db.update(solanaWallets)
      .set({ cashBalance: updatedCash, solBalance: updatedSol })
      .where(eq(solanaWallets.walletAddress, walletAddress))
      .run();

    const txSig = this.generateTxSig();
    const logs = [
      `[Faucet] Initiating on-chain mint for wallet ${walletAddress.substring(0, 6)}...`,
      `Instruction: BridgeTokenMint (CASH Stablecoin)`,
      `Mints 50,000 CASH cents ($500.00) to ATA...`,
      `Instruction: SystemProgram.Transfer (SOL)`,
      `Transfers 2,000,000,000 lamports (2.00 SOL) from Faucet vault...`,
      `Transaction confirmed on Solana Devnet. Block: ${Math.floor(29482910 + Math.random() * 5000)}`,
      `Tx: ${txSig}`,
    ];

    return {
      success: true,
      wallet: { walletAddress, cashBalance: updatedCash, solBalance: updatedSol },
      txSig,
      logs,
    };
  }

  // Get dynamic pricing for a match market based on live TxLINE scores, time, and momentum
  // Get dynamic pricing for a match market based on live TxLINE scores, time, and momentum
  public getPricingForFixture(fixture: {
    fixtureId: number;
    participant1: string;
    participant2: string;
    status: string;
    score1: number | null;
    score2: number | null;
    startTime: number;
  }, subFixtureId?: number): SolanaMarketPrice {
    const targetId = subFixtureId || fixture.fixtureId;
    
    // Check if it is an analytical micro-market (9-digit ID)
    if (targetId > 99999999) {
      const suffix = targetId % 10;
      
      // Suffix 1: Next Goalscorer (Messi vs Yamal)
      if (suffix === 1) {
        const timeFactor = Math.floor(Date.now() / 20000);
        const wave = Math.sin((targetId + timeFactor) * 0.45) * 6; // slow wave
        const prob = Math.round(45 + wave); // Messi base 45%
        return {
          yesPrice: Math.min(99, Math.max(1, prob)),
          noPrice: Math.min(99, Math.max(1, 100 - prob)),
          probability: prob
        };
      }
      
      // Suffix 2: Expected Threat transition shot success (xT)
      if (suffix === 2) {
        const timeFactor = Math.floor(Date.now() / 12000);
        const wave = Math.sin((targetId + timeFactor) * 0.8) * 12; // faster wave
        const prob = Math.round(62 + wave); // YES (shot success) base 62%
        return {
          yesPrice: Math.min(99, Math.max(1, prob)),
          noPrice: Math.min(99, Math.max(1, 100 - prob)),
          probability: prob
        };
      }
      
      // Suffix 3: Next Card/Foul commits (Romero vs Laporte)
      if (suffix === 3) {
        const timeFactor = Math.floor(Date.now() / 30000);
        const wave = Math.sin((targetId + timeFactor) * 0.35) * 5;
        const prob = Math.round(35 + wave); // YES (Romero card) base 35%
        return {
          yesPrice: Math.min(99, Math.max(1, prob)),
          noPrice: Math.min(99, Math.max(1, 100 - prob)),
          probability: prob
        };
      }
    }

    const s1 = TEAM_STRENGTHS[fixture.participant1] || 70;
    const s2 = TEAM_STRENGTHS[fixture.participant2] || 70;
    const baseProb = Math.round((s1 / (s1 + s2)) * 100);

    if (fixture.status === "Finished") {
      const g1 = fixture.score1 ?? 0;
      const g2 = fixture.score2 ?? 0;
      if (g1 > g2) {
        return { yesPrice: 100, noPrice: 0, probability: 100 };
      } else {
        return { yesPrice: 0, noPrice: 100, probability: 0 };
      }
    }

    if (fixture.status === "InPlay") {
      // Calculate elapsed minutes since start
      const diffMs = Date.now() - fixture.startTime;
      const elapsedMin = Math.min(90, Math.max(1, Math.floor(diffMs / 60000)));

      const scoreDiff = (fixture.score1 ?? 0) - (fixture.score2 ?? 0);
      
      // Momentum fluctuates over time
      const timeFactor = Math.floor(Date.now() / 15000); // changes every 15s
      const momentumVal = Math.sin((fixture.fixtureId + timeFactor) * 0.7) * 8; // -8% to +8%

      // Calculate probability: base + score difference weighted by remaining time + momentum
      const timeDecay = 1 - elapsedMin / 90;
      const adjustedProb = baseProb + scoreDiff * 25 * timeDecay + momentumVal;
      
      const prob = Math.round(Math.min(95, Math.max(5, adjustedProb)));
      
      // World.xyz JanusFI spread (2-3% total fee embedded)
      const yesPrice = Math.min(99, Math.max(1, prob + 1));
      const noPrice = Math.min(99, Math.max(1, (100 - prob) + 1));

      return { yesPrice, noPrice, probability: prob };
    }

    // NotStarted: slow sentiment shifts
    const hourFactor = Math.floor(Date.now() / 3600000);
    const sentiment = Math.sin((fixture.fixtureId + hourFactor) * 0.25) * 4;
    const prob = Math.round(Math.min(90, Math.max(10, baseProb + sentiment)));

    const yesPrice = Math.min(99, Math.max(1, prob + 1));
    const noPrice = Math.min(99, Math.max(1, (100 - prob) + 1));

    return { yesPrice, noPrice, probability: prob };
  }

  // Execute buy/sell YES or NO outcome shares
  public executeTrade(params: {
    walletAddress: string;
    fixtureId: number;
    outcome: "YES" | "NO"; // YES = Team A wins, NO = Team A doesn't win (Team B wins/draws)
    tradeType: "BUY" | "SELL";
    amount: number; // CASH cents to spend (for BUY) or Shares to sell (for SELL)
  }): { success: boolean; txSig: string; logs: string[]; error?: string } {
    const { walletAddress, fixtureId, outcome, tradeType, amount } = params;

    // 1. Fetch fixture & calculate pricing
    const baseFixtureId = fixtureId > 99999999 ? Math.floor(fixtureId / 10) : fixtureId;
    const fixture = db.select().from(fixtures).where(eq(fixtures.fixtureId, baseFixtureId)).get();
    if (!fixture) {
      return { success: false, txSig: "", logs: [], error: "Fixture not found" };
    }

    const priceInfo = this.getPricingForFixture(fixture, fixtureId);
    const sharePrice = outcome === "YES" ? priceInfo.yesPrice : priceInfo.noPrice;

    if (sharePrice === 0 || sharePrice === 100) {
      return { success: false, txSig: "", logs: [], error: "Market is resolved and cannot be traded" };
    }

    // Find or create wallet
    const wallet = this.getOrCreateWallet(walletAddress);

    // Fetch market ID from DB (create if not exists)
    let market = db.select().from(markets).where(eq(markets.fixtureId, fixtureId)).get();
    if (!market) {
      // Seed market in database based on sub-market ID
      let name = `${fixture.participant1} vs ${fixture.participant2} - Match Winner`;
      let description = `Will ${fixture.participant1} win the match against ${fixture.participant2}? YES token pays out $1 if they win, NO pays if they draw or lose.`;
      let targetValue = fixture.participant1;

      if (fixtureId > 99999999) {
        const suffix = fixtureId % 10;
        if (suffix === 1) {
          name = `Next Goalscorer (Messi vs Yamal)`;
          description = `Will Lionel Messi score the next goal? YES pays out $1 if Messi scores next, NO pays if Lamine Yamal scores next.`;
          targetValue = "Messi";
        } else if (suffix === 2) {
          name = `Next Transition Success (xT)`;
          description = `Will the current possession transition lead to a shot? YES pays out $1 if a shot is taken, NO pays if possession is lost.`;
          targetValue = "Shot taken";
        } else if (suffix === 3) {
          name = `Next Card / Foul (Romero vs Laporte)`;
          description = `Will Cristian Romero commit the next cardable foul? YES pays out $1 if Romero commits the next foul/gets a card, NO pays if Laporte does.`;
          targetValue = "Romero";
        }
      }

      const newMarket = {
        name,
        description,
        type: "fixture_outcome",
        fixtureId,
        targetValue,
        yesPrice: priceInfo.yesPrice,
        noPrice: priceInfo.noPrice,
        status: fixture.status === "Finished" ? "ResolvedYes" : "Active",
        createdAt: Date.now()
      };
      
      const insertResult = db.insert(markets).values(newMarket).run();
      const insertId = Number(insertResult.lastInsertRowid);
      market = { id: insertId, ...newMarket };
    }

    // Get user's current shares
    let userShares = db.select().from(shares).where(sql`wallet_address = ${walletAddress} AND market_id = ${market.id}`).get();
    if (!userShares) {
      db.insert(shares).values({ walletAddress, marketId: market.id, yesShares: 0, noShares: 0 }).run();
      userShares = { id: 0, walletAddress, marketId: market.id, yesShares: 0, noShares: 0 };
    }

    const txSig = this.generateTxSig();
    const logs: string[] = [];

    if (tradeType === "BUY") {
      const cashToSpend = amount; // in cents
      if (wallet.cashBalance < cashToSpend) {
        return { success: false, txSig: "", logs: [], error: "Insufficient CASH balance" };
      }

      const sharesToMint = Math.floor(cashToSpend / sharePrice);
      if (sharesToMint <= 0) {
        return { success: false, txSig: "", logs: [], error: "Trade amount too low to purchase 1 share" };
      }

      const actualCost = sharesToMint * sharePrice;

      // Update wallet balance
      db.update(solanaWallets)
        .set({ cashBalance: wallet.cashBalance - actualCost })
        .where(eq(solanaWallets.walletAddress, walletAddress))
        .run();

      // Update user shares
      const updatedYes = outcome === "YES" ? userShares.yesShares + sharesToMint : userShares.yesShares;
      const updatedNo = outcome === "NO" ? userShares.noShares + sharesToMint : userShares.noShares;
      db.update(shares)
        .set({ yesShares: updatedYes, noShares: updatedNo })
        .where(sql`wallet_address = ${walletAddress} AND market_id = ${market.id}`)
        .run();

      // Insert trade history
      db.insert(trades).values({
        marketId: market.id,
        buyer: walletAddress,
        seller: "JanusFI_AMM",
        sharesCount: sharesToMint,
        price: sharePrice,
        timestamp: Date.now()
      }).run();

      // World.xyz exact execution logs
      logs.push(
        `[DFlow] Router: swap_with_destination (RFQ quote matched)`,
        `[DFlow] Routing ${actualCost / 100} CASH stablecoin to JanusFI AMM...`,
        `[JanusFI] Incurring prediCt.split instruction call...`,
        `[prediCt] PDA Authority: prediCtPZCttYMvm2W3PtxmMxLmT1dtN7riU6Cxh6tM`,
        `[prediCt] Locking ${sharesToMint} CASH ($${sharesToMint.toFixed(2)}) in Market Vault...`,
        `[prediCt] Token-2022: MintTo ${sharesToMint} YES and ${sharesToMint} NO tokens`,
        `[JanusFI] AMM pays: ${(sharesToMint * (100 - sharePrice)) / 100} CASH backing complementary side`,
        `[JanusFI] Routing ${sharesToMint} ${outcome} tokens to buyer wallet ${walletAddress.substring(0, 4)}...${walletAddress.substring(walletAddress.length - 4)}`,
        `[Token-2022] Permanent Delegate assigned: prediCt Authority`,
        `Solana Devnet transaction confirmed. Slot: ${Math.floor(29482910 + Math.random() * 5000)}`,
        `Tx Signature: ${txSig}`
      );

      return { success: true, txSig, logs };

    } else {
      // SELL / CASH OUT
      const sharesToSell = amount;
      const userHasShares = outcome === "YES" ? userShares.yesShares : userShares.noShares;

      if (userHasShares < sharesToSell) {
        return { success: false, txSig: "", logs: [], error: `Insufficient ${outcome} shares to sell` };
      }

      // Sells are priced slightly lower due to AMM fee/spread
      const sellPrice = Math.max(1, sharePrice - 2); 
      const cashPayout = sharesToSell * sellPrice;

      // Update wallet balance
      db.update(solanaWallets)
        .set({ cashBalance: wallet.cashBalance + cashPayout })
        .where(eq(solanaWallets.walletAddress, walletAddress))
        .run();

      // Update user shares
      const updatedYes = outcome === "YES" ? userShares.yesShares - sharesToSell : userShares.yesShares;
      const updatedNo = outcome === "NO" ? userShares.noShares - sharesToSell : userShares.noShares;
      db.update(shares)
        .set({ yesShares: updatedYes, noShares: updatedNo })
        .where(sql`wallet_address = ${walletAddress} AND market_id = ${market.id}`)
        .run();

      // Insert trade history
      db.insert(trades).values({
        marketId: market.id,
        buyer: "JanusFI_AMM",
        seller: walletAddress,
        sharesCount: sharesToSell,
        price: sellPrice,
        timestamp: Date.now()
      }).run();

      // World.xyz exact execution logs
      logs.push(
        `[DFlow] Router: swap_with_destination (CASH-Out)`,
        `[JanusFI] Swapping ${sharesToSell} ${outcome} shares back to CASH...`,
        `[JanusFI] Providing ${sharesToSell} complementary ${outcome === "YES" ? "NO" : "YES"} shares from liquidity pool...`,
        `[JanusFI] Incurring prediCt.merge instruction call...`,
        `[prediCt] Burning ${sharesToSell} YES and ${sharesToSell} NO tokens (complete set)...`,
        `[prediCt] Releasing ${sharesToSell} CASH ($${sharesToSell.toFixed(2)}) from Market Vault...`,
        `[JanusFI] Paying user ${cashPayout / 100} CASH ($${(cashPayout / 100).toFixed(2)})`,
        `[JanusFI] Retained spread revenue fee: ${(sharesToSell * 2) / 100} CASH`,
        `Solana Devnet transaction confirmed. Slot: ${Math.floor(29482910 + Math.random() * 5000)}`,
        `Tx Signature: ${txSig}`
      );

      return { success: true, txSig, logs };
    }
  }

  // Redeem winning shares for 100 cents (1 CASH) each, losing shares go to 0
  public redeemShares(walletAddress: string, fixtureId: number): { success: boolean; txSig: string; logs: string[]; redeemedCash: number; error?: string } {
    const baseFixtureId = fixtureId > 99999999 ? Math.floor(fixtureId / 10) : fixtureId;
    const fixture = db.select().from(fixtures).where(eq(fixtures.fixtureId, baseFixtureId)).get();
    if (!fixture || fixture.status !== "Finished") {
      return { success: false, txSig: "", logs: [], redeemedCash: 0, error: "Match has not finished yet" };
    }

    const market = db.select().from(markets).where(eq(markets.fixtureId, fixtureId)).get();
    if (!market) {
      return { success: false, txSig: "", logs: [], redeemedCash: 0, error: "Market not found" };
    }

    const userShares = db.select().from(shares).where(sql`wallet_address = ${walletAddress} AND market_id = ${market.id}`).get();
    if (!userShares || (userShares.yesShares === 0 && userShares.noShares === 0)) {
      return { success: false, txSig: "", logs: [], redeemedCash: 0, error: "No shares held in this market" };
    }

    const g1 = fixture.score1 ?? 0;
    const g2 = fixture.score2 ?? 0;
    const winningOutcome = g1 > g2 ? "YES" : "NO";

    const winningShares = winningOutcome === "YES" ? userShares.yesShares : userShares.noShares;
    const losingShares = winningOutcome === "YES" ? userShares.noShares : userShares.yesShares;

    const redeemedCash = winningShares * 100; // 100 cents ($1 CASH) per share

    const wallet = this.getOrCreateWallet(walletAddress);
    
    // Update CASH balance
    db.update(solanaWallets)
      .set({ cashBalance: wallet.cashBalance + redeemedCash })
      .where(eq(solanaWallets.walletAddress, walletAddress))
      .run();

    // Wipe shares
    db.update(shares)
      .set({ yesShares: 0, noShares: 0 })
      .where(sql`wallet_address = ${walletAddress} AND market_id = ${market.id}`)
      .run();

    const txSig = this.generateTxSig();
    const logs = [
      `[prediCt] Operator initiated redemption for wallet ${walletAddress.substring(0, 6)}...`,
      `[prediCt] Market Resolved: ${winningOutcome} (Winner: ${g1 > g2 ? fixture.participant1 : fixture.participant2})`,
      `[prediCt] Burning ${losingShares} losing shares (Value: $0.00)...`,
      `[prediCt] Calling redeem_outcome_for_user...`,
      `[prediCt] Burning ${winningShares} winning shares...`,
      `[prediCt] Releasing ${winningShares} CASH ($${(redeemedCash / 100).toFixed(2)}) from vault...`,
      `[prediCt] Paying user ${winningShares} CASH stablecoins...`,
      `Solana Devnet transaction confirmed. Slot: ${Math.floor(29482910 + Math.random() * 5000)}`,
      `Tx Signature: ${txSig}`
    ];

    return {
      success: true,
      txSig,
      logs,
      redeemedCash,
    };
  }

  // Helper to generate a mock transaction signature
  private generateTxSig(): string {
    const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let sig = "";
    for (let i = 0; i < 88; i++) {
      sig += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return sig;
  }
}

export const solanaMarketService = new SolanaMarketService();
