import fs from "fs";

try {
  const scores = JSON.parse(fs.readFileSync("scratch/scores_dump.json", "utf-8"));
  const updateWithLineups = scores.find((x: any) => x.Lineups && x.Lineups.length > 0);
  
  if (updateWithLineups) {
    console.log("Analyzing players and positionIds...");
    const positionsMap: Record<number, string[]> = {};

    updateWithLineups.Lineups.forEach((team: any) => {
      team.lineups.forEach((entry: any) => {
        const posId = entry.positionId;
        const name = entry.player.preferredName;
        
        if (!positionsMap[posId]) {
          positionsMap[posId] = [];
        }
        positionsMap[posId].push(name);
      });
    });

    Object.keys(positionsMap).forEach((posId: any) => {
      console.log(`\nPosition ID ${posId} (sample players):`);
      console.log(positionsMap[posId].slice(0, 5));
    });
  } else {
    console.log("No lineups found.");
  }
} catch (err: any) {
  console.error("Error:", err.message);
}
