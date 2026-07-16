import { db, initDb } from "@/db/db";
import { bracketPredictions, fixtures as fixturesTable } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import BracketPredictorClient from "./BracketPredictorClient";
import { syncFixtures } from "@/services/txline";

// Server action to save bracket predictions
async function submitBracket(formData: FormData) {
  "use server";
  initDb();
  
  const walletAddress = "GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE"; // default local wallet
  
  // Clear existing predictions
  db.delete(bracketPredictions).where(sql`wallet_address = ${walletAddress}`).run();

  const stages = ["R32", "R16", "QF", "SF", "Final", "Winner"];
  
  for (const stage of stages) {
    let length = 1;
    if (stage === "R32") length = 16;
    else if (stage === "R16") length = 8;
    else if (stage === "QF") length = 4;
    else if (stage === "SF") length = 2;
    else if (stage === "Final") length = 1;
    
    const keys = stage === "Winner" ? ["Winner_1"] : Array.from({ length }, (_, i) => `${stage}_${i + 1}`);
    
    for (const key of keys) {
      const winner = formData.get(key);
      if (winner) {
        db.insert(bracketPredictions).values({
          walletAddress,
          stage,
          matchKey: key,
          predictedWinner: String(winner),
          createdAt: Date.now()
        }).run();
      }
    }
  }

  redirect("/bracket?success=true");
}

async function getPredictions() {
  initDb();
  const walletAddress = "GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE";
  const list = db.select().from(bracketPredictions).where(sql`wallet_address = ${walletAddress}`).all();
  
  // Create mapping
  const map: Record<string, string> = {};
  for (const item of list) {
    map[item.matchKey] = item.predictedWinner;
  }
  return map;
}

// TxLINE fixture group IDs for each tournament round
const FIXTURE_GROUP_R32 = 10115677;
const FIXTURE_GROUP_R16 = 10115574;

// Official FIFA World Cup 2026 R32 bracket template
// Ordered by bracket slot position (determines which R16 match the winners feed into)
// Slots 1-2 feed R16 Match 1, Slots 3-4 feed R16 Match 2, etc.
const R32_BRACKET_TEMPLATE = [
  // Left half of bracket
  { templateLeft: "Canada",        templateRight: "South Africa",        key: "R32_1",  fixtureId: 20260109 }, // Match 73
  { templateLeft: "Netherlands",   templateRight: "Morocco",             key: "R32_2",  fixtureId: 18172280 }, // Match 75
  { templateLeft: "Germany",       templateRight: "Paraguay",            key: "R32_3",  fixtureId: 18175983 }, // Match 74
  { templateLeft: "France",        templateRight: "Sweden",              key: "R32_4",  fixtureId: 18175981 }, // Match 77
  { templateLeft: "Portugal",      templateRight: "Croatia",             key: "R32_5",  fixtureId: 18179763 }, // Match 83
  { templateLeft: "Spain",         templateRight: "Austria",             key: "R32_6",  fixtureId: 18179551 }, // Match 84
  { templateLeft: "United States", templateRight: "Bosnia and Herzegovina", key: "R32_7", fixtureId: 18172379 }, // Match 81
  { templateLeft: "Belgium",       templateRight: "Senegal",             key: "R32_8",  fixtureId: 18179550 }, // Match 82
  // Right half of bracket
  { templateLeft: "Brazil",        templateRight: "Japan",               key: "R32_9",  fixtureId: 18172469 }, // Match 76
  { templateLeft: "Ivory Coast",   templateRight: "Norway",              key: "R32_10", fixtureId: 18175397 }, // Match 78
  { templateLeft: "Mexico",        templateRight: "Ecuador",             key: "R32_11", fixtureId: 18179759 }, // Match 79
  { templateLeft: "England",       templateRight: "DR Congo",            key: "R32_12", fixtureId: 18179764 }, // Match 80
  { templateLeft: "Argentina",     templateRight: "Cape Verde",          key: "R32_13", fixtureId: 18175918 }, // Match 86
  { templateLeft: "Australia",     templateRight: "Egypt",               key: "R32_14", fixtureId: 18176123 }, // Match 88
  { templateLeft: "Switzerland",   templateRight: "Algeria",             key: "R32_15", fixtureId: 18179552 }, // Match 85
  { templateLeft: "Colombia",      templateRight: "Ghana",               key: "R32_16", fixtureId: 18179549 }, // Match 87
];

// Official R16 bracket template: each match defined by which two R32 slots feed into it
// feedsFrom: [slotIndexA, slotIndexB] (0-indexed into R32_BRACKET_TEMPLATE)
const R16_BRACKET_TEMPLATE = [
  { key: "R16_1", feedsFrom: [0, 1]  },  // Winner of R32_1 vs Winner of R32_2
  { key: "R16_2", feedsFrom: [2, 3]  },  // Winner of R32_3 vs Winner of R32_4
  { key: "R16_3", feedsFrom: [4, 5]  },  // Winner of R32_5 vs Winner of R32_6
  { key: "R16_4", feedsFrom: [6, 7]  },  // Winner of R32_7 vs Winner of R32_8
  { key: "R16_5", feedsFrom: [8, 9]  },  // Winner of R32_9 vs Winner of R32_10
  { key: "R16_6", feedsFrom: [10, 11] }, // Winner of R32_11 vs Winner of R32_12
  { key: "R16_7", feedsFrom: [12, 13] }, // Winner of R32_13 vs Winner of R32_14
  { key: "R16_8", feedsFrom: [14, 15] }, // Winner of R32_15 vs Winner of R32_16
];

function normalizeTeamName(name: string): string {
  const lower = name.toLowerCase().trim();
  if (lower === "united states" || lower === "usa") return "usa";
  if (lower === "dr congo" || lower === "congo dr" || lower === "dr. congo") return "dr congo";
  if (lower === "bosnia and herzegovina" || lower === "bosnia & herzegovina") return "bosnia";
  if (lower === "ivory coast" || lower === "côte d'ivoire") return "ivory coast";
  return lower;
}

function getWinner(f: { participant1: string; participant2: string; score1: number | null; score2: number | null; status: string } | null | undefined): string | null {
  if (!f || f.status !== "Finished") return null;
  const s1 = f.score1 ?? 0;
  const s2 = f.score2 ?? 0;
  if (s1 > s2) return f.participant1;
  if (s2 > s1) return f.participant2;
  return null; // Draw (shouldn't happen in knockout)
}

export default async function BracketPage({ searchParams }: { searchParams: { success?: string } }) {
  initDb();
  
  // Auto-sync fixtures and scores from TxLINE API on page load to ensure data is never stale
  await syncFixtures().catch(e => console.error("Auto-sync failed on page load:", e));

  const predictions = await getPredictions();
  const success = searchParams.success === "true";

  // Fetch all World Cup fixtures from the database
  const allDbFixtures = db.select().from(fixturesTable).where(eq(fixturesTable.competitionId, 72)).all();

  // Build a lookup map by fixtureId
  const fixtureById = new Map(allDbFixtures.map(f => [f.fixtureId, f]));

  // Build a lookup map by normalized team pair (for R16+ where we know the teams but not the ID)
  const fixtureByTeams = new Map<string, typeof allDbFixtures[0]>();
  for (const f of allDbFixtures) {
    const k1 = `${normalizeTeamName(f.participant1)}|${normalizeTeamName(f.participant2)}`;
    const k2 = `${normalizeTeamName(f.participant2)}|${normalizeTeamName(f.participant1)}`;
    fixtureByTeams.set(k1, f);
    fixtureByTeams.set(k2, f);
  }

  // --- Build R32 active matches from template + DB data ---
  const r32Winners: (string | null)[] = new Array(16).fill(null);

  const activeMatches = R32_BRACKET_TEMPLATE.map((tmpl, idx) => {
    const dbMatch = fixtureById.get(tmpl.fixtureId);
    
    // Determine actual team names (API may have slightly different names)
    let left = tmpl.templateLeft;
    let right = tmpl.templateRight;
    if (dbMatch) {
      left = dbMatch.participant1;
      right = dbMatch.participant2;
    }

    // Determine winner
    const winner = getWinner(dbMatch);
    r32Winners[idx] = winner;

    // We no longer auto-populate predictions from actual result to preserve user choices

    return { left, right, key: tmpl.key };
  });

  if (!fixtureById.has(20260109)) {
    const byNames = fixtureByTeams.get("canada|south africa");
    if (byNames && byNames.status === "Finished") {
      const w = getWinner(byNames);
      r32Winners[0] = w;
      // Update the activeMatches entry too
      activeMatches[0] = { left: byNames.participant1, right: byNames.participant2, key: "R32_1" };
    } else {
      // Fallback: Canada won 1-0 per confirmed official result
      r32Winners[0] = "Canada";
    }
  }

  // --- Resolve R16 matchups from API data (FixtureGroupId = FIXTURE_GROUP_R16) ---
  // The API directly tells us the R16 fixtures as teams qualify
  const r16DbFixtures = allDbFixtures.filter(f => f.fixtureGroupId === FIXTURE_GROUP_R16);

  const r16Matches = R16_BRACKET_TEMPLATE.map((tmpl, idx) => {
    const [aIdx, bIdx] = tmpl.feedsFrom;
    const teamA = r32Winners[aIdx];
    const teamB = r32Winners[bIdx];

    // Try to find the actual R16 fixture from the API data
    // First try by fixture group + team names
    let r16Match = r16DbFixtures.find(f => {
      const p1 = normalizeTeamName(f.participant1);
      const p2 = normalizeTeamName(f.participant2);
      if (!teamA || !teamB) return false;
      const nA = normalizeTeamName(teamA);
      const nB = normalizeTeamName(teamB);
      return (p1 === nA && p2 === nB) || (p1 === nB && p2 === nA);
    });

    // If both R32 winners are known but no fixture found yet, just show the expected matchup
    const left = r16Match?.participant1 ?? teamA ?? "TBD";
    const right = r16Match?.participant2 ?? teamB ?? "TBD";

    // We no longer auto-populate predictions to preserve user choices

    return { left, right, key: tmpl.key };
  });

  // Pass ALL fixtures to the client (R32 + R16 + future rounds) for score lookups
  const startStage = "R32";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h2 style={{ fontSize: "22px" }}>Tournament Bracket Predictor</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginTop: "4px" }}>
          Predict knockout stage outcomes. Lock your bracket to win exclusive on-chain fan badges.
        </p>
      </div>

      <BracketPredictorClient
        initialPredictions={predictions}
        activeMatches={activeMatches}
        r16Matches={r16Matches}
        startStage={startStage}
        submitAction={submitBracket}
        dbFixtures={allDbFixtures}
      />
    </div>
  );
}
export const revalidate = 0;
