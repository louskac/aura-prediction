import { db, initDb } from "./src/db/db.js";
import { fixtures, markets } from "./src/db/schema.js";
import { sql } from "drizzle-orm";

async function testDatabase() {
  console.log("==========================================");
  console.log("SQLite & Drizzle Database Diagnostic Test");
  console.log("==========================================");

  try {
    console.log("Initializing database schema...");
    initDb();
    console.log("Schema initialized successfully.");

    // Clear existing for test
    console.log("Clearing old test data...");
    db.delete(fixtures).run();
    db.delete(markets).run();

    console.log("Inserting test fixtures...");
    const testFixtures = [
      {
        fixtureId: 20260101,
        startTime: Date.now() + 3600000 * 2,
        competitionId: 11,
        competition: "World Cup 2026",
        participant1: "Argentina",
        participant2: "France",
        status: "NotStarted",
        score1: 0,
        score2: 0,
        lastUpdated: Date.now()
      },
      {
        fixtureId: 20260102,
        startTime: Date.now() - 3600000,
        competitionId: 11,
        competition: "World Cup 2026",
        participant1: "Brazil",
        participant2: "Germany",
        status: "InPlay",
        score1: 2,
        score2: 1,
        lastUpdated: Date.now()
      }
    ];

    for (const f of testFixtures) {
      db.insert(fixtures).values(f).run();
      console.log(`- Inserted fixture: ${f.participant1} vs ${f.participant2}`);
    }

    console.log("Querying fixtures...");
    const queryResult = db.select().from(fixtures).all();
    console.log(`- Retrieved ${queryResult.length} fixtures from database`);
    queryResult.forEach(f => {
      console.log(`  * [${f.status}] ${f.participant1} (${f.score1}) - (${f.score2}) ${f.participant2}`);
    });

  } catch (err: any) {
    console.error("[ERROR] Database test failed:", err.message);
  }
  console.log("==========================================");
}

testDatabase();
