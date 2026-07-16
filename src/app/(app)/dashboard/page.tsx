import { db, initDb } from "@/db/db";
import { fixtures as fixturesTable, markets as marketsTable } from "@/db/schema";
import Link from "next/link";
import { RefreshCw, Trophy, Activity, Award, LineChart } from "lucide-react";

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
  const finishedMatches = fixtures.filter(f => f.status === "Finished").reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      
      {/* Hero Welcome banner - Skewed sharp console panel */}
      <section 
        className="glass-panel" 
        style={{ 
          padding: "36px 32px", 
          background: "rgba(10, 15, 30, 0.7)", 
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderLeft: "4px solid var(--color-accent)",
          transform: "skewX(-6deg)",
          position: "relative",
          boxShadow: "0 10px 40px -10px rgba(0, 229, 255, 0.08)"
        }}
      >
        <div style={{ transform: "skewX(6deg)", maxWidth: "640px" }}>
          {/* Section Indicator label */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <span style={{ color: "var(--color-accent)", fontWeight: 900, fontFamily: "monospace", fontSize: "12px" }}>/</span>
            <span style={{ 
              fontSize: "10px", 
              fontWeight: 900, 
              color: "rgba(255, 255, 255, 0.4)", 
              textTransform: "uppercase", 
              letterSpacing: "0.1em",
              fontFamily: "var(--font-outfit)"
            }}>
              Solana Sports Engine
            </span>
          </div>

          <h2 style={{ 
            fontSize: "26px", 
            marginBottom: "12px", 
            fontFamily: "var(--font-outfit)", 
            fontWeight: 900, 
            letterSpacing: "-0.5px",
            color: "#fff"
          }}>
            Predict & Win with Real-Time Cryptographic Oracles
          </h2>
          <p style={{ 
            color: "var(--color-text-muted)", 
            fontSize: "14px", 
            lineHeight: "1.6",
            fontFamily: "var(--font-outfit)",
            fontWeight: 500
          }}>
            AuraPredict connects you directly to TxLINE’s on-chain sports feed. Track brackets, trade outcome shares in fantasy prediction markets, and verify statistics trustlessly.
          </p>
          
          {/* Main CTA buttons - Unified component styles (Primary / Secondary) */}
          <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
            <Link href="/bracket" className="btn-primary">
              <Trophy size={14} />
              <span>Knockout Bracket</span>
            </Link>
            <Link href="/markets" className="btn-secondary">
              <LineChart size={14} />
              <span>Trade Markets</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Live & Hot sections */}
      <div className="grid-cols-3">
        {/* Live Matches Widget */}
        <div className="glass-panel" style={{ padding: "24px", gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "var(--color-danger)", fontWeight: 900 }}>/</span>
              <h3 style={{ fontSize: "16px", fontWeight: 900, fontFamily: "var(--font-outfit)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Live Matches</h3>
            </div>
            
            {/* Unified compact secondary button */}
            <Link 
              href="/api/sync" 
              className="btn-secondary" 
              style={{ 
                padding: "6px 14px", 
                fontSize: "11px", 
                transform: "skewX(-6deg)" 
              }}
            >
              <span style={{ transform: "skewX(6deg)", display: "flex", alignItems: "center", gap: "6px" }}>
                <RefreshCw size={11} />
                Sync API Data
              </span>
            </Link>
          </div>

          {liveMatches.length === 0 ? (
            /* Clear, intentional empty matches banner - no error-like graphics */
            <div style={{ 
              textAlign: "center", 
              padding: "36px 20px", 
              background: "rgba(255, 255, 255, 0.01)", 
              border: "1px solid rgba(255, 255, 255, 0.03)" 
            }}>
              <p style={{ 
                fontSize: "11px", 
                fontWeight: 800, 
                color: "rgba(255, 255, 255, 0.4)", 
                fontFamily: "monospace", 
                textTransform: "uppercase", 
                letterSpacing: "0.05em" 
              }}>
                // STATUS: NO LIVE MATCHDAYS ACTIVE
              </p>
              <p style={{ 
                fontSize: "12px", 
                marginTop: "6px", 
                color: "var(--color-text-dim)", 
                fontFamily: "var(--font-outfit)", 
                fontWeight: 500 
              }}>
                There are no tournament matches in play right now. Real-time oracle statistics will feed here upon kickoff.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {liveMatches.map(match => (
                <div key={match.fixtureId} className="glass-panel" style={{ padding: "16px", background: "rgba(255, 255, 255, 0.01)", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "10px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, fontFamily: "monospace" }}>
                      {match.competition}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 800, fontFamily: "var(--font-outfit)" }}>{match.participant1}</span>
                      <span style={{ color: "var(--color-accent)", fontWeight: 900, fontSize: "16px", fontFamily: "monospace" }}>{match.score1} - {match.score2}</span>
                      <span style={{ fontSize: "15px", fontWeight: 800, fontFamily: "var(--font-outfit)" }}>{match.participant2}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                      <span className="status-pill live">LIVE</span>
                      <span style={{ fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "monospace" }}>MATCHDAY ACTIVE</span>
                    </div>
                    <Link
                      href={`/portrait/${match.fixtureId}`}
                      className="btn-secondary"
                      style={{
                        padding: "6px 12px",
                        fontSize: "11px"
                      }}
                    >
                      <Activity size={11} />
                      <span>Portrait</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hot Markets Widget */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "var(--color-accent)", fontWeight: 900 }}>/</span>
            <h3 style={{ fontSize: "16px", fontWeight: 900, fontFamily: "var(--font-outfit)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Hot Markets</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {markets.slice(0, 3).map(m => (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "16px" }}>
                <h4 style={{ fontSize: "13px", fontWeight: 800, fontFamily: "var(--font-outfit)", color: "#fff", lineHeight: "1.4" }}>{m.name}</h4>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "monospace", fontSize: "11px" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>YES BUY IN:</span>
                  <span style={{ fontWeight: 800, color: "var(--color-accent)" }}>{m.yesPrice}¢</span>
                </div>
                
                {/* Unified secondary button styling */}
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <Link 
                    href={`/markets?marketId=${m.id}`} 
                    className="btn-secondary"
                    style={{ 
                      flex: 1, 
                      textAlign: "center", 
                      padding: "8px", 
                      fontSize: "11px", 
                      transform: "skewX(-6deg)"
                    }}
                  >
                    <span style={{ transform: "skewX(6deg)", display: "block" }}>Trade Option</span>
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
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 900 }}>/</span>
            <h3 style={{ fontSize: "16px", fontWeight: 900, fontFamily: "var(--font-outfit)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Upcoming Fixtures</h3>
          </div>
          
          {upcomingMatches.length === 0 ? (
            <p style={{ color: "var(--color-text-dim)", fontSize: "13px", fontFamily: "var(--font-outfit)" }}>No upcoming matches scheduled.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {upcomingMatches.map(match => (
                <div key={match.fixtureId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: "14px", fontFamily: "var(--font-outfit)", color: "#fff" }}>{match.participant1} vs {match.participant2}</span>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px", fontFamily: "monospace" }}>
                      {new Date(match.startTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="status-pill upcoming">UPCOMING</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Finished Matches */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#10b981", fontWeight: 900 }}>/</span>
            <h3 style={{ fontSize: "16px", fontWeight: 900, fontFamily: "var(--font-outfit)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Finished Match Archive</h3>
          </div>
          
          {finishedMatches.length === 0 ? (
            <p style={{ color: "var(--color-text-dim)", fontSize: "13px", fontFamily: "var(--font-outfit)" }}>No matches completed yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {finishedMatches.map(match => (
                <div key={match.fixtureId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: "14px", fontFamily: "var(--font-outfit)", color: "#fff" }}>{match.participant1} vs {match.participant2}</span>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px", fontFamily: "monospace" }}>
                      {new Date(match.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span style={{ fontWeight: 900, color: "var(--color-accent)", fontFamily: "monospace", fontSize: "14px" }}>{match.score1} - {match.score2}</span>
                    <span className="status-pill finished">ENDED</span>
                    <Link
                      href={`/portrait/${match.fixtureId}`}
                      className="btn-secondary"
                      style={{
                        padding: "6px 12px",
                        fontSize: "11px"
                      }}
                    >
                      <Activity size={11} />
                      <span>Portrait</span>
                    </Link>
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
export const revalidate = 0;
