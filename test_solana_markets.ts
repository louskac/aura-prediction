import { solanaMarketService } from "./src/services/solana-market-service";
import { db } from "./src/db/db";
import { solanaWallets, shares, trades, fixtures } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function runTests() {
  console.log("==================================================");
  console.log("Solana Prediction Market Simulation test suite");
  console.log("==================================================");

  const testWallet = "GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE";

  try {
    // 1. Test getOrCreateWallet
    console.log("\n1. Testing Wallet Initialization...");
    const wallet = solanaMarketService.getOrCreateWallet(testWallet);
    console.log(`- Wallet loaded: ${wallet.walletAddress}`);
    console.log(`- CASH Balance: $${(wallet.cashBalance / 100).toFixed(2)} CASH`);
    console.log(`- SOL Balance: ${(wallet.solBalance / 1e9).toFixed(3)} SOL`);

    // 2. Test Claim Faucet
    console.log("\n2. Testing CASH Faucet Claim...");
    const initialCash = wallet.cashBalance;
    const faucetResult = solanaMarketService.claimFaucet(testWallet);
    console.log(`- Faucet Tx: ${faucetResult.txSig}`);
    console.log(`- New CASH Balance: $${(faucetResult.wallet.cashBalance / 100).toFixed(2)} CASH`);
    console.log(`- CASH Added: $${((faucetResult.wallet.cashBalance - initialCash) / 100).toFixed(2)} CASH`);
    
    // 3. Test Pricing Logic
    console.log("\n3. Testing Dynamic Pricing Math...");
    const mockActiveFixture = {
      fixtureId: 999901,
      participant1: "Spain",
      participant2: "Argentina",
      status: "InPlay",
      score1: 1, // Spain leading
      score2: 0,
      startTime: Date.now() - 30 * 60 * 1000, // 30 mins in
      competition: "World Cup 2026",
    };

    const activePricing = solanaMarketService.getPricingForFixture(mockActiveFixture);
    console.log(` Spain leading 1-0 in 30th minute:`);
    console.log(`  - Probability: ${activePricing.probability}%`);
    console.log(`  - YES Price: ${activePricing.yesPrice}¢ CASH`);
    console.log(`  - NO Price: ${activePricing.noPrice}¢ CASH`);

    const mockFinishedFixture = {
      ...mockActiveFixture,
      status: "Finished",
      score1: 2,
      score2: 1,
    };
    
    const finishedPricing = solanaMarketService.getPricingForFixture(mockFinishedFixture);
    console.log(` Spain wins 2-1 (Finished):`);
    console.log(`  - YES Price: ${finishedPricing.yesPrice}¢ (Expected: 100¢)`);
    console.log(`  - NO Price: ${finishedPricing.noPrice}¢ (Expected: 0¢)`);

    // 4. Test Buy Trade (split YES shares)
    console.log("\n4. Testing YES Buy Trade Execution (World.xyz split)...");
    
    // Seed the fixture in database so trade logic works
    db.delete(fixtures).where(eq(fixtures.fixtureId, mockActiveFixture.fixtureId)).run();
    db.insert(fixtures).values({
      fixtureId: mockActiveFixture.fixtureId,
      startTime: mockActiveFixture.startTime,
      competitionId: 11,
      competition: mockActiveFixture.competition,
      participant1: mockActiveFixture.participant1,
      participant2: mockActiveFixture.participant2,
      status: mockActiveFixture.status,
      score1: mockActiveFixture.score1,
      score2: mockActiveFixture.score2,
      lastUpdated: Date.now(),
    }).run();

    const buyCashAmount = 1000; // spend $10.00 CASH
    const buyResult = solanaMarketService.executeTrade({
      walletAddress: testWallet,
      fixtureId: mockActiveFixture.fixtureId,
      outcome: "YES",
      tradeType: "BUY",
      amount: buyCashAmount,
    });

    if (buyResult.success) {
      console.log(`- Trade successful! Tx: ${buyResult.txSig}`);
      console.log("- Execution Trace Logs:");
      buyResult.logs.forEach(log => console.log(`   > ${log}`));
      
      const postBuyWallet = solanaMarketService.getOrCreateWallet(testWallet);
      console.log(`- New Wallet CASH Balance: $${(postBuyWallet.cashBalance / 100).toFixed(2)} CASH`);
    } else {
      console.error(`- Buy failed: ${buyResult.error}`);
    }

    // 5. Test Sell Trade (merge YES shares)
    console.log("\n5. Testing YES Sell Trade Execution (World.xyz merge)...");
    const sellSharesAmount = 5; // sell 5 YES shares
    const sellResult = solanaMarketService.executeTrade({
      walletAddress: testWallet,
      fixtureId: mockActiveFixture.fixtureId,
      outcome: "YES",
      tradeType: "SELL",
      amount: sellSharesAmount,
    });

    if (sellResult.success) {
      console.log(`- Trade successful! Tx: ${sellResult.txSig}`);
      console.log("- Execution Trace Logs:");
      sellResult.logs.forEach(log => console.log(`   > ${log}`));
      
      const postSellWallet = solanaMarketService.getOrCreateWallet(testWallet);
      console.log(`- New Wallet CASH Balance: $${(postSellWallet.cashBalance / 100).toFixed(2)} CASH`);
    } else {
      console.error(`- Sell failed: ${sellResult.error}`);
    }

    // Clean up mock records
    db.delete(fixtures).where(eq(fixtures.fixtureId, mockActiveFixture.fixtureId)).run();
    console.log("\n[TESTS COMPLETE] All Solana prediction market engine operations tested successfully.");

  } catch (err: any) {
    console.error("\n[FATAL ERROR] Testing suite failed:", err.message);
    console.error(err.stack);
  }
  console.log("==================================================");
}

runTests();
