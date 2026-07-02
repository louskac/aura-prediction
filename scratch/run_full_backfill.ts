import { fantasyService } from "../src/services/fantasy";
import { db, initDb } from "../src/db/db";
import { fantasyPlayers } from "../src/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  initDb();
  console.log("Running FULL backfill script...");
  
  // Call the service method
  await fantasyService.backfillFotmobIds();
  
  const remaining = db.select({ count: sql`count(*)` }).from(fantasyPlayers).where(sql`fotmob_id IS NULL`).all()[0] as any;
  console.log(`Remaining players with fotmob_id IS NULL: ${remaining?.count}`);
}

main().catch(err => console.error("Error:", err));
