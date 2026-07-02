import fs from "fs";

try {
  const scores = JSON.parse(fs.readFileSync("scratch/scores_dump.json", "utf-8"));
  console.log("Analyzing actions in score updates...");
  
  const actions = new Set<string>();
  const playerEvents: any[] = [];

  scores.forEach((update: any) => {
    if (update.Data && update.Data.Action) {
      actions.add(update.Data.Action);
      
      const newPlayer = update.Data.New?.PlayerId;
      const prevPlayer = update.Data.Previous?.PlayerId;
      const mainPlayer = update.Data.PlayerId;

      if (newPlayer || prevPlayer || mainPlayer) {
        playerEvents.push({
          action: update.Data.Action,
          clock: update.Data.New?.Clock?.Seconds || update.Data.Clock?.Seconds,
          data: update.Data
        });
      }
    }
  });

  console.log("Unique actions found:", Array.from(actions));
  console.log(`\nTotal events with player IDs: ${playerEvents.length}`);
  console.log("\nSample events (first 10):");
  playerEvents.slice(0, 10).forEach(e => {
    console.log(`- Action: ${e.action} | Clock: ${e.clock}s | Data:`, JSON.stringify(e.data));
  });

} catch (err: any) {
  console.error("Error:", err.message);
}
