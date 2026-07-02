import { txline } from "../src/services/txline";
import { db } from "../src/db/db";
import { fixtures } from "../src/db/schema";
import fs from "fs";

async function main() {
  try {
    const list = db.select().from(fixtures).limit(10).all();
    console.log("Fixtures in DB:");
    list.forEach(f => {
      console.log(`- ID: ${f.fixtureId} | Teams: ${f.participant1} vs ${f.participant2} | Status: ${f.status}`);
    });

    if (list.length === 0) {
      console.log("No fixtures found in DB.");
      return;
    }

    // Pick first finished fixture and dump scores
    const target = list.find(f => f.status === "Finished")?.fixtureId || list[0].fixtureId;
    console.log(`\nFetching scores for fixture ${target}...`);
    const scores = await txline.getScores(target);
    
    fs.writeFileSync("scratch/scores_dump.json", JSON.stringify(scores, null, 2));
    console.log("Saved score dump to scratch/scores_dump.json");
  } catch (err: any) {
    console.error("Error:", err.message, err.stack);
  }
}

main();
