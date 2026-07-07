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

import SashLogo from "@/components/ui/SashLogo";
import SlantedNavItem from "@/components/ui/SlantedNavItem";
import WalletBadge from "@/components/ui/WalletBadge";
import PlayerCard from "@/components/ui/PlayerCard";
import BracketDiagram from "@/components/ui/BracketDiagram";

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
        {/* Overhauled Navigation Bar */}
        <header className="console-header-overhaul">
          <Link href="/" className="header-logo-container">
            <SashLogo versionText="DEVNET.v1" showVersion={true} />
          </Link>

          <nav className="console-nav-overhaul">
            <SlantedNavItem href="/dashboard" slashColor="green">Trade Portal</SlantedNavItem>
            <SlantedNavItem href="/fantasy" slashColor="blue">Liquid Fantasy</SlantedNavItem>
            <SlantedNavItem href="/bracket" slashColor="purple">Bracket Indexes</SlantedNavItem>
          </nav>

          <div className="console-actions-overhaul">
            <WalletBadge address="GQZn...GK2P" balance="995.40 SOL" />
          </div>
        </header>

        {/* Spacious Immersive Hero Area */}
        <section className="console-hero">
          <div className="console-hero-label">
            <span className="label-slash green">/</span>
            <span className="label-text">Solana Sports Engine</span>
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
            <BracketDiagram />
          </div>
        </section>

        {/* Yield-Bearing Liquid Fantasy Section */}
        <section className="fantasy-preview-section">
          <div className="fantasy-preview-grid">
            {/* Column 1: Dynamic Pentagonal Shield Roster Cards */}
            <div className="fantasy-roster-grid">
              <PlayerCard
                name="Lionel Messi"
                position="MID"
                flag="https://flagcdn.com/w80/ar.png"
                fotmobId={30981}
                fps="82.4"
                yieldVal="+18.5%"
                accentColor="#22c55e"
              />
              <PlayerCard
                name="Kylian Mbappé"
                position="FWD"
                flag="https://flagcdn.com/w80/fr.png"
                fotmobId={701154}
                fps="79.1"
                yieldVal="+15.2%"
                accentColor="#3b82f6"
              />
              <PlayerCard
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

        {/* Overhauled Premium Console Footer */}
        <footer className="console-footer-overhaul">
          <div className="footer-grid-clean">
            {/* Column 1: Brand Info */}
            <div className="footer-brand-col">
              <div className="header-logo-container mb-3">
                <SashLogo versionText="DEVNET" showVersion={true} />
              </div>
              <p className="footer-subtext">
                Sports prediction index protocol on Solana. Verified on-chain consensus settling instantly.
              </p>
            </div>

            {/* Column 2: Developers */}
            <div className="footer-links-col">
              <span className="footer-col-lbl">[ PROTOCOL ]</span>
              <div className="footer-vertical-links">
                <SlantedNavItem href="/api-dump" slashColor="green">API Raw Dump</SlantedNavItem>
                <SlantedNavItem href="/admin" slashColor="blue">TxLINE Admin</SlantedNavItem>
                <SlantedNavItem href="https://txline-docs.txodds.com" slashColor="purple">TxLINE Docs</SlantedNavItem>
              </div>
            </div>

            {/* Column 3: Platform */}
            <div className="footer-links-col">
              <span className="footer-col-lbl">[ MARKETS ]</span>
              <div className="footer-vertical-links">
                <SlantedNavItem href="/markets" slashColor="teal">Fantasy Markets</SlantedNavItem>
                <SlantedNavItem href="/portfolio" slashColor="green">Fan Portfolio</SlantedNavItem>
                <SlantedNavItem href="/dashboard" slashColor="blue">Trade Portal</SlantedNavItem>
              </div>
            </div>
          </div>

          <div className="footer-bottom-divider"></div>

          <div className="footer-bottom">
            <span className="copyright font-mono">© 2026 AURAPREDICT. Consensus verified on Solana.</span>
            <div className="footer-socials font-mono">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">TWITTER</a>
              <span className="text-gray-700">/</span>
              <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="social-link">DISCORD</a>
              <span className="text-gray-700">/</span>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-link">GITHUB</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
