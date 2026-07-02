"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Trophy, 
  TrendingUp, 
  Wallet, 
  RefreshCw, 
  ArrowRight, 
  Lock, 
  PieChart, 
  ShieldCheck, 
  Layers, 
  Coins,
  Sparkles,
  Activity,
  Zap,
  Cpu,
  Target,
  HelpCircle
} from "lucide-react";

interface SportScenario {
  id: string;
  sportName: string;
  fixture: string;
  competitors: [string, string];
  marketTitle: string;
  outcomes: [string, string, string];
  defaultOdds: [number, number, number];
  poolSize: string;
  navMultiplier: number;
  sparklineData: number[];
}

const SPORT_SCENARIOS: SportScenario[] = [
  {
    id: "football",
    sportName: "Football",
    fixture: "Argentina vs Portugal",
    competitors: ["Argentina", "Portugal"],
    marketTitle: "Match Winner (R32)",
    outcomes: ["ARG Win", "Draw", "POR Win"],
    defaultOdds: [1.95, 3.40, 2.85],
    poolSize: "184,520 USDC",
    navMultiplier: 1.25,
    sparklineData: [45, 52, 49, 62, 58, 71, 68, 75, 82, 80]
  },
  {
    id: "basketball",
    sportName: "Basketball",
    fixture: "Boston Celtics vs LA Lakers",
    competitors: ["Celtics", "Lakers"],
    marketTitle: "Moneyline Winner",
    outcomes: ["BOS Win", "OT Tie", "LAL Win"],
    defaultOdds: [1.70, 14.50, 2.15],
    poolSize: "312,900 USDC",
    navMultiplier: 1.48,
    sparklineData: [50, 48, 55, 60, 52, 68, 74, 80, 88, 92]
  },
  {
    id: "tennis",
    sportName: "Tennis",
    fixture: "Carlos Alcaraz vs Jannik Sinner",
    competitors: ["Alcaraz", "Sinner"],
    marketTitle: "Match Winner",
    outcomes: ["Alcaraz Win", "Match Tie", "Sinner Win"],
    defaultOdds: [1.82, 28.00, 1.90],
    poolSize: "96,400 USDC",
    navMultiplier: 1.10,
    sparklineData: [60, 58, 62, 65, 61, 70, 67, 72, 75, 78]
  },
  {
    id: "racing",
    sportName: "Formula 1",
    fixture: "Hamilton vs Verstappen vs Leclerc",
    competitors: ["Hamilton", "Verstappen"],
    marketTitle: "Podium Winner",
    outcomes: ["HAM Win", "LEC Win", "VER Win"],
    defaultOdds: [2.90, 4.20, 1.65],
    poolSize: "245,000 USDC",
    navMultiplier: 1.62,
    sparklineData: [40, 38, 45, 50, 48, 58, 62, 69, 72, 85]
  }
];

export default function LandingPage() {
  const [activeSportId, setActiveSportId] = useState<string>("football");
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<number>(0);
  const [collateralAmount, setCollateralAmount] = useState<number>(0.5);
  const [leverageValue, setLeverageValue] = useState<number>(3);
  
  // Real-time animated ticker simulation parameters
  const [simulatedTime, setSimulatedTime] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeSport = SPORT_SCENARIOS.find(s => s.id === activeSportId) || SPORT_SCENARIOS[0];
  const activeOdds = activeSport.defaultOdds[selectedOutcomeIndex];
  
  // Live calculations with simulated pricing fluctuation
  const fluctuation = Math.sin(simulatedTime / 4) * 0.04;
  const currentOdds = Number((activeOdds + fluctuation).toFixed(2));
  
  const estimatedReturn = Number((collateralAmount * leverageValue * currentOdds).toFixed(3));
  const estimatedYield = Number(((estimatedReturn - collateralAmount) / collateralAmount * 100).toFixed(1));
  
  // Live changing net asset value simulation
  const rawNav = collateralAmount * activeSport.navMultiplier * (1 + Math.sin(simulatedTime / 6) * 0.06);
  const simulatedNav = Number(rawNav.toFixed(3));

  // Simulated sparkline points
  const sparklinePoints = activeSport.sparklineData.map((val, idx) => {
    const step = 280 / 9;
    const x = Math.round(idx * step);
    const wave = Math.sin((simulatedTime + idx) / 3) * 6;
    const y = Math.round(90 - (val + wave) * 0.8);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="landing-root">
      {/* Background Grids and Accent Colors */}
      <div className="grid-overlay"></div>
      <div className="hud-orb hud-orb-primary"></div>
      <div className="hud-orb hud-orb-accent"></div>
      <div className="hud-orb hud-orb-cyan"></div>

      {/* Top Scrolling Live Oracle Ticker */}
      <div className="live-ticker-container">
        <div className="live-ticker-track">
          <div className="ticker-item">
            <span className="dot-live"></span>
            <span>[LIVE] User GqZn... prediction minted 1.5 SOL on Argentina @ 1.95x</span>
          </div>
          <div className="ticker-item">
            <span className="dot-live"></span>
            <span>[ORACLE] TxLINE resolved Canada vs South Africa (1-0). Settled bracket NFT contracts</span>
          </div>
          <div className="ticker-item">
            <span className="dot-live"></span>
            <span>[POOL] Celtics vs Lakers liquidity pool reaches <span className="pool-value">312,900 USDC</span></span>
          </div>
          <div className="ticker-item">
            <span className="dot-live"></span>
            <span>[MINT] User 8sTu... drafted yield-bearing Sinner vs Alcaraz index token</span>
          </div>
          {/* Double content for infinite marquee loop */}
          <div className="ticker-item">
            <span className="dot-live"></span>
            <span>[LIVE] User GqZn... prediction minted 1.5 SOL on Argentina @ 1.95x</span>
          </div>
          <div className="ticker-item">
            <span className="dot-live"></span>
            <span>[ORACLE] TxLINE resolved Canada vs South Africa (1-0). Settled bracket NFT contracts</span>
          </div>
          <div className="ticker-item">
            <span className="dot-live"></span>
            <span>[POOL] Celtics vs Lakers liquidity pool reaches <span className="pool-value">312,900 USDC</span></span>
          </div>
        </div>
      </div>

      <div className="hud-container">
        {/* Navigation Glass Panel Header */}
        <header className="hud-panel hud-header">
          <div className="hud-brand">
            <Activity className="hud-brand-logo" size={24} />
            <span className="hud-brand-text">AuraPredict</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-450 mr-6">
              <Link href="/dashboard" className="hover:text-white transition-colors">Markets</Link>
              <Link href="/fantasy" className="hover:text-white transition-colors">Liquid Fantasy</Link>
              <Link href="/bracket" className="hover:text-white transition-colors">Bracket Indexes</Link>
            </div>
            <Link href="/dashboard" className="solana-neon-btn btn-sm">
              Launch Console <ArrowRight size={14} />
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hud-hero-section">
          <div className="hud-badge">
            <Sparkles size={13} className="text-accent" /> Solana Devnet Ecosystem
          </div>
          <h1 className="hud-hero-title">
            The Liquid Prediction Ecosystem <br />
            for <span className="gradient-cyan-pink">Global Sports.</span>
          </h1>
          <p className="hud-hero-subtitle">
            AuraPredict assetizes global sports fixture outcomes and brackets into tradeable, yield-bearing option portfolios. Backed by Solana smart contracts and verified trustlessly by the TxLINE Sports Oracle.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/dashboard" className="solana-neon-btn accent btn-lg">
              Enter Platform
            </Link>
            <Link href="/fantasy" className="hud-btn-secondary btn-lg">
              Aura Fantasy
            </Link>
          </div>
        </section>

        {/* Sports Selector Pills */}
        <div className="sports-nav-bar">
          {SPORT_SCENARIOS.map(sport => (
            <button
              key={sport.id}
              onClick={() => {
                setActiveSportId(sport.id);
                setSelectedOutcomeIndex(0);
              }}
              className={`sport-pill ${activeSportId === sport.id ? "active" : ""}`}
            >
              <Trophy size={16} />
              <span>{sport.sportName}</span>
            </button>
          ))}
        </div>

        {/* Interactive Live Oracle simulator Widget */}
        <div className="hud-panel terminal-layout">
          {/* Controls Side */}
          <div className="terminal-control-panel">
            <div>
              <span className="terminal-sport-tag">{activeSport.sportName} terminal</span>
              <h2 className="terminal-market-title" style={{ marginTop: "4px" }}>
                {activeSport.fixture}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{activeSport.marketTitle}</p>
            </div>

            <div className="terminal-market-card">
              <span className="terminal-sport-tag">Select Outcome Option</span>
              <div className="terminal-odds-grid">
                {activeSport.outcomes.map((outcome, idx) => (
                  <button
                    key={outcome}
                    onClick={() => setSelectedOutcomeIndex(idx)}
                    className={`odds-btn ${selectedOutcomeIndex === idx ? "active" : ""}`}
                  >
                    <span className="odds-lbl">{outcome}</span>
                    <span className="odds-val">{idx === selectedOutcomeIndex ? currentOdds : activeSport.defaultOdds[idx]}x</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="terminal-slider-group">
              <div className="terminal-slider-header">
                <span>Collateral Allocation</span>
                <span className="text-accent">{collateralAmount} SOL</span>
              </div>
              <input 
                type="range" 
                min="0.05" 
                max="5" 
                step="0.05" 
                value={collateralAmount}
                onChange={(e) => setCollateralAmount(parseFloat(e.target.value))}
                className="terminal-slider"
              />
            </div>

            <div className="terminal-slider-group">
              <div className="terminal-slider-header">
                <span>Leverage Multiplier</span>
                <span className="text-red-500">{leverageValue}x Leverage</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="1" 
                value={leverageValue}
                onChange={(e) => setLeverageValue(parseInt(e.target.value))}
                className="terminal-slider"
              />
            </div>
          </div>

          {/* HUD Monitor visualization Side */}
          <div className="terminal-viz-panel">
            <div className="terminal-market-card roster-card-hud">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="terminal-sport-tag">Oracle Sync Output</span>
                <span className="text-xs text-accent font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                  CONNECTED
                </span>
              </div>

              <div className="hud-metrics-row">
                <div className="hud-metric-box">
                  <span className="hud-metric-lbl">EST. Contract Return</span>
                  <span className="hud-metric-val text-white">{estimatedReturn} SOL</span>
                </div>
                <div className="hud-metric-box">
                  <span className="hud-metric-lbl">Simulated Yield ROI</span>
                  <span className="hud-metric-val text-success">+{estimatedYield}%</span>
                </div>
              </div>

              <div className="hud-metrics-row" style={{ borderBottom: "none", paddingBottom: 0 }}>
                <div className="hud-metric-box">
                  <span className="hud-metric-lbl">Live Net Asset Value</span>
                  <span className="hud-metric-val text-accent">{simulatedNav} SOL</span>
                </div>
                <div className="hud-metric-box">
                  <span className="hud-metric-lbl">Total Pool Volume</span>
                  <span className="hud-metric-val text-gray-300 text-lg">{activeSport.poolSize}</span>
                </div>
              </div>
            </div>

            <div className="hud-sparkline-box">
              <svg className="hud-sparkline-svg">
                <polyline
                  fill="none"
                  stroke="var(--color-accent, #9dff00)"
                  strokeWidth="2"
                  points={sparklinePoints}
                />
              </svg>
              <div className="flex justify-between w-full text-[10px] text-gray-500 font-mono" style={{ zIndex: 5 }}>
                <span>SOLANA TICK HISTORY</span>
                <span>VOLATILITY: HIGH</span>
              </div>
            </div>

            <Link href="/dashboard" className="solana-neon-btn btn-lg w-full text-center" style={{ marginTop: "10px" }}>
              Mint Outcome NFT Contract
            </Link>
          </div>
        </div>

        {/* Feature Innovation walkthrough cards */}
        <section className="hud-features-section">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white">Platform Innovations</h2>
            <p className="text-gray-400 mt-2 text-sm max-w-lg mx-auto">
              Our core primitives rebuild sports markets with modern liquidity mechanisms on Solana.
            </p>
          </div>

          <div className="hud-features-grid">
            <div className="hud-feature-card">
              <div className="hud-feature-icon">
                <Layers size={22} />
              </div>
              <h3>Structured Bracket Indexes</h3>
              <p>
                Assetize tournament brackets into a single, yield-bearing NFT index. Watch your Net Asset Value (NAV) grow as your predictions advance, or trade pieces of your bracket mid-tournament.
              </p>
            </div>

            <div className="hud-feature-card">
              <div className="hud-feature-icon">
                <Coins size={22} />
              </div>
              <h3>Yield-Bearing Sportstfs</h3>
              <p>
                Lock collateral deposits to back player or team outcome pools. Earn real yield distributions generated directly from secondary market trades and prediction fees.
              </p>
            </div>

            <div className="hud-feature-card">
              <div className="hud-feature-icon">
                <Zap size={22} />
              </div>
              <h3>Instant Oracle Settlements</h3>
              <p>
                Consensus scoring data is fed straight to smart contracts by the TxLINE Sports Oracle, verifying matches and enabling instant payouts to your wallet seconds after the whistle blows.
              </p>
            </div>
          </div>
        </section>

        {/* Node consensus & network indicators */}
        <section className="hud-stats-section border-t border-gray-905">
          <div className="hud-stats-grid">
            <div className="hud-stat-panel">
              <div className="hud-stat-val text-accent">100%</div>
              <div className="hud-stat-lbl">Decentralized consensus</div>
            </div>
            <div className="hud-stat-panel">
              <div className="hud-stat-val text-white">400ms</div>
              <div className="hud-stat-lbl">TxLINE Feed Latency</div>
            </div>
            <div className="hud-stat-panel">
              <div className="hud-stat-val text-cyan-400">12,450+</div>
              <div className="hud-stat-lbl">Active smart contracts</div>
            </div>
            <div className="hud-stat-panel">
              <div className="hud-stat-val text-pink-500">&lt; $0.001</div>
              <div className="hud-stat-lbl">Avg Solana network fee</div>
            </div>
          </div>
        </section>

        {/* HUD Footer */}
        <footer className="hud-footer">
          <span>© 2026 AuraPredict. Consensus verified by TxLINE Sports Oracle on Solana.</span>
          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:text-white transition-colors">Trade Portal</Link>
            <Link href="/fantasy" className="hover:text-white transition-colors">Aura Fantasy</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
