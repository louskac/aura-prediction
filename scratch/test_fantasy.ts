import { fantasyService } from "../src/services/fantasy";
import { db } from "../src/db/db";
import { fantasyPlayers, fantasySquads } from "../src/db/schema";

async function main() {
  console.log("==========================================");
  console.log("Aura Fantasy Integration Verification Test");
  console.log("==========================================");

  try {
    // 1. Seed players
    console.log("Running seedPlayers()...");
    await fantasyService.seedPlayers();

    const playersCount = db.select().from(fantasyPlayers).all().length;
    console.log(`- Seeded Players Count: ${playersCount}`);
    if (playersCount === 0) throw new Error("No players seeded!");

    // 2. Sync points & prices
    console.log("\nRunning syncPoints()...");
    await fantasyService.syncPoints();
    console.log("- Point sync complete.");

    // Print a few sample players
    const samplePlayers = db.select().from(fantasyPlayers).limit(3).all();
    console.log("\nSample Players after Sync:");
    samplePlayers.forEach(p => {
      console.log(`- ID: ${p.id} | Name: ${p.name} | Team: ${p.team} | Pos: ${p.position} | Price: $${(p.currentPrice/10).toFixed(1)}M | Points: ${p.currentPoints}`);
    });

    // 3. Save squad test
    console.log("\nTesting saveSquad()...");
    // Pick first 11 players ensuring exactly 1 GK
    const all = db.select().from(fantasyPlayers).all();
    // Pick cheap players to stay under budget
    const gks = all.filter(p => p.position === "GK").sort((a,b) => a.currentPrice - b.currentPrice);
    const others = all.filter(p => p.position !== "GK").sort((a,b) => a.currentPrice - b.currentPrice);
    
    if (gks.length === 0 || others.length < 10) throw new Error("Not enough seeded players to form a squad!");
    
    const draftIds = [gks[0].id, ...others.slice(0, 10).map(p => p.id)];
    console.log(`- Attempting to draft player IDs: ${draftIds.join(", ")}`);
    
    const wallet = "GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE";
    const saveResult = fantasyService.saveSquad(wallet, draftIds);
    console.log("- Save Result:", saveResult);

    // 4. Retrieve squad test
    console.log("\nTesting getSquad()...");
    const retrievedSquad = fantasyService.getSquad(wallet);
    console.log("- Retrieved Squad:");
    console.log(`  - Wallet: ${retrievedSquad?.walletAddress}`);
    console.log(`  - Active Players Count: ${retrievedSquad?.players.length}`);
    console.log(`  - Total Points: ${retrievedSquad?.totalPoints}`);
    console.log(`  - Budget Remaining: $${(retrievedSquad!.budgetRemaining/10).toFixed(1)}M`);

  } catch (err: any) {
    console.error("\n[ERROR] Verification failed:", err.message, err.stack);
  }
  console.log("==========================================");
}

main();
