import { db, initDb } from "../src/db/db";
import { fantasyPlayers, fantasySquads } from "../src/db/schema";
import { eq } from "drizzle-orm";

// Mocking client state and functions
interface Player {
  id: number;
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  team: string;
  basePrice: number;
  currentPrice: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  previousPoints: number;
  currentPoints: number;
  fotmobId?: number | null;
}

const getSlotArrayIndex = (position: "GK" | "DEF" | "MID" | "FWD", index: number): number => {
  if (position === "GK") return 0;
  if (position === "DEF") return 1 + index;
  if (position === "MID") return 5 + index;
  if (position === "FWD") return 8 + index;
  return 0;
};

const mapLoadedSquadToSlots = (playerIds: number[], playersList: Player[]): (number | null)[] => {
  const slotsArray: (number | null)[] = Array(11).fill(null);
  if (!playerIds || playerIds.length === 0) return slotsArray;

  const squadPlayers = playersList.filter(p => playerIds.includes(p.id));
  const gks = squadPlayers.filter(p => p.position === "GK");
  const defs = squadPlayers.filter(p => p.position === "DEF");
  const mids = squadPlayers.filter(p => p.position === "MID");
  const fwds = squadPlayers.filter(p => p.position === "FWD");

  if (gks.length > 0) slotsArray[0] = gks[0].id;
  for (let i = 0; i < Math.min(4, defs.length); i++) slotsArray[1 + i] = defs[i].id;
  for (let i = 0; i < Math.min(3, mids.length); i++) slotsArray[5 + i] = mids[i].id;
  for (let i = 0; i < Math.min(3, fwds.length); i++) slotsArray[8 + i] = fwds[i].id;

  return slotsArray;
};

async function testSimulation() {
  initDb();
  console.log("Simulating client logic...");
  
  const allPlayers = db.select().from(fantasyPlayers).all() as unknown as Player[];
  console.log(`Fetched ${allPlayers.length} players from DB`);

  // Let's test with a mock saved squad from the DB
  const squad = db.select().from(fantasySquads).all()[0];
  console.log("Squad from DB:", squad);
  
  if (squad) {
    const ids = JSON.parse(squad.playerIds) as number[];
    console.log("Parsed IDs:", ids);
    
    // Simulate mapLoadedSquadToSlots
    const mapped = mapLoadedSquadToSlots(ids, allPlayers);
    console.log("Mapped roster slots (11 items):", mapped);
    console.log("Length:", mapped.length);

    // Test getPlayerAtSlot for FWD index 1 (Striker)
    const arrayIdx = getSlotArrayIndex("FWD", 1);
    const pId = mapped[arrayIdx];
    console.log(`Striker slot (index 9) player ID: ${pId}`);
    if (pId) {
      const p = allPlayers.find(pl => pl.id === pId);
      console.log("Found player:", p?.name);
    }
  } else {
    console.log("No squad found in database.");
  }
}

testSimulation().catch(err => console.error("Crash:", err));
