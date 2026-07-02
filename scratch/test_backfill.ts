import { fantasyService } from "../src/services/fantasy";
import { db, initDb } from "../src/db/db";
import { fantasyPlayers } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting test backfill process...");
  initDb();
  
  // 1. Let's make sure players are seeded first
  console.log("Ensuring players are seeded...");
  await fantasyService.seedPlayers();

  // 2. Print count of players with fotmobId = null
  const nullCount = db.select({ count: sql`count(*)` }).from(fantasyPlayers).where(sql`fotmob_id IS NULL`).all()[0] as any;
  console.log(`Initial players with fotmob_id IS NULL: ${nullCount?.count}`);

  if (Number(nullCount?.count) > 0) {
    // Let's run backfill but only for first 15 players to keep test execution fast
    console.log("Running backfill for players...");
    const missing = db.select().from(fantasyPlayers).where(sql`fotmob_id IS NULL`).limit(15).all() as any[];
    
    console.log(`Attempting to resolve FotMob IDs for ${missing.length} players...`);
    for (const p of missing) {
      const fId = await fantasyService.resolveFotmobId(p.name);
      if (fId) {
        console.log(`- Resolved: ${p.name} -> ${fId}`);
        db.update(fantasyPlayers)
          .set({ fotmobId: fId })
          .where(sql`id = ${p.id}`)
          .run();
      } else {
        console.log(`- Failed: ${p.name}`);
      }
      // Brief sleep to avoid hitting suggest API rate limit too hard
      await new Promise(r => setTimeout(r, 100));
    }

    const updatedNullCount = db.select({ count: sql`count(*)` }).from(fantasyPlayers).where(sql`fotmob_id IS NULL`).all()[0] as any;
    console.log(`\nRemaining players with fotmob_id IS NULL: ${updatedNullCount?.count}`);
  } else {
    console.log("All players already have fotmob_id!");
    const sample = db.select().from(fantasyPlayers).limit(5).all();
    console.log("Sample players:", sample);
  }
}

main().catch(err => console.error("Error:", err));
