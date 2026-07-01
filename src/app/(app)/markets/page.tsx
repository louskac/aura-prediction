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
    <div className="grid-cols-3" style={{ alignItems: "start" }}>
      {/* Left Column: Markets List */}
      <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ fontSize: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
          <TrendingUp size={18} color="var(--color-accent)" />
          Active Markets
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {markets.map(m => {
            const isActive = m.id === activeId;
            return (
              <Link 
                key={m.id} 
                href={`/markets?marketId=${m.id}`}
                className="glass-panel" 
                style={{ 
                  padding: "16px", 
                  background: isActive ? "rgba(95, 59, 246, 0.12)" : "rgba(255, 255, 255, 0.01)",
                  borderColor: isActive ? "var(--color-primary-light)" : "var(--border-light)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <h4 style={{ fontSize: "14px", color: isActive ? "#fff" : "var(--color-text-main)" }}>{m.name}</h4>
                  <span style={{ fontSize: "11px", color: "var(--color-text-dim)", textTransform: "uppercase" }}>{m.type}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-accent)" }}>{m.yesPrice}¢</span>
                  <span style={{ fontSize: "9px", color: "var(--color-text-dim)" }}>YES</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Market Trading Panel */}
      <div className="glass-panel" style={{ padding: "24px", gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "24px" }}>
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
                  <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--color-primary-light)" }}>
                    {selectedMarket.type.replace("_", " ")}
                  </span>
                  <h2 style={{ fontSize: "24px", marginTop: "4px" }}>{selectedMarket.name}</h2>
                </div>
                {success && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-success)", fontSize: "13px", fontWeight: 600, background: "rgba(16, 185, 129, 0.1)", padding: "6px 12px", borderRadius: "6px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="glass-panel" style={{ padding: "16px", textAlign: "center", borderLeft: "4px solid var(--color-accent)" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-dim)", textTransform: "uppercase", fontWeight: 600 }}>YES Shares Price</span>
                <h3 style={{ fontSize: "36px", color: "var(--color-accent)", margin: "8px 0" }}>{selectedMarket.yesPrice}¢</h3>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Pays 100¢ if Resolved YES</span>
              </div>
              <div className="glass-panel" style={{ padding: "16px", textAlign: "center", borderLeft: "4px solid var(--color-danger)" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-dim)", textTransform: "uppercase", fontWeight: 600 }}>NO Shares Price</span>
                <h3 style={{ fontSize: "36px", color: "var(--color-danger)", margin: "8px 0" }}>{selectedMarket.noPrice}¢</h3>
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Pays 100¢ if Resolved NO</span>
              </div>
            </div>

            {/* Trade Submission Form */}
            <form action={placeTrade} className="glass-panel" style={{ padding: "20px", background: "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "16px" }}>
              <h4 style={{ fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShoppingBag size={16} />
                Trade Shares Order form
              </h4>
              <input type="hidden" name="marketId" value={selectedMarket.id} />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                {/* Order Type */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>I want to predict:</label>
                  <select 
                    name="orderType" 
                    style={{ 
                      background: "var(--bg-secondary)", 
                      color: "#fff", 
                      border: "1px solid var(--border-light)", 
                      borderRadius: "8px", 
                      padding: "10px",
                      outline: "none"
                    }}
                  >
                    <option value="BuyYes">YES (Buy Outcome)</option>
                    <option value="BuyNo">NO (Buy Opposition)</option>
                  </select>
                </div>

                {/* Price (1-99 cents) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Limit Price (cents per share):</label>
                  <input 
                    type="number" 
                    name="price" 
                    min="1" 
                    max="99" 
                    defaultValue={selectedMarket.yesPrice}
                    style={{ 
                      background: "var(--bg-secondary)", 
                      color: "#fff", 
                      border: "1px solid var(--border-light)", 
                      borderRadius: "8px", 
                      padding: "10px",
                      outline: "none"
                    }}
                    required
                  />
                </div>

                {/* Quantity */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Quantity (shares count):</label>
                  <input 
                    type="number" 
                    name="sharesCount" 
                    min="1" 
                    defaultValue="10"
                    style={{ 
                      background: "var(--bg-secondary)", 
                      color: "#fff", 
                      border: "1px solid var(--border-light)", 
                      borderRadius: "8px", 
                      padding: "10px",
                      outline: "none"
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn-primary" style={{ minWidth: "150px" }}>
                  Submit Order
                </button>
              </div>
            </form>

            {/* Trade History logs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Open Book Orders */}
              <div className="glass-panel" style={{ padding: "16px", background: "rgba(0,0,0,0.05)" }}>
                <h4 style={{ fontSize: "14px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px", marginBottom: "12px" }}>Active Order Book</h4>
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
              <div className="glass-panel" style={{ padding: "16px", background: "rgba(0,0,0,0.05)" }}>
                <h4 style={{ fontSize: "14px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px", marginBottom: "12px" }}>Match Execution History</h4>
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
