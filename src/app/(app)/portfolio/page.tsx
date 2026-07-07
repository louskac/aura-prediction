import { db, initDb } from "@/db/db";
import { shares as sharesTable, markets as marketsTable, bracketPredictions as predictionsTable, orders as ordersTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { FolderHeart, Award, Landmark, Wallet, CheckCircle } from "lucide-react";

async function getPortfolioData() {
  initDb();
  const walletAddress = "GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE";

  // 1. Fetch shares holdings
  const sharesList = db.select().from(sharesTable).where(sql`wallet_address = ${walletAddress}`).all();
  const marketsList = db.select().from(marketsTable).all();
  
  // Map market info to shares
  const holdings = sharesList.map(s => {
    const market = marketsList.find(m => m.id === s.marketId);
    return {
      ...s,
      marketName: market?.name || "Unknown Market",
      yesPrice: market?.yesPrice || 50,
      noPrice: market?.noPrice || 50,
      status: market?.status || "Active"
    };
  }).filter(h => h.yesShares > 0 || h.noShares > 0);

  // 2. Fetch bracket predictions count
  const bracketCount = db.select({ count: sql`count(*)` }).from(predictionsTable).where(sql`wallet_address = ${walletAddress}`).get();
  const predictedCount = (bracketCount as any)?.["count(*)"] || 0;

  // 3. Fetch active orders
  const activeOrders = db.select().from(ordersTable).where(sql`wallet_address = ${walletAddress} AND status = 'Open'`).all();

  return {
    holdings,
    predictedCount,
    activeOrdersCount: activeOrders.length,
    activeOrders,
    markets: marketsList
  };
}

export default async function PortfolioPage() {
  const { holdings, predictedCount, activeOrdersCount, activeOrders, markets } = await getPortfolioData();

  // Calculate total portfolio value (YES shares valued at YES price, NO shares valued at NO price)
  let totalValue = 0;
  holdings.forEach(h => {
    totalValue += (h.yesShares * h.yesPrice) + (h.noShares * h.noPrice);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Portfolio overview cards */}
      <section className="grid-cols-3">
        <div className="glass-panel" style={{ 
          padding: "20px 24px", 
          display: "flex", 
          alignItems: "center", 
          gap: "16px", 
          borderRadius: "0px",
          transform: "skewX(-12deg)",
          margin: "0 10px",
          background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(10, 15, 38, 0.8) 100%)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderLeft: "4px solid var(--color-accent)" 
        }}>
          <div style={{ transform: "skewX(12deg)", display: "flex", alignItems: "center", gap: "16px" }}>
            <Landmark size={28} color="var(--color-accent)" />
            <div>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Portfolio Valuation</span>
              <h3 style={{ fontSize: "24px", marginTop: "4px", fontWeight: 800 }}>{(totalValue / 100).toFixed(2)} pts</h3>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ 
          padding: "20px 24px", 
          display: "flex", 
          alignItems: "center", 
          gap: "16px", 
          borderRadius: "0px",
          transform: "skewX(-12deg)",
          margin: "0 10px",
          background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(10, 15, 38, 0.8) 100%)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderLeft: "4px solid var(--color-accent)" 
        }}>
          <div style={{ transform: "skewX(12deg)", display: "flex", alignItems: "center", gap: "16px" }}>
            <Award size={28} color="var(--color-accent)" />
            <div>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Bracket Predictions Locked</span>
              <h3 style={{ fontSize: "24px", marginTop: "4px", fontWeight: 800 }}>{predictedCount} picks</h3>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ 
          padding: "20px 24px", 
          display: "flex", 
          alignItems: "center", 
          gap: "16px", 
          borderRadius: "0px",
          transform: "skewX(-12deg)",
          margin: "0 10px",
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(10, 15, 38, 0.8) 100%)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderLeft: "4px solid var(--color-danger)" 
        }}>
          <div style={{ transform: "skewX(12deg)", display: "flex", alignItems: "center", gap: "16px" }}>
            <FolderHeart size={28} color="var(--color-danger)" />
            <div>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>Active Limit Orders</span>
              <h3 style={{ fontSize: "24px", marginTop: "4px", fontWeight: 800 }}>{activeOrdersCount} open</h3>
            </div>
          </div>
        </div>
      </section>

      <div className="grid-cols-3" style={{ alignItems: "start" }}>
        {/* Left Span: Share Holdings */}
        <div className="glass-panel" style={{ padding: "24px", gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "20px", borderRadius: "0px" }}>
          <h3 style={{ fontSize: "18px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800 }}>
            <span style={{ color: "var(--color-accent)", fontWeight: 900 }}>/</span>
            Share Holdings Portfolio
          </h3>

          {holdings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--color-text-dim)" }}>
              <FolderHeart size={36} style={{ marginBottom: "12px", opacity: 0.4 }} />
              <p>You don't hold any prediction market shares yet.</p>
              <p style={{ fontSize: "12px", marginTop: "4px" }}>Head over to the Fantasy Markets tab to place a trade.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {holdings.map(h => (
                <div key={h.id} className="glass-panel" style={{ 
                  padding: "16px", 
                  background: "rgba(255,255,255,0.01)", 
                  borderRadius: "0px",
                  transform: "skewX(-12deg)",
                  margin: "0 8px",
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center" 
                }}>
                  <div style={{ transform: "skewX(12deg)" }}>
                    <h4 style={{ fontSize: "15px", fontWeight: 700 }}>{h.marketName}</h4>
                    <div style={{ display: "flex", gap: "12px", marginTop: "6px", fontSize: "12px", color: "var(--color-text-muted)" }}>
                      {h.yesShares > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle size={12} color="var(--color-accent)" />
                          {h.yesShares} YES shares
                        </span>
                      )}
                      {h.noShares > 0 && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle size={12} color="var(--color-danger)" />
                          {h.noShares} NO shares
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ transform: "skewX(12deg)", textAlign: "right" }}>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-accent)" }}>
                      {(((h.yesShares * h.yesPrice) + (h.noShares * h.noPrice)) / 100).toFixed(2)} pts
                    </span>
                    <div style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>current estimate</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active Limit Orders */}
        <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "0px" }}>
          <h3 style={{ fontSize: "18px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px", marginBottom: "12px", fontWeight: 800 }}>
            <span style={{ color: "var(--color-accent)", marginRight: "6px" }}>/</span>Open Limit Orders
          </h3>
          {activeOrders.length === 0 ? (
            <p style={{ color: "var(--color-text-dim)", fontSize: "13px" }}>No active open orders.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activeOrders.map(o => {
                const marketName = markets.find(m => m.id === o.marketId)?.name || "Market";
                return (
                  <div key={o.id} style={{ display: "flex", flexDirection: "column", gap: "4px", borderBottom: "1px solid var(--border-light)", paddingBottom: "10px" }}>
                    <h4 style={{ fontSize: "13px", fontWeight: 700 }}>{marketName}</h4>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ color: o.orderType.includes("Yes") ? "var(--color-accent)" : "var(--color-danger)" }}>
                        {o.orderType}
                      </span>
                      <span>{o.sharesRemaining} shares @ {o.price}¢</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export const revalidate = 0;
