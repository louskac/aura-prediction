import fs from "fs";

try {
  const scores = JSON.parse(fs.readFileSync("scratch/scores_dump.json", "utf-8"));
  // Find any score update that has a Lineups property
  const updateWithLineups = scores.find((x: any) => x.Lineups && x.Lineups.length > 0);
  
  if (updateWithLineups) {
    console.log("Lineups found in update!");
    console.log(`Rosters count: ${updateWithLineups.Lineups.length}`);
    updateWithLineups.Lineups.forEach((team: any, idx: number) => {
      console.log(`\nTeam ${idx + 1}: ${team.preferredName} (normativeId: ${team.normativeId})`);
      const keys = Object.keys(team);
      console.log("Team properties:", keys);
      
      // Let's find players
      // Sometimes it is key "players" or "Roster" or "Participants"
      const possiblePlayerKeys = keys.filter(k => Array.isArray(team[k]));
      console.log("Array properties inside team:", possiblePlayerKeys);
      
      // Let's print first 3 players of the first array property
      for (const pk of possiblePlayerKeys) {
        console.log(`\nItems in '${pk}' array (first 2):`);
        console.log(JSON.stringify(team[pk].slice(0, 2), null, 2));
      }
    });
  } else {
    console.log("No lineups found in any score updates.");
  }
} catch (err: any) {
  console.error("Error:", err.message);
}
