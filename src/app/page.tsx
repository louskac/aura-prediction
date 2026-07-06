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
  Settings,
  LineChart,
  CheckCircle,
  Clock,
  Database
} from "lucide-react";

interface OptionOutcome {
  name: string;
  probability: number;
  odds: number;
}

interface MatchContract {
  id: string;
  sport: string;
  fixture: string;
  status: "LIVE" | "UPCOMING" | "SETTLED";
  statusText: string;
  outcomes: OptionOutcome[];
  poolSize: string;
  navMultiplier: number;
  history: number[];
  volatility: string;
  oracleAccuracy: string;
}

const CONSOLE_MATCHES: MatchContract[] = [
  {
    id: "match-1",
    sport: "Football",
    fixture: "Argentina vs Portugal",
    status: "LIVE",
    statusText: "44:30 In-Play",
    outcomes: [
      { name: "ARG YES Option", probability: 52, odds: 1.92 },
      { name: "DRAW YES Option", probability: 18, odds: 5.56 },
      { name: "POR YES Option", probability: 30, odds: 3.33 }
    ],
    poolSize: "184,520 USDC",
    navMultiplier: 1.25,
    history: [48, 50, 47, 53, 50, 52, 51, 55, 53, 52],
    volatility: "MEDIUM",
    oracleAccuracy: "99.85%"
  },
  {
    id: "match-2",
    sport: "Basketball",
    fixture: "Celtics vs Lakers",
    status: "LIVE",
    statusText: "Q3 08:15",
    outcomes: [
      { name: "BOS YES Option", probability: 68, odds: 1.47 },
      { name: "LAL YES Option", probability: 32, odds: 3.12 }
    ],
    poolSize: "312,900 USDC",
    navMultiplier: 1.48,
    history: [58, 60, 59, 64, 62, 65, 68, 66, 69, 68],
    volatility: "HIGH",
    oracleAccuracy: "99.91%"
  },
  {
    id: "match-3",
    sport: "Tennis",
    fixture: "Alcaraz vs Sinner",
    status: "UPCOMING",
    statusText: "Starts in 2h",
    outcomes: [
      { name: "ALC YES Option", probability: 55, odds: 1.82 },
      { name: "SIN YES Option", probability: 45, odds: 2.22 }
    ],
    poolSize: "96,400 USDC",
    navMultiplier: 1.12,
    history: [50, 51, 53, 52, 54, 56, 55, 54, 56, 55],
    volatility: "LOW",
    oracleAccuracy: "99.88%"
  }
];

function LandingPlayerCard({ 
  name, 
  position, 
  flag, 
  fotmobId, 
  fps, 
  yieldVal, 
  accentColor 
}: { 
  name: string; 
  position: string; 
  flag: string; 
  fotmobId: number; 
  fps: string; 
  yieldVal: string; 
  accentColor: string; 
}) {
  const [hovered, setHovered] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const elRect = el.getBoundingClientRect();
    const x = e.clientX - elRect.left;
    const y = e.clientY - elRect.top;
    const xc = elRect.width / 2;
    const yc = elRect.height / 2;
    setRotateX((yc - y) / 5);
    setRotateY((x - xc) / 5);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  const getPositionGlow = (pos: string) => {
    switch (pos) {
      case "GK": return "#f59e0b";
      case "DEF": return "#06b6d4";
      case "MID": return "#a855f7";
      case "FWD": return "#9dff00";
      default: return "#00e5ff";
    }
  };

  const glow = getPositionGlow(position);
  const lastName = name.split(" ").slice(-1)[0];
  const photoUrl = `https://images.fotmob.com/image_resources/playerimages/${fotmobId}.png`;

  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        width: "110px",
        height: "165px",
        position: "relative",
        cursor: "pointer",
        clipPath: "polygon(0% 0%, 100% 0%, 100% 82%, 50% 100%, 0% 82%)",
        background: hovered 
          ? `linear-gradient(135deg, var(--color-accent) 0%, ${accentColor} 100%)`
          : `linear-gradient(135deg, ${accentColor}55 0%, rgba(255,255,255,0.05) 50%, ${accentColor}22 100%)`,
        padding: "1.5px",
        transition: "transform 0.1s ease, filter 0.3s ease",
        transform: hovered 
          ? `perspective(300px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.08) translateY(-4px)` 
          : "perspective(300px) rotateX(0deg) rotateY(0deg) scale(1)",
        filter: hovered 
          ? `drop-shadow(0 15px 30px rgba(0,0,0,0.6)) drop-shadow(0 0 15px ${accentColor}88)` 
          : `drop-shadow(0 6px 12px rgba(0,0,0,0.45))`,
      }}
    >
      <div style={{
        width: "100%",
        height: "100%",
        clipPath: "polygon(0% 0%, 100% 0%, 100% 82%, 50% 100%, 0% 82%)",
        background: "linear-gradient(180deg, rgba(10, 20, 50, 0.95) 0%, rgba(5, 10, 25, 0.98) 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "10px 8px 26px 8px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Holographic Glare Overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: hovered 
            ? `linear-gradient(${rotateY * 4 + 135}deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.06) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%)`,
          mixBlendMode: "overlay",
          pointerEvents: "none",
          zIndex: 5,
          transition: "background 0.1s ease"
        }} />

        {hovered && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(255, 0, 128, 0.08) 0%, rgba(0, 255, 255, 0.08) 50%, rgba(255, 255, 0, 0.08) 100%)",
            mixBlendMode: "color-dodge",
            pointerEvents: "none",
            zIndex: 4,
            animation: "pulse 2s infinite alternate"
          }} />
        )}

        {/* Card Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <span style={{ fontSize: "11px" }}>
            <span style={{ display: "inline-flex", borderRadius: "50%", overflow: "hidden", width: "13px", height: "13px", border: "0.5px solid rgba(255,255,255,0.2)" }}>
              <img src={flag} alt="flag" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </span>
          </span>
          <span style={{ 
            fontSize: "8px", 
            fontWeight: 850, 
            background: glow, 
            color: position === "FWD" || position === "MID" ? "#000" : "#fff",
            padding: "1px 4px", 
            borderRadius: "3px" 
          }}>{position}</span>
        </div>

        {/* Player Avatar */}
        <div style={{ 
          width: "54px", 
          height: "54px", 
          margin: "4px auto", 
          position: "relative",
          zIndex: 10
        }}>
          <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img 
              src={photoUrl} 
              alt={name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: "drop-shadow(0px 3px 5px rgba(0,0,0,0.6))",
                zIndex: 2
              }}
            />
            {/* Subtle background glow for the photo */}
            <div style={{
              position: "absolute",
              inset: "10%",
              borderRadius: "50%",
              background: `radial-gradient(circle, ${glow}44 0%, transparent 70%)`,
              filter: "blur(4px)",
              zIndex: 1,
              pointerEvents: "none"
            }} />
          </div>
        </div>

        {/* Player Name */}
        <div style={{ 
          fontSize: "10px", 
          fontWeight: 800, 
          textAlign: "center", 
          lineHeight: "1.1",
          color: "#fff",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          margin: "4px 0",
          zIndex: 10,
          textShadow: "0 1px 3px rgba(0,0,0,0.8)"
        }}>
          {lastName}
        </div>

        {/* Pricing / Points footer - Centered to prevent clipping from sloped edges */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          gap: "6px",
          borderTop: "1px solid rgba(255,255,255,0.08)", 
          paddingTop: "4px",
          zIndex: 10 
        }}>
          <span style={{ fontSize: "8px", color: "var(--color-text-muted)" }}>FPS {fps}</span>
          <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.2)" }}>•</span>
          <span style={{ fontSize: "9px", fontWeight: 850, color: "var(--color-accent)" }}>{yieldVal}</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [activeMatchId, setActiveMatchId] = useState<string>("match-1");
  const [selectedOutcomeIdx, setSelectedOutcomeIdx] = useState<number>(0);
  const [tradeSize, setTradeSize] = useState<number>(0.5);
  const [leverage, setLeverage] = useState<number>(3);
  
  // Real-time animated ticker/logger states
  const [secTimer, setSecTimer] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([
    "TxLINE Oracle node consensus reached. [0.4s latency]",
    "Solana Devnet prediction pool contracts loaded.",
    "AURA analytics index initialized."
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecTimer(prev => prev + 1);
      
      const mockEvents = [
        `Oracle feed update: price adjusted on ${activeMatch.fixture}`,
        `Secondary trade matching: 1.5 SOL on ${activeMatch.outcomes[0].name}`,
        "Solana block finalized. Gas fee: <0.0001 SOL",
        "Net Asset Value (NAV) sync complete."
      ];
      const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
      
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      
      setLogs(prev => [
        `[${timeStr}] ${randomEvent}`,
        ...prev.slice(0, 3)
      ]);
    }, 4000);
    return () => clearInterval(timer);
  }, [activeMatchId]);

  const activeMatch = CONSOLE_MATCHES.find(m => m.id === activeMatchId) || CONSOLE_MATCHES[0];
  
  // Ensure selected outcome idx is in range when active match changes
  useEffect(() => {
    setSelectedOutcomeIdx(0);
  }, [activeMatchId]);

  const activeOutcome = activeMatch.outcomes[selectedOutcomeIdx] || activeMatch.outcomes[0];
  
  // Live simulated values
  const currentOdds = activeOutcome.odds;
  const estReturn = Number((tradeSize * leverage * currentOdds).toFixed(3));
  const estYield = Number(((estReturn - tradeSize) / tradeSize * 100).toFixed(0));
  
  const rawNav = tradeSize * activeMatch.navMultiplier * (1 + Math.sin(secTimer / 4) * 0.05);
  const currentNav = Number(rawNav.toFixed(3));

  // Generate responsive chart points
  const points = activeMatch.history.map((val, idx) => {
    const step = 280 / 9;
    const x = Math.round(idx * step);
    const wave = Math.sin((secTimer + idx) / 2) * 5;
    const y = Math.round(110 - (val + wave) * 0.9);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="landing-root">
      {/* Immersive Background Image Container */}
      <div className="hero-bg-container">
        <div className="hero-bg-image"></div>
        <div className="hero-bg-overlay"></div>
      </div>

      <div className="grid-overlay"></div>
      <div className="console-glow-orb console-glow-primary"></div>
      <div className="console-glow-orb console-glow-accent"></div>

      <div className="console-container">
        {/* Minimalist Navigation Bar (Fixed-Position) */}
        <header className="console-header">
          <div className="console-brand">
            <Activity size={18} className="text-[#22c55e]" />
            <span className="console-brand-text">AURA</span>
            <span className="hud-data-tag font-mono text-[9px] spacer-ml-1">DEVNET.v1.0</span>
          </div>

          <nav className="console-nav hidden lg:flex">
            <Link href="/dashboard" className="console-nav-link">Trade Portal</Link>
            <Link href="/fantasy" className="console-nav-link">Liquid Fantasy</Link>
            <Link href="/bracket" className="console-nav-link">Bracket Indexes</Link>
          </nav>

          {/* Wallet Badge - Flex row alignment */}
          <div className="layout-flex-row layout-flex-gap-4">
            <div className="console-wallet-badge">
              <span className="status-dot"></span>
              <span className="font-mono text-xs">GQZn...GK2P</span>
            </div>
          </div>
        </header>

        {/* Spacious Immersive Hero Area */}
        <section className="console-hero">
          <div className="console-hero-label">
            <Sparkles size={11} className="spacer-mr-1" /> Solana Sports Engine
          </div>

          <h1 className="console-hero-title font-sans">
            ANALYZE SMARTER. <br/> PLAY <span>HARDER.</span>
          </h1>
          <p className="console-hero-subtitle">
            Draft high-intensity fantasy teams, lock squad collateral pools, and analyze dynamic probability options with up to 10x leverage. Sports prediction is now a liquid market asset.
          </p>

          <div className="console-hero-ctas">
            <Link href="/dashboard" className="console-btn-primary">
              <span className="btn-text-wrapper">
                Enter Platform <ArrowRight size={14} className="spacer-ml-1" />
              </span>
            </Link>
            <Link href="/fantasy" className="console-btn-secondary">
              <span className="btn-text-wrapper">
                Aura Fantasy
              </span>
            </Link>
          </div>
        </section>

        {/* Cleaner Spaced Statistics Bar with Slanted Accent Slashes */}
        <section className="console-stats-bar-header">
          <div className="console-stats-bar-grid">
            <div className="console-stat-item">
              <span className="stat-accent-slash"></span>
              <div className="stat-content">
                <span className="console-footer-stat-val text-[#22c55e]">100%</span>
                <span className="console-footer-stat-lbl">Consensus Agreement</span>
              </div>
            </div>

            <div className="console-stat-item">
              <span className="stat-accent-slash blue"></span>
              <div className="stat-content">
                <span className="console-footer-stat-val">380ms</span>
                <span className="console-footer-stat-lbl">Settlement latency</span>
              </div>
            </div>

            <div className="console-stat-item">
              <span className="stat-accent-slash purple"></span>
              <div className="stat-content">
                <span className="console-footer-stat-val text-purple-500">12.4k+</span>
                <span className="console-footer-stat-lbl">Contracts Settled</span>
              </div>
            </div>

            <div className="console-stat-item">
              <span className="stat-accent-slash green-bright"></span>
              <div className="stat-content">
                <span className="console-footer-stat-val text-emerald-400">&lt; $0.001</span>
                <span className="console-footer-stat-lbl">Average gas cost</span>
              </div>
            </div>
          </div>
        </section>

        {/* Simplified Active Contracts Preview Block */}
        <section className="preview-section">
          <div className="preview-section-header">
            <span className="preview-section-lbl">Interactive Demo</span>
            <h2 className="preview-section-title">Active Market Pools</h2>
          </div>

          {/* Simple Row Grid of Match Cards */}
          <div className="preview-matches-grid">
            {CONSOLE_MATCHES.map(match => (
              <div 
                key={match.id}
                onClick={() => setActiveMatchId(match.id)}
                className={`preview-match-card ${activeMatchId === match.id ? "active" : ""}`}
              >
                <div className="match-card-meta">
                  <span className="match-card-sport">{match.sport}</span>
                  {match.status === "LIVE" ? (
                    <span className="match-card-status">
                      <span className="status-dot animate-pulse"></span>
                      {match.statusText}
                    </span>
                  ) : (
                    <span className="match-card-status upcoming">{match.statusText}</span>
                  )}
                </div>
                <h3 className="match-card-title">{match.fixture}</h3>
                
                {/* Analytics parameters injected directly on card */}
                <div className="layout-flex-row layout-flex-gap-2 font-mono text-[9px] text-[#22c55e] py-1">
                  <span>[ACCURACY: {match.oracleAccuracy}]</span>
                  <span>[VOLATILITY: {match.volatility}]</span>
                </div>

                <div className="match-card-pool-info">
                  <span className="font-mono text-[10px] text-gray-500 font-bold">POOL SIZE</span>
                  <span className="match-card-pool-val font-mono">{match.poolSize}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Simplified Dynamic Details Drawer */}
          <div className="preview-interactive-console">
            {/* Left Column: Trade Inputs */}
            <div className="preview-trade-panel">
              <div className="layout-flex-between">
                <div>
                  <span className="match-card-sport font-mono font-bold">Outcome Contract Selector</span>
                  <h4 className="text-xl font-bold mt-1 mb-4">{activeMatch.fixture}</h4>
                </div>
                {/* Top Corner Analytical tag */}
                <div className="hud-data-tag font-mono text-[9px] py-1 px-3">
                  STABLE_FEED
                </div>
              </div>

              <div className="preview-options-grid">
                {activeMatch.outcomes.map((outcome, idx) => (
                  <div
                    key={outcome.name}
                    onClick={() => setSelectedOutcomeIdx(idx)}
                    className={`preview-option-pill ${selectedOutcomeIdx === idx ? "selected" : ""}`}
                  >
                    <span className="preview-option-name font-mono">{outcome.name.split(" ")[0]}</span>
                    <span className="preview-option-odds">{outcome.odds}x</span>
                  </div>
                ))}
              </div>

              <div className="preview-slider-group">
                <div className="preview-slider-info font-mono text-[11px]">
                  <span>Collateral Allocation</span>
                  <span className="preview-slider-val font-bold">{tradeSize} SOL</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="5.00"
                  step="0.05"
                  value={tradeSize}
                  onChange={(e) => setTradeSize(parseFloat(e.target.value))}
                  className="preview-range-input"
                />
              </div>

              <div className="preview-slider-group">
                <div className="preview-slider-info font-mono text-[11px]">
                  <span>Leverage Multiplier</span>
                  <span className="font-bold text-pink-500">{leverage}x Leverage</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  className="preview-range-input"
                />
              </div>

              {/* Technical consensus nodes checklist */}
              <div className="hud-divider-dotted"></div>
              <div className="layout-flex-col layout-flex-gap-2 font-mono text-[10px] text-gray-500">
                <span className="text-gray-400 font-bold mb-1">TXLINE CONSENSUS CHECKS:</span>
                <div className="layout-flex-between">
                  <span>✓ 1. Fixture Lock-in Verified</span>
                  <span className="text-emerald-400 font-bold">SUCCESS</span>
                </div>
                <div className="layout-flex-between">
                  <span>✓ 2. Multi-Node Signatures Synced</span>
                  <span className="text-emerald-400 font-bold">100% OK</span>
                </div>
                <div className="layout-flex-between">
                  <span>✓ 3. SOL Devnet Contract Mapping</span>
                  <span className="text-emerald-400 font-bold">DEPLOYED</span>
                </div>
              </div>
            </div>

            {/* Right Column: Analytics & Settlements */}
            <div className="preview-chart-panel">
              <div className="preview-stats-row">
                <div className="preview-stat-box">
                  <span className="preview-stat-lbl">Return Contract</span>
                  <span className="preview-stat-val">{estReturn} SOL</span>
                </div>
                <div className="preview-stat-box">
                  <span className="preview-stat-lbl">Implied ROI</span>
                  <span className="preview-stat-val text-emerald-400 font-bold">+{estYield}%</span>
                </div>
              </div>

              {/* Sparkline Chart Grid */}
              <div className="preview-chart-box">
                <svg className="absolute inset-0 w-full h-full">
                  <line x1="0" y1="35" x2="300" y2="35" className="preview-chart-grid" />
                  <line x1="0" y1="70" x2="300" y2="70" className="preview-chart-grid" />
                  <line x1="0" y1="105" x2="300" y2="105" className="preview-chart-grid" />
                  <polyline
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    points={points}
                    style={{ filter: "drop-shadow(0 0 4px rgba(34, 197, 94, 0.35))" }}
                  />
                </svg>
                <div className="absolute bottom-2 left-3 right-3 layout-flex-between text-[9px] text-gray-500 font-mono">
                  <span>ORACLE SYNC: SECURE</span>
                  <span>ACCURACY RATE: {activeMatch.oracleAccuracy}</span>
                </div>
              </div>

              {/* Console logs */}
              <div className="preview-logger font-mono">
                {logs.map((log, index) => (
                  <div key={index} className="layout-flex-row layout-flex-gap-2">
                    <span className="time">{index === 0 ? "LIVE" : "SYNC"}</span>
                    <span className="msg">{log}</span>
                  </div>
                ))}
              </div>

              <button className="preview-mint-btn w-full font-mono uppercase tracking-wider text-xs">
                [ Mint Analytics Contract ]
              </button>
            </div>
          </div>
        </section>

        {/* Feature Innovations Onboarding Overhaul */}
        <section className="console-innovations">
          <h2 className="console-innovations-title">Application Core Pillars</h2>
          <div className="console-innovations-grid">
            {/* Pillar 1 */}
            <div className="console-innovation-card">
              <div className="console-innovation-icon animate-pulse">
                <TrendingUp size={20} />
              </div>
              <div className="layout-flex-between">
                <h3>1. Option Analytics Pools</h3>
                <span className="hud-data-tag font-mono text-[9px] px-2 py-0.5">OPTION_ANALYTICS</span>
              </div>
              <p>
                Analyze and trade directly on fixture outcomes with on-chain option tokens. Lock collateral to buy YES/NO contracts, adjust leverage sizes from 1x to 10x, and trade your positions dynamically before the final whistle blows.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="console-innovation-card">
              <div className="console-innovation-icon">
                <Layers size={20} />
              </div>
              <div className="layout-flex-between">
                <h3>2. Structured Bracket Indexes</h3>
                <span className="hud-data-tag font-mono text-[9px] px-2 py-0.5">BRACKET_NFT_INDEX</span>
              </div>
              <p>
                Assetize entire tournament brackets into a single unified NFT index. Own your bracket predictions as structured portfolios, with index Net Asset Value (NAV) updating instantly as scores settle on the Solana ledger.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="console-innovation-card">
              <div className="console-innovation-icon">
                <Coins size={20} />
              </div>
              <div className="layout-flex-between">
                <h3>3. Yield-Bearing Fantasy Squads</h3>
                <span className="hud-data-tag font-mono text-[9px] px-2 py-0.5">LIQUIDITY_POOLS</span>
              </div>
              <p>
                Draft player roster options and pool collateral with your fantasy squad. Back active positions to claim real yield shares generated from platform trade commissions and dynamic liquidity allocation pools.
              </p>
            </div>
          </div>
        </section>

        {/* World Cup Bracket Index Section */}
        <section className="bracket-preview-section">
          <div className="bracket-preview-grid">
            {/* Column 1: Info and Copy */}
            <div>
              <span className="section-label">Bracket Indexing</span>
              <h2 className="section-title">
                Structured <br /> <span>Bracket Indexes</span>
              </h2>
              <p className="section-description">
                Own entire tournament brackets as structured NFT indexes. Instead of betting on isolated matchups, speculate on bracket-wide progression and trade your positions mid-tournament on Solana secondary markets.
              </p>
              
              <div className="section-features-list">
                <div className="section-feature-item">
                  <div className="feature-dot"></div>
                  <div className="feature-text-group">
                    <span className="feature-title">Assetized Portfolios</span>
                    <span className="feature-desc">Brackets are compiled into tradeable indexes backed by Solana smart contracts.</span>
                  </div>
                </div>

                <div className="section-feature-item">
                  <div className="feature-dot"></div>
                  <div className="feature-text-group">
                    <span className="feature-title">Oracle Settlement Updates</span>
                    <span className="feature-desc">As scores settle on-chain, index Net Asset Value updates dynamically in real-time.</span>
                  </div>
                </div>

                <div className="section-feature-item">
                  <div className="feature-dot"></div>
                  <div className="feature-text-group">
                    <span className="feature-title">Secondary Liquidity</span>
                    <span className="feature-desc">Liquidate underperforming brackets or buy promising playoff runs directly from other users.</span>
                  </div>
                </div>
              </div>

              <Link href="/bracket" className="console-btn-primary">
                <span className="btn-text-wrapper">
                  Explore Bracket Index <ArrowRight size={14} className="spacer-ml-1" />
                </span>
              </Link>
            </div>

            {/* Column 2: Circular SVG Bracket Diagram */}
            <div className="bracket-tree-diagram layout-flex-center">
              <svg viewBox="0 0 360 360" className="w-full max-w-[320px] mx-auto">
                <defs>
                  <filter id="glow-green" x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-blue" x="-25%" y="-25%" width="150%" height="150%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Circular Concentric Rings */}
                <circle cx="180" cy="180" r="140" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                <circle cx="180" cy="180" r="90" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
                <circle cx="180" cy="180" r="40" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />

                {/* Radial Connection Vectors */}
                {/* Left Branch - Argentina side */}
                <path d="M 40 180 L 90 180" fill="none" stroke="#22c55e" strokeWidth="2.5" filter="url(#glow-green)" />
                <path d="M 50 100 L 90 180" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.5" />
                <path d="M 50 260 L 90 180" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.5" />
                <path d="M 90 180 L 140 180" fill="none" stroke="#22c55e" strokeWidth="2" />

                {/* Right Branch - France side */}
                <path d="M 320 180 L 270 180" fill="none" stroke="#3b82f6" strokeWidth="2.5" filter="url(#glow-blue)" />
                <path d="M 310 100 L 270 180" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.5" />
                <path d="M 310 260 L 270 180" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.5" />
                <path d="M 270 180 L 220 180" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />

                {/* Outer Round Badges (Flagcdn image nodes via foreignObject) */}
                <foreignObject x="35" y="85" width="30" height="30">
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="https://flagcdn.com/w80/hr.png" alt="Croatia" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </foreignObject>
                <circle cx="50" cy="100" r="15" fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />

                <foreignObject x="35" y="245" width="30" height="30">
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="https://flagcdn.com/w80/br.png" alt="Brazil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </foreignObject>
                <circle cx="50" cy="260" r="15" fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />

                <foreignObject x="295" y="85" width="30" height="30">
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="https://flagcdn.com/w80/ma.png" alt="Morocco" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </foreignObject>
                <circle cx="310" cy="100" r="15" fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />

                <foreignObject x="295" y="245" width="30" height="30">
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="https://flagcdn.com/w80/pt.png" alt="Portugal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </foreignObject>
                <circle cx="310" cy="260" r="15" fill="none" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />

                {/* Semifinals Badges */}
                <foreignObject x="70" y="160" width="40" height="40">
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="https://flagcdn.com/w80/ar.png" alt="Argentina" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </foreignObject>
                <circle cx="90" cy="180" r="20" fill="none" stroke="#22c55e" strokeWidth="2.5" filter="url(#glow-green)" />

                <foreignObject x="250" y="160" width="40" height="40">
                  <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="https://flagcdn.com/w80/fr.png" alt="France" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </foreignObject>
                <circle cx="270" cy="180" r="20" fill="none" stroke="#3b82f6" strokeWidth="2.5" filter="url(#glow-blue)" />

                {/* Winner Center Node */}
                <circle cx="180" cy="180" r="26" fill="rgba(34, 197, 94, 0.05)" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="180" cy="180" r="20" fill="#090d1a" stroke="#22c55e" strokeWidth="2" />
                <text x="180" y="183.5" fill="#22c55e" fontSize="11" fontWeight="bold" textAnchor="middle">🏆</text>
              </svg>
            </div>
          </div>
        </section>

        {/* Yield-Bearing Liquid Fantasy Section */}
        <section className="fantasy-preview-section">
          <div className="fantasy-preview-grid">
            {/* Column 1: Dynamic Pentagonal Shield Roster Cards */}
            <div className="fantasy-roster-grid">
              <LandingPlayerCard
                name="Lionel Messi"
                position="MID"
                flag="https://flagcdn.com/w80/ar.png"
                fotmobId={30981}
                fps="82.4"
                yieldVal="+18.5%"
                accentColor="#22c55e"
              />
              <LandingPlayerCard
                name="Kylian Mbappé"
                position="FWD"
                flag="https://flagcdn.com/w80/fr.png"
                fotmobId={701154}
                fps="79.1"
                yieldVal="+15.2%"
                accentColor="#3b82f6"
              />
              <LandingPlayerCard
                name="Emiliano Martínez"
                position="GK"
                flag="https://flagcdn.com/w80/ar.png"
                fotmobId={268375}
                fps="64.0"
                yieldVal="+12.4%"
                accentColor="#a855f7"
              />
            </div>

            {/* Column 2: Info and Copy */}
            <div>
              <span className="section-label">Aura Liquid Fantasy</span>
              <h2 className="section-title">
                Yield-Bearing <br /> <span>Roster Squads</span>
              </h2>
              <p className="section-description">
                Draft player roster options and pool collateral with your fantasy squad. Roster options function as dynamic asset contracts backed by career performance metrics, generating real-yield shares.
              </p>
              
              <div className="section-features-list">
                <div className="section-feature-item">
                  <div className="feature-dot"></div>
                  <div className="feature-text-group">
                    <span className="feature-title">Athlete Option Tokens</span>
                    <span className="feature-desc">Buy athlete performance options that track actual statistical metrics dynamically.</span>
                  </div>
                </div>

                <div className="section-feature-item">
                  <div className="feature-dot"></div>
                  <div className="feature-text-group">
                    <span className="feature-title">Dynamic Collateral Roster Pools</span>
                    <span className="feature-desc">Pool your squad's asset value to secure high-yield dynamic fee revenue shares.</span>
                  </div>
                </div>

                <div className="section-feature-item">
                  <div className="feature-dot"></div>
                  <div className="feature-text-group">
                    <span className="feature-title">Real-Time Oracle Integrations</span>
                    <span className="feature-desc">Roster value syncs securely with Solana nodes utilizing verified TxLINE sports data feed oracles.</span>
                  </div>
                </div>
              </div>

              <Link href="/fantasy" className="console-btn-primary">
                <span className="btn-text-wrapper">
                  Draft Your Squad <ArrowRight size={14} className="spacer-ml-1" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="console-footer">
          <span>© 2026 AuraPredict. Consensus verified by TxLINE Sports Oracle on Solana.</span>
          <div className="layout-flex-row layout-flex-gap-6 font-semibold">
            <Link href="/dashboard" className="hover:text-white transition-colors">Markets</Link>
            <Link href="/fantasy" className="hover:text-white transition-colors">Aura Fantasy</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
