import { db, initDb } from "@/db/db";
import { markets as marketsTable, orders as ordersTable, trades as tradesTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { LineChart, CheckCircle2, TrendingUp, User, ShoppingBag, HelpCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

async function getMarketsData(selectedId: number | null) {
  initDb();
  
  // Fetch all markets
  const list = db.select().from(marketsTable).all();
  
  // Set default selection
  const activeId = selectedId || list[0]?.id || null;
  
  let selectedMarket = null;
  let openOrdersList: any[] = [];
  let tradesList: any[] = [];

  if (activeId) {
    selectedMarket = db.select().from(marketsTable).where(sql`id = ${activeId}`).get() || null;
    openOrdersList = db.select().from(ordersTable).where(sql`market_id = ${activeId} AND status = 'Open'`).all();
    tradesList = db.select().from(tradesTable).where(sql`market_id = ${activeId}`).orderBy(sql`timestamp DESC`).all();
  }

  return {
    markets: list,
    selectedMarket,
    openOrders: openOrdersList,
    trades: tradesList,
    activeId
  };
}

// Server action for placing a trade
async function placeTrade(formData: FormData) {
  "use server";
  
  const walletAddress = "GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE"; // default
  const marketId = Number(formData.get("marketId"));
  const orderType = String(formData.get("orderType")); // 'BuyYes' or 'BuyNo'
  const price = Number(formData.get("price"));
  const sharesCount = Number(formData.get("sharesCount"));

  // Send request to our trade API endpoint
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${baseUrl}/api/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, marketId, orderType, price, sharesCount })
    });
    const data = await res.json();
    console.log("Trade placed:", data);
  } catch (e) {
    console.error("Trade submit failed:", e);
  }

  redirect(`/markets?marketId=${marketId}&success=true`);
}

export default async function MarketsPage({ searchParams }: { searchParams: { marketId?: string, success?: string } }) {
  const selectedId = searchParams.marketId ? Number(searchParams.marketId) : null;
  const { markets, selectedMarket, openOrders, trades, activeId } = await getMarketsData(selectedId);
  const success = searchParams.success === "true";

  return (
    <div className="grid-cols-3" style={{ alignItems: "start", gap: "24px" }}>
      {/* Left Column: Markets List */}
      <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "0px" }}>
        <h3 style={{ fontSize: "18px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800 }}>
          <span style={{ color: "var(--color-accent)", fontWeight: 900 }}>/</span>
          Active Markets
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {markets.map(m => {
            const isActive = m.id === activeId;
            return (
              <Link 
                key={m.id} 
                href={`/markets?marketId=${m.id}`}
                className="glass-panel" 
                style={{ 
                  padding: "16px", 
                  background: isActive ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 255, 255, 0.01)",
                  borderColor: isActive ? "var(--color-accent)" : "var(--border-light)",
                  borderRadius: "0px",
                  transform: "skewX(-12deg)",
                  margin: "0 6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "var(--transition-smooth)"
                }}
              >
                <div style={{ transform: "skewX(12deg)" }}>
                  <h4 style={{ fontSize: "14px", color: isActive ? "#fff" : "var(--color-text-main)", fontWeight: 700 }}>{m.name}</h4>
                  <span style={{ fontSize: "11px", color: "var(--color-text-dim)", textTransform: "uppercase" }}>{m.type}</span>
                </div>
                <div style={{ transform: "skewX(12deg)", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-accent)" }}>{m.yesPrice}¢</span>
                  <span style={{ fontSize: "9px", color: "var(--color-text-dim)" }}>YES</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Market Trading Panel */}
      <div className="glass-panel" style={{ padding: "24px", gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "24px", borderRadius: "0px" }}>
        {!selectedMarket ? (
          <div style={{ textAlign: "center", padding: "80px", color: "var(--color-text-dim)" }}>
            <HelpCircle size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
            <p>No active market selected. Please select a market from the sidebar.</p>
          </div>
        ) : (
          <>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ 
                    background: "rgba(34, 197, 94, 0.15)", 
                    border: "1px solid var(--color-accent)",
                    padding: "3px 8px", 
                    borderRadius: "0px",
                    transform: "skewX(-12deg)",
                    display: "inline-block",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    color: "var(--color-accent)",
                    letterSpacing: "0.5px"
                  }}>
                    <span style={{ display: "inline-block", transform: "skewX(12deg)" }}>
                      {selectedMarket.type.replace("_", " ")}
                    </span>
                  </span>
                  <h2 style={{ fontSize: "24px", marginTop: "8px", fontWeight: 800 }}>{selectedMarket.name}</h2>
                </div>
                {success && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-success)", fontSize: "13px", fontWeight: 600, background: "rgba(16, 185, 129, 0.1)", padding: "6px 12px", borderRadius: "0px", border: "1px solid rgba(16, 185, 129, 0.15)" }}>
                    <CheckCircle2 size={14} />
                    Order Placed
                  </div>
                )}
              </div>
              <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginTop: "8px", lineHeight: "1.5" }}>
                {selectedMarket.description}
              </p>
            </div>

            {/* Price Estimator Widget */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div className="glass-panel" style={{ 
                padding: "20px 16px", 
                textAlign: "center", 
                borderRadius: "0px", 
                transform: "skewX(-12deg)",
                margin: "0 10px",
                background: "linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(10, 15, 38, 0.8) 100%)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderLeft: "4px solid var(--color-accent)"
              }}>
                <div style={{ transform: "skewX(12deg)" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>YES Shares Price</span>
                  <h3 style={{ fontSize: "38px", fontWeight: 900, color: "var(--color-accent)", margin: "6px 0", fontFamily: "monospace" }}>{selectedMarket.yesPrice}¢</h3>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Pays 100¢ if Resolved YES</span>
                </div>
              </div>
              <div className="glass-panel" style={{ 
                padding: "20px 16px", 
                textAlign: "center", 
                borderRadius: "0px", 
                transform: "skewX(-12deg)",
                margin: "0 10px",
                background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(10, 15, 38, 0.8) 100%)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderLeft: "4px solid var(--color-danger)"
              }}>
                <div style={{ transform: "skewX(12deg)" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>NO Shares Price</span>
                  <h3 style={{ fontSize: "38px", fontWeight: 900, color: "var(--color-danger)", margin: "6px 0", fontFamily: "monospace" }}>{selectedMarket.noPrice}¢</h3>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Pays 100¢ if Resolved NO</span>
                </div>
              </div>
            </div>

            {/* Trade Submission Form */}
            <form action={placeTrade} className="glass-panel" style={{ padding: "20px", borderRadius: "0px", background: "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "16px" }}>
              <h4 style={{ fontSize: "16px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
                <ShoppingBag size={16} />
                Trade Shares Order form
              </h4>
              <input type="hidden" name="marketId" value={selectedMarket.id} />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                {/* Order Type */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>I want to predict:</label>
                  <div style={{ transform: "skewX(-12deg)", border: "1px solid var(--border-light)", background: "var(--bg-secondary)", display: "flex", alignItems: "center" }}>
                    <select 
                      name="orderType" 
                      className="premium-select"
                      style={{ 
                        transform: "skewX(12deg)",
                        background: "none",
                        border: "none",
                        width: "100%",
                        padding: "10px 30px 10px 12px"
                      }}
                    >
                      <option value="BuyYes" style={{ background: "#0b0f19" }}>YES (Buy Outcome)</option>
                      <option value="BuyNo" style={{ background: "#0b0f19" }}>NO (Buy Opposition)</option>
                    </select>
                  </div>
                </div>

                {/* Price (1-99 cents) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Limit Price (cents per share):</label>
                  <div style={{ transform: "skewX(-12deg)", border: "1px solid var(--border-light)", background: "var(--bg-secondary)", padding: "0 10px" }}>
                    <input 
                      type="number" 
                      name="price" 
                      min="1" 
                      max="99" 
                      defaultValue={selectedMarket.yesPrice}
                      style={{ 
                        transform: "skewX(12deg)",
                        background: "none", 
                        color: "#fff", 
                        border: "none", 
                        width: "100%",
                        padding: "10px 0",
                        outline: "none"
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Quantity (shares count):</label>
                  <div style={{ transform: "skewX(-12deg)", border: "1px solid var(--border-light)", background: "var(--bg-secondary)", padding: "0 10px" }}>
                    <input 
                      type="number" 
                      name="sharesCount" 
                      min="1" 
                      defaultValue="10"
                      style={{ 
                        transform: "skewX(12deg)",
                        background: "none", 
                        color: "#fff", 
                        border: "none", 
                        width: "100%",
                        padding: "10px 0",
                        outline: "none"
                      }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button 
                  type="submit" 
                  className="btn-secondary" 
                  style={{ 
                    minWidth: "150px", 
                    borderRadius: "0px", 
                    transform: "skewX(-12deg)", 
                    background: "var(--color-accent-dim)", 
                    border: "1px solid var(--color-accent)", 
                    color: "var(--color-accent)",
                    height: "38px"
                  }}
                >
                  <span style={{ display: "inline-block", transform: "skewX(12deg)" }}>Submit Order</span>
                </button>
              </div>
            </form>

            {/* Trade History logs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Open Book Orders */}
              <div className="glass-panel" style={{ padding: "16px", background: "rgba(0,0,0,0.05)", borderRadius: "0px" }}>
                <h4 style={{ fontSize: "14px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px", marginBottom: "12px", fontWeight: 700 }}>
                  <span style={{ color: "var(--color-accent)", marginRight: "6px" }}>/</span>Active Order Book
                </h4>
                {openOrders.length === 0 ? (
                  <p style={{ color: "var(--color-text-dim)", fontSize: "12px" }}>No active limit orders listed.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {openOrders.map(order => (
                      <div key={order.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderBottom: "1px dashed var(--border-light)", paddingBottom: "6px" }}>
                        <span style={{ color: order.orderType.includes("Yes") ? "var(--color-accent)" : "var(--color-danger)" }}>
                          {order.orderType}
                        </span>
                        <span>{order.sharesRemaining} shares @ {order.price}¢</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Executed Trades */}
              <div className="glass-panel" style={{ padding: "16px", background: "rgba(0,0,0,0.05)", borderRadius: "0px" }}>
                <h4 style={{ fontSize: "14px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px", marginBottom: "12px", fontWeight: 700 }}>
                  <span style={{ color: "var(--color-accent)", marginRight: "6px" }}>/</span>Match Execution History
                </h4>
                {trades.length === 0 ? (
                  <p style={{ color: "var(--color-text-dim)", fontSize: "12px" }}>No matches traded yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {trades.slice(0, 5).map(t => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", borderBottom: "1px dashed var(--border-light)", paddingBottom: "6px" }}>
                        <span style={{ color: "var(--color-text-muted)" }}>
                          {t.sharesCount} shares
                        </span>
                        <span style={{ fontWeight: 700, color: "var(--color-accent)" }}>@{t.price}¢</span>
                        <span style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
export const revalidate = 0;
