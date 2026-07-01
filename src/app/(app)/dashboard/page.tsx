import { db, initDb } from "@/db/db";
import { fixtures as fixturesTable, markets as marketsTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { RefreshCw, Play, Trophy, HelpCircle, Activity, Award, LineChart } from "lucide-react";

// Server action or direct DB fetch in Server Component
async function getDashboardData() {
  initDb();
  
  // 1. Fetch fixtures
  const fixturesList = db.select().from(fixturesTable).orderBy(fixturesTable.startTime).all();
  
  // 2. Fetch markets, seed if empty
  let marketsList = db.select().from(marketsTable).all();
  if (marketsList.length === 0) {
    const defaultMarkets = [
      {
        name: "World Cup 2026 Winner",
        description: "Which country will lift the World Cup trophy in the final match?",
        type: "bracket_knockout",
        targetValue: "Argentina",
        yesPrice: 58,
        noPrice: 42,
        status: "Active",
        createdAt: Date.now()
      },
      {
        name: "Brazil vs Germany - Both Teams to Score",
        description: "Will both teams score at least 1 goal in the live match?",
        type: "fixture_outcome",
        fixtureId: 20260102,
        targetValue: "BTTS",
        yesPrice: 72,
        noPrice: 28,
        status: "Active",
        createdAt: Date.now()
      },
      {
        name: "Top Tournament Scorer: Lionel Messi",
        description: "Will Lionel Messi win the Golden Boot award for top goal scorer?",
        type: "fantasy_points",
        targetValue: "Messi",
        yesPrice: 45,
        noPrice: 55,
        status: "Active",
        createdAt: Date.now()
      }
    ];
    for (const m of defaultMarkets) {
      db.insert(marketsTable).values(m).run();
    }
    marketsList = db.select().from(marketsTable).all();
  }

  return {
    fixtures: fixturesList,
    markets: marketsList
  };
}

export default async function DashboardPage() {
  const { fixtures, markets } = await getDashboardData();

  // Group fixtures
  const liveMatches = fixtures.filter(f => f.status === "InPlay");
  const upcomingMatches = fixtures.filter(f => f.status === "NotStarted");
  const finishedMatches = fixtures.filter(f => f.status === "Finished");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Hero Welcome banner */}
      <section className="glass-panel" style={{ 
        padding: "32px", 
        background: "linear-gradient(135deg, rgba(95, 59, 246, 0.2) 0%, rgba(10, 15, 38, 0.6) 100%)",
        borderLeft: "4px solid var(--color-primary)"
      }}>
        <div style={{ maxWidth: "600px" }}>
          <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>Predict & Win with Real-Time Cryptographic Oracles</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "15px", lineHeight: "1.6" }}>
            AuraPredict connects you directly to TxLINE’s on-chain sports feed. Track brackets, trade outcome shares in fantasy prediction markets, and verify statistics trustlessly.
          </p>
          <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
            <Link href="/bracket" className="btn-primary">
              <Trophy size={16} />
              Knockout Bracket
            </Link>
            <Link href="/markets" className="btn-accent">
              <LineChart size={16} />
              Trade Markets
            </Link>
          </div>
        </div>
      </section>

      {/* Live & Hot sections */}
      <div className="grid-cols-3">
        {/* Live Matches Widget */}
        <div className="glass-panel" style={{ padding: "20px", gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={20} color="var(--color-danger)" />
              <h3>Live Matches</h3>
            </div>
            <Link href="/api/sync" style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "6px", 
              fontSize: "12px", 
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent-dim)",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "var(--color-accent-dim)"
            }}>
              <RefreshCw size={12} />
              Sync API Data
            </Link>
          </div>

          {liveMatches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-dim)" }}>
              <HelpCircle size={36} style={{ marginBottom: "12px", opacity: 0.5 }} />
              <p>No matches are currently live.</p>
              <p style={{ fontSize: "12px", marginTop: "4px" }}>Click Sync API Data to fetch updates from TxLINE.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {liveMatches.map(match => (
                <div key={match.fixtureId} className="glass-panel" style={{ padding: "16px", background: "rgba(255, 255, 255, 0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", color: "var(--color-text-dim)", textTransform: "uppercase", fontWeight: 700 }}>
                      {match.competition}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 700 }}>{match.participant1}</span>
                      <span style={{ color: "var(--color-accent)", fontWeight: 800 }}>{match.score1} - {match.score2}</span>
                      <span style={{ fontSize: "16px", fontWeight: 700 }}>{match.participant2}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                    <span className="status-pill live">LIVE</span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>Min. 78</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hot Markets Widget */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={20} color="var(--color-accent)" />
            <h3>Trending Prediction Markets</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {markets.slice(0, 3).map(m => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "8px", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: 600 }}>{m.name}</h4>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>YES Price:</span>
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-accent)" }}>{m.yesPrice}¢</span>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <Link href={`/markets?marketId=${m.id}`} style={{ flex: 1, textAlign: "center", background: "rgba(95, 59, 246, 0.15)", border: "1px solid rgba(95, 59, 246, 0.3)", padding: "6px", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                    Trade
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming / Finished schedule */}
      <section className="grid-cols-2">
        {/* Upcoming Fixtures */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3>Upcoming Matches</h3>
          {upcomingMatches.length === 0 ? (
            <p style={{ color: "var(--color-text-dim)", fontSize: "14px" }}>No upcoming matches scheduled.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {upcomingMatches.map(match => (
                <div key={match.fixtureId} style={{ display: "flex", justifyContent: "space-between", padding: "12px", borderBottom: "1px solid var(--border-light)" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{match.participant1} vs {match.participant2}</span>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {new Date(match.startTime).toLocaleString()}
                    </div>
                  </div>
                  <span className="status-pill upcoming" style={{ height: "fit-content" }}>UPCOMING</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Finished Matches */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3>Finished Match Archive</h3>
          {finishedMatches.length === 0 ? (
            <p style={{ color: "var(--color-text-dim)", fontSize: "14px" }}>No matches completed yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {finishedMatches.map(match => (
                <div key={match.fixtureId} style={{ display: "flex", justifyContent: "space-between", padding: "12px", borderBottom: "1px solid var(--border-light)" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{match.participant1} vs {match.participant2}</span>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {new Date(match.startTime).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontWeight: 700, color: "var(--color-success)" }}>{match.score1} - {match.score2}</span>
                    <span className="status-pill finished">ENDED</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
export const revalidate = 0; // Force SSR, no static caching
