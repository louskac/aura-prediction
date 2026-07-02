import fs from "fs";

try {
  const scores = JSON.parse(fs.readFileSync("scratch/scores_dump.json", "utf-8"));
  
  // Find any score updates that have a player ID in Data
  const matches = scores.filter((x: any) => x.Data && (x.Data.PlayerId || x.Data.New?.PlayerId || x.Data.Previous?.PlayerId));
  
  console.log(`Found ${matches.length} updates with player actions.`);
  const actionSummary: Record<string, any> = {};

  matches.forEach((m: any) => {
    const act = m.Data.Action || m.Action;
    if (!actionSummary[act]) {
      actionSummary[act] = [];
    }
    actionSummary[act].push(m.Data);
  });

  Object.keys(actionSummary).forEach(act => {
    console.log(`\nAction: ${act} (count: ${actionSummary[act].length})`);
    console.log("Sample Data:", JSON.stringify(actionSummary[act][0], null, 2));
  });

} catch (err: any) {
  console.error("Error:", err.message);
}
