"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ShoppingBag, 
  HelpCircle, 
  Layers, 
  Zap,
  Terminal,
  Info,
  TrendingUp,
  Activity,
  AlertTriangle,
  Award
} from "lucide-react";

// Team flag codes for FlagCDN
const TEAM_FLAGS: Record<string, string> = {
  France: "fr",
  Senegal: "sn",
  Germany: "de",
  Paraguay: "py",
  Brazil: "br",
  Japan: "jp",
  "Ivory Coast": "ci",
  Norway: "no",
  Mexico: "mx",
  Ecuador: "ec",
  England: "gb",
  "Congo DR": "cd",
  "DR Congo": "cd",
  Spain: "es",
  Belgium: "be",
  Portugal: "pt",
  Switzerland: "ch",
  Vietnam: "vn",
  Argentina: "ar",
  Sweden: "se",
  Morocco: "ma",
  Croatia: "hr",
  Austria: "at",
  "South Africa": "za",
  USA: "us",
  "United States": "us",
  "Bosnia and Herzegovina": "ba",
  "Bosnia & Herzegovina": "ba",
  "Cape Verde": "cv",
  Australia: "au",
  Egypt: "eg",
  Algeria: "dz",
  Colombia: "co",
  Ghana: "gh",
  Myanmar: "mm",
  Netherlands: "nl",
  "New Zealand": "nz",
  India: "in",
  Liechtenstein: "li",
  Gibraltar: "gi",
  Canada: "ca",
};

interface Fixture {
  fixtureId: number;
  participant1: string;
  participant2: string;
  status: string;
  score1: number | null;
  score2: number | null;
  startTime: number;
  competition: string;
}

interface TraditionalMarket {
  id: number;
  name: string;
  description: string;
  type: string;
  yesPrice: number;
  noPrice: number;
  status: string;
  fixtureId?: number | null;
}

interface WalletState {
  walletAddress: string;
  cashBalance: number;
  solBalance: number;
}

interface UserShares {
  marketId: number;
  yesShares: number;
  noShares: number;
}

interface SolanaMarketsClientProps {
  walletAddress: string;
  initialWallet: WalletState;
  fixtures: Fixture[];
  traditionalMarkets: TraditionalMarket[];
  initialShares: UserShares[];
  submitTradeAction: (formData: FormData) => Promise<void>;
  openOrders: any[];
  executedTrades: any[];
  activeTraditionalId: number | null;
}

export default function SolanaMarketsClient({
  walletAddress,
  initialWallet,
  fixtures,
  traditionalMarkets,
  initialShares,
  submitTradeAction,
  openOrders,
  executedTrades,
  activeTraditionalId
}: SolanaMarketsClientProps) {
  // Tab selector: 'solana' (Solana AMM) or 'traditional' (Aura LOB)
  const [activeTab, setActiveTab] = useState<"solana" | "traditional">("solana");
  
  // Wallet state
  const [wallet, setWallet] = useState<WalletState>(initialWallet);
  const [userShares, setUserShares] = useState<UserShares[]>(initialShares);

  // Helper to sort fixtures: InPlay (LIVE) first, then NotStarted (Upcoming), then Finished (Ended)
  const getSortedFixtures = (list: Fixture[]) => {
    return [...list].sort((a, b) => {
      const statusOrder: Record<string, number> = {
        InPlay: 1,
        NotStarted: 2,
        Finished: 3
      };
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      if (a.status === "Finished") return b.startTime - a.startTime;
      return a.startTime - b.startTime;
    });
  };

  const sortedFixtures = getSortedFixtures(fixtures);

  // Solana prediction market state
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(sortedFixtures[0] || null);
  const [tradeOutcome, setTradeOutcome] = useState<"YES" | "NO">("YES");
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [tradeAmount, setTradeAmount] = useState<number>(50); // in CASH dollars default
  const [tradeError, setTradeError] = useState<string | null>(null);

  // Transaction Ledger console outputs
  const [ledgerLogs, setLedgerLogs] = useState<string[]>([
    "user@solana-devnet:~$ ready for transaction routing."
  ]);
  const [isTxPending, setIsTxPending] = useState<boolean>(false);
  const [txSuccessSig, setTxSuccessSig] = useState<string | null>(null);

  // Real-time market prices tick simulator
  const [marketPrices, setMarketPrices] = useState<Record<number, { yesPrice: number; noPrice: number; probability: number }>>({});
  
  // Dynamic pricing algorithm for main Solana AMM outcomes
  const computePrices = () => {
    const prices: Record<number, { yesPrice: number; noPrice: number; probability: number }> = {};
    
    fixtures.forEach(f => {
      const baseProb = 50; // simple baseline
      if (f.status === "Finished") {
        const g1 = f.score1 ?? 0;
        const g2 = f.score2 ?? 0;
        if (g1 > g2) {
          prices[f.fixtureId] = { yesPrice: 100, noPrice: 0, probability: 100 };
        } else {
          prices[f.fixtureId] = { yesPrice: 0, noPrice: 100, probability: 0 };
        }
      } else if (f.status === "InPlay") {
        const diffMs = Date.now() - f.startTime;
        const elapsedMin = Math.min(90, Math.max(1, Math.floor(diffMs / 60000)));
        const scoreDiff = (f.score1 ?? 0) - (f.score2 ?? 0);
        const timeFactor = Math.floor(Date.now() / 15000);
        const momentumVal = Math.sin((f.fixtureId + timeFactor) * 0.7) * 8;
        const timeDecay = 1 - elapsedMin / 90;
        const adjustedProb = baseProb + scoreDiff * 25 * timeDecay + momentumVal;
        const prob = Math.round(Math.min(95, Math.max(5, adjustedProb)));
        
        prices[f.fixtureId] = {
          yesPrice: Math.min(99, Math.max(1, prob + 1)),
          noPrice: Math.min(99, Math.max(1, (100 - prob) + 1)),
          probability: prob
        };
      } else {
        const hourFactor = Math.floor(Date.now() / 3600000);
        const sentiment = Math.sin((f.fixtureId + hourFactor) * 0.25) * 4;
        const prob = Math.round(Math.min(90, Math.max(10, baseProb + sentiment)));
        prices[f.fixtureId] = {
          yesPrice: Math.min(99, Math.max(1, prob + 1)),
          noPrice: Math.min(99, Math.max(1, (100 - prob) + 1)),
          probability: prob
        };
      }
    });

    setMarketPrices(prices);
  };

  // Run initial prices & set interval for live ticking
  useEffect(() => {
    computePrices();
    const interval = setInterval(computePrices, 10000);
    
    if (sortedFixtures.length > 0 && !selectedFixture) {
      setSelectedFixture(sortedFixtures[0]);
    }
    
    return () => clearInterval(interval);
  }, [fixtures]);

  // Fetch updated wallet balance
  const refreshWallet = async () => {
    try {
      const res = await fetch(`/api/solana-markets/wallet?walletAddress=${walletAddress}`);
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
      }
    } catch (e) {}
  };

  // Handle CASH Faucet
  const handleFaucet = async () => {
    setIsTxPending(true);
    setLedgerLogs(["[Faucet] Contacting devnet dispenser program...", "Signing transaction with local keypair..."]);
    try {
      const res = await fetch("/api/solana-markets/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress })
      });
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
        animateLedgerLogs(data.logs);
      } else {
        setLedgerLogs([`[ERROR] Faucet claim failed: ${data.error}`]);
      }
    } catch (e: any) {
      setLedgerLogs([`[ERROR] Server communication error: ${e.message}`]);
    } finally {
      setIsTxPending(false);
    }
  };

  // Handle Trade submission for main Solana AMM markets
  const handleSolanaTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTxPending || !selectedFixture) return;

    setIsTxPending(true);
    setTradeError(null);
    setTxSuccessSig(null);

    setLedgerLogs([
      "[DFlow] Connecting to DFlow Routing Engine...",
      `[DFlow] Calculating RFQ quote for ${tradeType} ${tradeAmount} ${tradeOutcome === "YES" ? "YES" : "NO"}...`
    ]);

    const amountInCents = tradeType === "BUY" ? Math.floor(tradeAmount * 100) : tradeAmount;

    try {
      const res = await fetch("/api/solana-markets/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          fixtureId: selectedFixture.fixtureId,
          outcome: tradeOutcome,
          tradeType,
          amount: amountInCents
        })
      });
      const data = await res.json();
      if (data.success) {
        setTxSuccessSig(data.txSig);
        animateLedgerLogs(data.logs);
        await refreshWallet();
        updateLocalShares(selectedFixture.fixtureId, tradeOutcome, tradeType, data.remainingShares);
      } else {
        setTradeError(data.error);
        setLedgerLogs([`[ERROR] Transaction aborted: ${data.error}`]);
      }
    } catch (e: any) {
      setTradeError(e.message);
      setLedgerLogs([`[ERROR] Network failure: ${e.message}`]);
    } finally {
      setIsTxPending(false);
    }
  };

  // Handle redeeming winning shares
  const handleRedeem = async (subFixtureId: number) => {
    setIsTxPending(true);
    setLedgerLogs([
      "[prediCt] Contacting operator contract for resolution claims...",
      "Signing authorization request..."
    ]);
    try {
      const res = await fetch("/api/solana-markets/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, fixtureId: subFixtureId })
      });
      const data = await res.json();
      if (data.success) {
        animateLedgerLogs(data.logs);
        await refreshWallet();
        
        // Wipe local shares
        setUserShares(prev => prev.map(s => {
          const market = traditionalMarkets.find(m => m.fixtureId === subFixtureId);
          const mId = market ? market.id : subFixtureId;
          if (s.marketId === mId) {
            return { ...s, yesShares: 0, noShares: 0 };
          }
          return s;
        }));
      } else {
        setLedgerLogs([`[ERROR] Redemption failed: ${data.error}`]);
      }
    } catch (e: any) {
      setLedgerLogs([`[ERROR] Network error: ${e.message}`]);
    } finally {
      setIsTxPending(false);
    }
  };

  const updateLocalShares = (fixtureId: number, outcome: "YES" | "NO", type: "BUY" | "SELL", sharesCount: number) => {
    const market = traditionalMarkets.find(m => m.fixtureId === fixtureId);
    const marketId = market ? market.id : fixtureId;

    setUserShares(prev => {
      const existing = prev.find(s => s.marketId === marketId);
      if (existing) {
        return prev.map(s => {
          if (s.marketId === marketId) {
            const add = type === "BUY" ? sharesCount : -sharesCount;
            return {
              ...s,
              yesShares: outcome === "YES" ? Math.max(0, s.yesShares + add) : s.yesShares,
              noShares: outcome === "NO" ? Math.max(0, s.noShares + add) : s.noShares
            };
          }
          return s;
        });
      } else {
        return [...prev, {
          marketId,
          yesShares: outcome === "YES" && type === "BUY" ? sharesCount : 0,
          noShares: outcome === "NO" && type === "BUY" ? sharesCount : 0
        }];
      }
    });
  };

  const animateLedgerLogs = (logs: string[]) => {
    setLedgerLogs([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        setLedgerLogs(prev => [...prev, logs[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);
  };

  const getTeamFlag = (team: string) => {
    const code = TEAM_FLAGS[team];
    if (code) {
      return `https://flagcdn.com/w40/${code}.png`;
    }
    return null;
  };

  const getSharesForFixture = (fixtureId: number) => {
    const market = traditionalMarkets.find(m => m.fixtureId === fixtureId);
    const mId = market ? market.id : fixtureId;
    const sh = userShares.find(s => s.marketId === mId);
    return sh ? { yesShares: sh.yesShares, noShares: sh.noShares } : { yesShares: 0, noShares: 0 };
  };

  const currentPrices = selectedFixture ? (marketPrices[selectedFixture.fixtureId] || { yesPrice: 50, noPrice: 50, probability: 50 }) : { yesPrice: 50, noPrice: 50, probability: 50 };
  const currentHoldings = selectedFixture ? getSharesForFixture(selectedFixture.fixtureId) : { yesShares: 0, noShares: 0 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Top Header & Tab Switcher */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: "12px" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          <button 
            onClick={() => setActiveTab("solana")}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "solana" ? "3px solid var(--color-accent)" : "3px solid transparent",
              color: activeTab === "solana" ? "#fff" : "var(--color-text-dim)",
              padding: "8px 16px",
              fontSize: "15px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
          >
            <Zap size={15} style={{ color: activeTab === "solana" ? "var(--color-accent)" : "var(--color-text-dim)" }} />
            Solana AMM Markets (World.xyz)
          </button>
          
          <button 
            onClick={() => setActiveTab("traditional")}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === "traditional" ? "3px solid var(--color-accent)" : "3px solid transparent",
              color: activeTab === "traditional" ? "#fff" : "var(--color-text-dim)",
              padding: "8px 16px",
              fontSize: "15px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s"
            }}
          >
            <Layers size={15} style={{ color: activeTab === "traditional" ? "var(--color-accent)" : "var(--color-text-dim)" }} />
            Aura Limit Order Book
          </button>
        </div>
      </div>

      {/* Main content body based on selected tab */}
      {activeTab === "solana" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "28px", alignItems: "start" }}>
          
          {/* LEFT COLUMN: Active Prediction Markets List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Volume Dashboard Indicator */}
            <div 
              className="glass-panel" 
              style={{ 
                padding: "20px 24px", 
                borderLeft: "4px solid var(--color-accent)",
                borderRadius: "0px",
                transform: "skewX(-12deg)",
                margin: "0 10px",
                background: "linear-gradient(90deg, rgba(34, 197, 94, 0.08) 0%, rgba(10, 15, 38, 0.8) 100%)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ transform: "skewX(12deg)" }}>
                <span style={{ fontSize: "10px", color: "var(--color-accent)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px" }}>
                  // LIVE SOLANA PREDICTION FEED
                </span>
                <h3 style={{ fontSize: "20px", color: "#fff", fontWeight: 800, marginTop: "4px" }}>
                  Soccer Prediction Markets
                </h3>
              </div>
              <div style={{ transform: "skewX(12deg)", textAlign: "right" }}>
                <span style={{ fontSize: "22px", fontWeight: 900, color: "var(--color-accent)", fontFamily: "monospace" }}>
                  $327,850
                </span>
                <div style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>USDC Traded Today</div>
              </div>
            </div>

            {/* Match Feed list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {sortedFixtures.map(f => {
                const price = marketPrices[f.fixtureId] || { yesPrice: 50, noPrice: 50, probability: 50 };
                const isSelected = selectedFixture?.fixtureId === f.fixtureId;
                const sh = getSharesForFixture(f.fixtureId);

                return (
                  <div 
                    key={f.fixtureId}
                    className="glass-panel"
                    onClick={() => setSelectedFixture(f)}
                    style={{
                      padding: "20px",
                      borderColor: isSelected ? "var(--color-accent)" : "var(--border-light)",
                      borderRadius: "0px",
                      transform: "skewX(-12deg)",
                      margin: "0 10px",
                      background: isSelected ? "rgba(34, 197, 94, 0.05)" : "rgba(10, 15, 38, 0.45)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                      transition: "all 0.2s",
                      cursor: "pointer"
                    }}
                  >
                    {/* Unslanted content container */}
                    <div style={{ transform: "skewX(12deg)", display: "flex", flexDirection: "column", gap: "14px" }}>
                      
                      {/* Header: Comp + Status */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                            {f.competition}
                          </span>
                          <span style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>|</span>
                          <span style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>
                            Market ID: {f.fixtureId}
                          </span>
                        </div>
                        <span 
                          style={{ 
                            fontSize: "10px", 
                            fontWeight: 900, 
                            color: f.status === "InPlay" ? "var(--color-danger)" : (f.status === "Finished" ? "var(--color-success)" : "var(--color-text-dim)"),
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: f.status === "InPlay" ? "rgba(239, 68, 68, 0.15)" : (f.status === "Finished" ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.02)"),
                            padding: "2px 8px",
                            borderRadius: "0px",
                            border: f.status === "InPlay" ? "1px solid var(--color-danger)" : (f.status === "Finished" ? "1px solid var(--color-success)" : "1px solid var(--border-light)")
                          }}
                        >
                          {f.status === "InPlay" && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--color-danger)", display: "inline-block", animation: "pulse 1.5s infinite" }}></span>}
                          {f.status === "InPlay" ? "LIVE" : (f.status === "Finished" ? "ENDED" : "UPCOMING")}
                        </span>
                      </div>

                      {/* Teams block */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
                        {/* Team 1 */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {getTeamFlag(f.participant1) ? (
                            <img src={getTeamFlag(f.participant1)!} alt={f.participant1} style={{ width: "24px", height: "16px", objectFit: "cover", borderRadius: "2px" }} />
                          ) : (
                            <span style={{ fontSize: "16px" }}>🏳️</span>
                          )}
                          <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff" }}>{f.participant1}</span>
                        </div>

                        {/* Versus / Score */}
                        <div style={{ padding: "0 16px", fontFamily: "monospace", fontWeight: 900 }}>
                          {f.status === "NotStarted" ? (
                            <span style={{ color: "var(--color-text-dim)", fontSize: "12px" }}>VS</span>
                          ) : (
                            <span style={{ color: f.status === "InPlay" ? "var(--color-danger)" : "#fff", fontSize: "15px" }}>
                              {f.score1} - {f.score2}
                            </span>
                          )}
                        </div>

                        {/* Team 2 */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "flex-end" }}>
                          <span style={{ fontSize: "14px", fontWeight: 800, color: "#fff" }}>{f.participant2}</span>
                          {getTeamFlag(f.participant2) ? (
                            <img src={getTeamFlag(f.participant2)!} alt={f.participant2} style={{ width: "24px", height: "16px", objectFit: "cover", borderRadius: "2px" }} />
                          ) : (
                            <span style={{ fontSize: "16px" }}>🏳️</span>
                          )}
                        </div>
                      </div>

                      {/* Contract payouts / prices */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px", fontSize: "12px" }}>
                        <div style={{ display: "flex", gap: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ color: "var(--color-text-dim)" }}>YES:</span>
                            <span style={{ color: "var(--color-accent)", fontWeight: 800 }}>{price.yesPrice}¢</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ color: "var(--color-text-dim)" }}>NO:</span>
                            <span style={{ color: "var(--color-danger)", fontWeight: 800 }}>{price.noPrice}¢</span>
                          </div>
                        </div>
                        {f.status === "Finished" && (sh.yesShares > 0 || sh.noShares > 0) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRedeem(f.fixtureId);
                            }}
                            style={{
                              background: "rgba(16, 185, 129, 0.15)",
                              border: "1px solid var(--color-success)",
                              color: "var(--color-success)",
                              fontSize: "10px",
                              padding: "2px 8px",
                              cursor: "pointer",
                              fontWeight: 900
                            }}
                          >
                            CLAIM CASH WINNINGS
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Selected Match AMM Trade Desk */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Wallet Balance widget */}
            <div 
              className="glass-panel" 
              style={{ 
                padding: "20px", 
                borderRadius: "0px",
                transform: "skewX(-12deg)",
                margin: "0 10px",
                background: "rgba(10, 15, 38, 0.65)"
              }}
            >
              <div style={{ transform: "skewX(12deg)", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "9px", color: "var(--color-text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      // ACCOUNT IDENTITY (SOLANA DEVNET)
                    </span>
                    <h4 style={{ fontSize: "14px", color: "#fff", fontWeight: 800, fontFamily: "monospace", marginTop: "2px" }}>
                      {wallet.walletAddress.substring(0, 8)}...{wallet.walletAddress.substring(wallet.walletAddress.length - 8)}
                    </h4>
                  </div>
                  <button
                    onClick={handleFaucet}
                    className="btn-secondary"
                    disabled={isTxPending}
                    style={{
                      padding: "6px 12px",
                      fontSize: "10px",
                      transform: "skewX(-12deg)",
                      background: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid var(--color-accent)",
                      color: "var(--color-accent)",
                      borderRadius: "0px"
                    }}
                  >
                    <span style={{ transform: "skewX(12deg)", display: "block" }}>Claim Faucet</span>
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>CASH STABLECOIN</span>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--color-accent)", fontFamily: "monospace", marginTop: "2px" }}>
                      ${(wallet.cashBalance / 100).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>SOL BALANCE</span>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: "#fff", fontFamily: "monospace", marginTop: "2px" }}>
                      {(wallet.solBalance / 1e9).toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Solana AMM Swap Desk */}
            {selectedFixture ? (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: "24px", 
                  minHeight: "350px", 
                  borderRadius: "0px",
                  transform: "skewX(-12deg)",
                  margin: "0 10px",
                  background: "rgba(10, 15, 38, 0.5)"
                }}
              >
                <div style={{ transform: "skewX(12deg)", display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div>
                    <span style={{ fontSize: "9px", color: "var(--color-accent)", fontWeight: 900, textTransform: "uppercase" }}>
                      // JANUSFI AMM TRADE DESK
                    </span>
                    <h4 style={{ fontSize: "16px", fontWeight: 800, color: "#fff", marginTop: "4px" }}>
                      {selectedFixture.participant1} vs {selectedFixture.participant2}
                    </h4>
                    <p style={{ fontSize: "11px", color: "var(--color-text-dim)", marginTop: "2px" }}>
                      AMM Vault pools contract trading on devnet using CASH collateral.
                    </p>
                  </div>

                  <form onSubmit={handleSolanaTrade} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    
                    {/* BUY / SELL Switcher */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "rgba(0,0,0,0.25)", padding: "4px" }}>
                      <button
                        type="button"
                        onClick={() => setTradeType("BUY")}
                        style={{
                          padding: "8px 0",
                          border: "none",
                          background: tradeType === "BUY" ? "rgba(255,255,255,0.06)" : "none",
                          color: tradeType === "BUY" ? "#fff" : "var(--color-text-dim)",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Buy Shares
                      </button>
                      <button
                        type="button"
                        onClick={() => setTradeType("SELL")}
                        style={{
                          padding: "8px 0",
                          border: "none",
                          background: tradeType === "SELL" ? "rgba(255,255,255,0.06)" : "none",
                          color: tradeType === "SELL" ? "#fff" : "var(--color-text-dim)",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Sell Shares
                      </button>
                    </div>

                    {/* Choose Outcome buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => setTradeOutcome("YES")}
                        style={{
                          padding: "8px",
                          background: tradeOutcome === "YES" ? "rgba(34,197,94,0.08)" : "rgba(0,0,0,0.2)",
                          border: tradeOutcome === "YES" ? "1px solid var(--color-accent)" : "1px solid var(--border-light)",
                          color: tradeOutcome === "YES" ? "var(--color-accent)" : "var(--color-text-dim)",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "center"
                        }}
                      >
                        YES ({selectedFixture.participant1})
                        <span style={{ display: "block", fontSize: "14px", fontWeight: 900, marginTop: "2px" }}>
                          {currentPrices.yesPrice}¢
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTradeOutcome("NO")}
                        style={{
                          padding: "8px",
                          background: tradeOutcome === "NO" ? "rgba(239,68,68,0.08)" : "rgba(0,0,0,0.2)",
                          border: tradeOutcome === "NO" ? "1px solid var(--color-danger)" : "1px solid var(--border-light)",
                          color: tradeOutcome === "NO" ? "var(--color-danger)" : "var(--color-text-dim)",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "center"
                        }}
                      >
                        NO ({selectedFixture.participant2})
                        <span style={{ display: "block", fontSize: "14px", fontWeight: 900, marginTop: "2px" }}>
                          {currentPrices.noPrice}¢
                        </span>
                      </button>
                    </div>

                    {/* Amount Input */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                        {tradeType === "BUY" ? "CASH to spend ($):" : "Shares to sell:"}
                      </label>
                      <div style={{ transform: "skewX(-12deg)", border: "1px solid var(--border-light)", background: "var(--bg-secondary)", padding: "0 12px" }}>
                        <input
                          type="number"
                          min="1"
                          value={tradeAmount}
                          onChange={e => setTradeAmount(Math.max(1, Number(e.target.value)))}
                          style={{
                            transform: "skewX(12deg)",
                            background: "none",
                            color: "#fff",
                            border: "none",
                            width: "100%",
                            padding: "10px 0",
                            outline: "none",
                            fontSize: "14px",
                            fontFamily: "monospace"
                          }}
                        />
                      </div>
                      <span style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>
                        Current Holdings: {tradeOutcome === "YES" ? currentHoldings.yesShares : currentHoldings.noShares} shares
                      </span>
                    </div>

                    {/* Payoff description */}
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px dashed var(--border-light)", padding: "12px 16px", fontSize: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--color-text-muted)" }}>Cost:</span>
                        <span style={{ fontWeight: 700, color: "#fff" }}>
                          {tradeType === "BUY" ? `$${tradeAmount.toFixed(2)} CASH` : `${tradeAmount} shares`}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--color-text-muted)" }}>Est. Receive:</span>
                        <span style={{ fontWeight: 700, color: "var(--color-accent)" }}>
                          {tradeType === "BUY" ? (
                            `${Math.floor((tradeAmount * 100) / (tradeOutcome === "YES" ? currentPrices.yesPrice : currentPrices.noPrice))} outcome shares`
                          ) : (
                            `$${((tradeAmount * (Math.max(1, (tradeOutcome === "YES" ? currentPrices.yesPrice : currentPrices.noPrice) - 2))) / 100).toFixed(2)} CASH`
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn-secondary"
                      disabled={isTxPending}
                      style={{
                        width: "100%",
                        borderRadius: "0px",
                        transform: "skewX(-12deg)",
                        background: "var(--color-accent-dim)",
                        border: "1px solid var(--color-accent)",
                        color: "var(--color-accent)",
                        height: "40px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                      }}
                    >
                      <span style={{ transform: "skewX(12deg)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Zap size={14} />
                        {isTxPending ? "Executing Swap..." : `Confirm Swap via DFlow`}
                      </span>
                    </button>

                  </form>
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--color-text-dim)" }}>
                Select a match to start trading outcome shares.
              </div>
            )}

            {/* Solana Devnet Ledger Terminal */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: "var(--color-text-dim)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                <Terminal size={12} />
                // SOLANA TRANSACTION LEDGER (DEVNET)
              </span>
              <div 
                style={{
                  background: "#030712",
                  border: "1px solid var(--border-light)",
                  borderRadius: "0px",
                  padding: "12px",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  color: "#38ef7d",
                  height: "150px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  boxShadow: "inset 0 0 10px rgba(0,0,0,0.8)"
                }}
              >
                {ledgerLogs.map((log, idx) => (
                  <div key={idx} style={{ lineBreak: "anywhere" }}>
                    {log.startsWith("[ERROR]") ? (
                      <span style={{ color: "var(--color-danger)" }}>{log}</span>
                    ) : log.startsWith("[Faucet]") || log.startsWith("[DFlow]") ? (
                      <span style={{ color: "var(--color-accent)" }}>{log}</span>
                    ) : log.startsWith("Success!") || log.includes("confirmed") ? (
                      <span style={{ color: "var(--color-success)", fontWeight: "bold" }}>{log}</span>
                    ) : (
                      <span>{log}</span>
                    )}
                  </div>
                ))}
                {isTxPending && (
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <span className="animate-pulse">_</span>
                    <span style={{ color: "var(--color-text-dim)" }}>Broadcasting block...</span>
                  </div>
                )}
                {txSuccessSig && (
                  <div style={{ marginTop: "4px", borderTop: "1px dashed rgba(56, 239, 125, 0.2)", paddingTop: "4px" }}>
                    <a
                      href={`https://explorer.solana.com/tx/${txSuccessSig}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: "var(--color-accent)",
                        textDecoration: "underline",
                        fontSize: "9px"
                      }}
                    >
                      [ View on Solana Explorer ]
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* TRADITIONAL TAB: Aura Limit Order Book (With Special Analytics Micro-Markets) */
        <div className="grid-cols-3" style={{ alignItems: "start", gap: "24px" }}>
          
          {/* Left Column: Markets List */}
          <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderRadius: "0px" }}>
            <h3 style={{ fontSize: "18px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 800 }}>
              <span style={{ color: "var(--color-accent)", fontWeight: 900 }}>/</span>
              Active Markets
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[...traditionalMarkets].sort((a, b) => {
                const isSpecialA = a.type === "special_micro";
                const isSpecialB = b.type === "special_micro";
                if (isSpecialA && !isSpecialB) return -1;
                if (!isSpecialA && isSpecialB) return 1;
                return b.id - a.id;
              }).map(m => {
                const isActive = m.id === activeTraditionalId;
                const isSpecial = m.type === "special_micro";
                return (
                  <Link 
                    key={m.id} 
                    href={`/markets?marketId=${m.id}`}
                    className="glass-panel" 
                    style={{ 
                      padding: "16px", 
                      background: isActive 
                        ? (isSpecial ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.08)") 
                        : (isSpecial ? "rgba(34, 197, 94, 0.02)" : "rgba(255, 255, 255, 0.01)"),
                      borderColor: isActive 
                        ? "var(--color-accent)" 
                        : (isSpecial ? "rgba(34, 197, 94, 0.2)" : "var(--border-light)"),
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
                      <h4 style={{ fontSize: "13px", color: isActive ? "#fff" : "var(--color-text-main)", fontWeight: 700 }}>
                        {m.name}
                      </h4>
                      <span style={{ fontSize: "9px", color: isSpecial ? "var(--color-accent)" : "var(--color-text-dim)", textTransform: "uppercase", fontWeight: isSpecial ? "bold" : "normal" }}>
                        {isSpecial ? "ANALYTICS MICRO-MARKET" : (m.type || "").replace("_", " ")}
                      </span>
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

          {/* Right Column: Active Market Trading Panel & Crowdsourced Gauges */}
          <div className="glass-panel" style={{ padding: "24px", gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "24px", borderRadius: "0px" }}>
            {activeTraditionalId ? (
              <>
                {traditionalMarkets.filter(m => m.id === activeTraditionalId).map(selectedMarket => {
                  const isSpecial = selectedMarket.type === "special_micro";
                  
                  return (
                    <div key={selectedMarket.id} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      
                      {/* Market Info */}
                      <div>
                        <span style={{ 
                          background: isSpecial ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.05)", 
                          border: isSpecial ? "1px solid var(--color-accent)" : "1px solid var(--border-light)",
                          padding: "3px 8px", 
                          borderRadius: "0px",
                          transform: "skewX(-12deg)",
                          display: "inline-block",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          color: isSpecial ? "var(--color-accent)" : "var(--color-text-muted)",
                          letterSpacing: "0.5px"
                        }}>
                          <span style={{ display: "inline-block", transform: "skewX(12deg)", fontWeight: "bold" }}>
                            {isSpecial ? "AURA LIVE ORACLE METRIC" : (selectedMarket.type || "").replace("_", " ")}
                          </span>
                        </span>
                        <h2 style={{ fontSize: "24px", marginTop: "8px", fontWeight: 800 }}>{selectedMarket.name}</h2>
                        <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginTop: "8px", lineHeight: "1.5" }}>
                          {selectedMarket.description}
                        </p>
                      </div>

                      {/* CONDITIONAL RENDERING: Live Oracle Gauges for Special Micro-Markets */}
                      {isSpecial && (
                        <div 
                          className="glass-panel" 
                          style={{ 
                            padding: "20px", 
                            background: "linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(10, 15, 38, 0.9) 100%)",
                            borderLeft: "4px solid var(--color-accent)",
                            borderRadius: "0px"
                          }}
                        >
                          <span style={{ fontSize: "10px", color: "var(--color-text-dim)", textTransform: "uppercase", fontWeight: 900, display: "flex", alignItems: "center", gap: "6px" }}>
                            <Activity size={12} style={{ color: "var(--color-accent)" }} />
                            Live Crowdsourced Analytics Gauge
                          </span>

                          {/* Gauge A: Next Goalscorer (Messi vs Yamal) */}
                          {selectedMarket.name.includes("Goalscorer") && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                <strong style={{ color: "var(--color-accent)" }}>Lionel Messi (ARG): {selectedMarket.yesPrice}%</strong>
                                <strong style={{ color: "var(--color-danger)" }}>Lamine Yamal (ESP): {selectedMarket.noPrice}%</strong>
                              </div>
                              <div style={{ height: "12px", width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-light)", display: "flex" }}>
                                <div style={{ width: `${selectedMarket.yesPrice}%`, background: "var(--color-accent)", height: "100%" }}></div>
                                <div style={{ width: `${selectedMarket.noPrice}%`, background: "var(--color-danger)", height: "100%" }}></div>
                              </div>
                              <span style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>
                                Implied probability derived from Limit Order Book order consensus. Yields a pre-shot expected danger value.
                              </span>
                            </div>
                          )}

                          {/* Gauge B: Expected Threat Transition */}
                          {selectedMarket.name.includes("Expected Threat") && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                <strong style={{ color: "var(--color-accent)" }}>Shot taken (Attack Success): {selectedMarket.yesPrice}%</strong>
                                <strong style={{ color: "var(--color-danger)" }}>Turnover (Possession Lost): {selectedMarket.noPrice}%</strong>
                              </div>
                              <div style={{ height: "10px", width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: "0px" }}>
                                <div style={{ width: `${selectedMarket.yesPrice}%`, background: "linear-gradient(90deg, var(--color-danger) 0%, var(--color-accent) 100%)", height: "100%" }}></div>
                              </div>
                              <span style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>
                                Expected Threat (xT) transition forecast. Spikes when the attacking line penetrates the penalty box.
                              </span>
                            </div>
                          )}

                          {/* Gauge C: Next Card / Foul */}
                          {selectedMarket.name.includes("Card / Foul") && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                <div className="glass-panel" style={{ padding: "10px", borderLeft: "3px solid var(--color-danger)", borderRadius: "0px" }}>
                                  <span style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>Cristian Romero (ARG)</span>
                                  <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--color-danger)" }}>
                                    {selectedMarket.yesPrice}% card probability
                                  </div>
                                </div>
                                <div className="glass-panel" style={{ padding: "10px", borderLeft: "3px solid var(--color-accent)", borderRadius: "0px" }}>
                                  <span style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>Aymeric Laporte (ESP)</span>
                                  <div style={{ fontSize: "16px", fontWeight: 900, color: "var(--color-accent)" }}>
                                    {selectedMarket.noPrice}% card probability
                                  </div>
                                </div>
                              </div>
                              <span style={{ fontSize: "10px", color: "var(--color-text-dim)" }}>
                                Defender vulnerability metric. Measures isolation probability under intense winger counter pressure.
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pricing cards */}
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
                            <span style={{ fontSize: "12px", color: "var(--color-text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                              {isSpecial ? "YES Shares" : "YES Price"}
                            </span>
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
                            <span style={{ fontSize: "12px", color: "var(--color-text-dim)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                              {isSpecial ? "NO Shares" : "NO Price"}
                            </span>
                            <h3 style={{ fontSize: "38px", fontWeight: 900, color: "var(--color-danger)", margin: "6px 0", fontFamily: "monospace" }}>{selectedMarket.noPrice}¢</h3>
                            <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Pays 100¢ if Resolved NO</span>
                          </div>
                        </div>
                      </div>

                      {/* Limit Order Form */}
                      <form action={submitTradeAction} className="glass-panel" style={{ padding: "20px", borderRadius: "0px", background: "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "16px" }}>
                        <h4 style={{ fontSize: "16px", display: "flex", alignItems: "center", gap: "8px", fontWeight: 700 }}>
                          <ShoppingBag size={16} />
                          Trade Shares Order form
                        </h4>
                        <input type="hidden" name="marketId" value={selectedMarket.id} />
                        
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
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

                      {/* Order Book & History Tables */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
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
                                  <span style={{ color: (order.orderType || "").includes("Yes") ? "var(--color-accent)" : "var(--color-danger)" }}>
                                    {order.orderType}
                                  </span>
                                  <span>{order.sharesRemaining} shares @ {order.price}¢</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="glass-panel" style={{ padding: "16px", background: "rgba(0,0,0,0.05)", borderRadius: "0px" }}>
                          <h4 style={{ fontSize: "14px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px", marginBottom: "12px", fontWeight: 700 }}>
                            <span style={{ color: "var(--color-accent)", marginRight: "6px" }}>/</span>Match Execution History
                          </h4>
                          {executedTrades.length === 0 ? (
                            <p style={{ color: "var(--color-text-dim)", fontSize: "12px" }}>No matches traded yet.</p>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {executedTrades.slice(0, 5).map(t => (
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

                    </div>
                  );
                })}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "80px", color: "var(--color-text-dim)" }}>
                <HelpCircle size={48} style={{ marginBottom: "16px", opacity: 0.3 }} />
                <p>No active traditional market selected. Please select a market from the sidebar.</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
