import fs from "fs";

try {
  const scores = JSON.parse(fs.readFileSync("scratch/scores_dump.json", "utf-8"));
  console.log("Searching for player-related keys inside events...");

  // Let's gather some player IDs from lineups
  const updateWithLineups = scores.find((x: any) => x.Lineups && x.Lineups.length > 0);
  const playerIds = new Set<number>();
  const fixturePlayerIds = new Set<number>();

  if (updateWithLineups) {
    updateWithLineups.Lineups.forEach((team: any) => {
      team.lineups.forEach((entry: any) => {
        playerIds.add(entry.player.normativeId);
        fixturePlayerIds.add(entry.fixturePlayerId);
      });
    });
  }

  console.log(`Gathered ${playerIds.size} player IDs and ${fixturePlayerIds.size} fixture player IDs.`);

  // Now, search all keys in all updates
  const matchingEvents: any[] = [];

  scores.forEach((update: any) => {
    // recursively traverse object to search for any value matching a player ID
    function traverse(obj: any, path: string = "") {
      if (!obj) return;
      if (typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          traverse(obj[k], path ? `${path}.${k}` : k);
        }
      } else {
        const val = Number(obj);
        if (playerIds.has(val) || fixturePlayerIds.has(val)) {
          matchingEvents.push({
            path,
            val,
            action: update.Action || update.Data?.Action,
            update: JSON.stringify(update).substring(0, 300)
          });
        }
      }
    }
    traverse(update);
  });

  console.log(`Found ${matchingEvents.length} matches in events:`);
  matchingEvents.slice(0, 15).forEach(m => {
    console.log(`- Path: ${m.path} | Val: ${m.val} | Action: ${m.action}`);
    console.log(`  Update: ${m.update}`);
  });

} catch (err: any) {
  console.error("Error:", err.message);
}
