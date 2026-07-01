"use client";

import React, { useState } from "react";
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
  HelpCircle,
  TrendingDown
} from "lucide-react";

export default function LandingPage() {
  const [selectedMatchScenario, setSelectedMatchScenario] = useState<"favorite" | "upset">("upset");

  return (
    <div className="landing-root">
      {/* Dynamic Cyberpunk Background Accents */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="grid-overlay"></div>

      {/* Header/Navbar */}
      <header className="landing-header">
        <div className="brand">
          <Trophy size={28} className="text-accent-glow" />
          <span className="brand-text">AURAPREDICT</span>
        </div>
        <div className="header-meta">
          <span className="network-badge">
            <span className="dot animate-pulse"></span>
            Solana Devnet Active
          </span>
          <Link href="/dashboard" className="btn-primary-glow btn-sm">
            Launch App <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="concept-tag fade-in">
            <ShieldCheck size={14} /> Decentralized Oracle-Verified Bracket Portfolios
          </div>
          <h1 className="hero-title fade-in">
            Predict. Trade. <span className="gradient-accent-text">Hedge.</span>
          </h1>
          <p className="hero-subtitle fade-in">
            AuraPredict assetizes tournament brackets into **Structured portfolios of conditional option shares** on the Solana blockchain. Mint your predictions as a tradeable NFT, track real-time Net Asset Value (NAV), and exit or double-down mid-tournament.
          </p>
          <div className="hero-ctas fade-in">
            <Link href="/dashboard" className="btn-primary-glow btn-lg">
              Enter Platform <ArrowRight size={20} />
            </Link>
            <Link href="/bracket" className="btn-secondary btn-lg">
              Interactive Bracket
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works / Core Innovation Cards */}
      <section className="section features-section">
        <div className="section-header">
          <h2 className="section-title">Deconstructing The Innovation</h2>
          <p className="section-subtitle">
            Traditional brackets are binary all-or-nothing games. AuraPredict treats brackets as tradeable index portfolios driven by automated option pricing.
          </p>
        </div>

        <div className="features-grid">
          <div className="glass-panel feature-card">
            <div className="feature-icon-wrapper">
              <PieChart size={24} className="feature-icon" />
            </div>
            <h3>1. Bracket NFT Indexing</h3>
            <p>
              Locking your bracket allocates your USDC buy-in across 31 individual match options. Your Bracket NFT serves as a non-custodial index token whose value is the real-time sum of its active constituent shares.
            </p>
          </div>

          <div className="glass-panel feature-card">
            <div className="feature-icon-wrapper">
              <TrendingUp size={24} className="feature-icon" />
            </div>
            <h3>2. Organic Upset Leverage</h3>
            <p>
              No arbitrary scoring rules. If you predict a major underdog to win, you buy their YES shares cheap (e.g. $0.05). If they win, the option matures to $1.00, yielding a 20x return on that node automatically.
            </p>
          </div>

          <div className="glass-panel feature-card">
            <div className="feature-icon-wrapper">
              <RefreshCw size={24} className="feature-icon" />
            </div>
            <h3>3. Secondary Market Hedging</h3>
            <p>
              Since your bracket's point standing and future paths are recorded on-chain, you can trade your active bracket mid-tournament on Solana NFT marketplaces. Sell a front-running bracket to lock in guaranteed yield.
            </p>
          </div>

          <div className="glass-panel feature-card">
            <div className="feature-icon-wrapper">
              <ShieldCheck size={24} className="feature-icon" />
            </div>
            <h3>4. Oracle-Driven Settlement</h3>
            <p>
              The TxLINE sports oracle cryptographically signatures and settles match outcomes directly on the Solana blockchain, ensuring secure, decentralized payouts directly to the final token holders.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Options Simulator Widget */}
      <section className="section simulator-section">
        <div className="simulator-container glass-panel">
          <div className="simulator-info">
            <div className="feature-icon-wrapper mini">
              <TrendingUp size={20} className="text-accent" />
            </div>
            <h2>Option Pricing Simulator</h2>
            <p>
              Toggle below to see how predicting favorites vs. underdogs affects your initial bracket purchase price and potential return multiplier when the game resolves.
            </p>
            <div className="scenario-toggles">
              <button 
                onClick={() => setSelectedMatchScenario("favorite")} 
                className={`toggle-btn ${selectedMatchScenario === "favorite" ? "active" : ""}`}
              >
                Predict Favorite (e.g. Argentina)
              </button>
              <button 
                onClick={() => setSelectedMatchScenario("upset")} 
                className={`toggle-btn ${selectedMatchScenario === "upset" ? "active" : ""}`}
              >
                Predict Upset (e.g. Cape Verde)
              </button>
            </div>
          </div>

          <div className="simulator-card">
            <div className="card-header">
              <span className="card-lbl">SOLANA OPTION CONTRACT</span>
              <span className="card-id">#BIT-2026-R32</span>
            </div>
            <div className="simulator-stats">
              <div className="stat-row">
                <span>Contract Cost</span>
                <span className="stat-value text-white">
                  {selectedMatchScenario === "favorite" ? "$0.90 USDC" : "$0.05 USDC"}
                </span>
              </div>
              <div className="stat-row">
                <span>Settlement Value (On Win)</span>
                <span className="stat-value text-white">$1.00 USDC</span>
              </div>
              <div className="stat-row highlight">
                <span>Net Profit</span>
                <span className="stat-value text-success">
                  {selectedMatchScenario === "favorite" ? "+$0.10 USDC" : "+$0.95 USDC"}
                </span>
              </div>
              <div className="stat-row highlight">
                <span>Leverage Multiplier</span>
                <span className="stat-value text-accent">
                  {selectedMatchScenario === "favorite" ? "1.11x Return" : "20.00x Return"}
                </span>
              </div>
            </div>
            <div className="simulator-chart-bar">
              <div 
                className="fill-bar" 
                style={{ 
                  width: selectedMatchScenario === "favorite" ? "90%" : "5%",
                  backgroundColor: selectedMatchScenario === "favorite" ? "var(--color-primary)" : "var(--color-accent)"
                }}
              ></div>
            </div>
            <div className="bar-labels">
              <span>Cost Share</span>
              <span>Potential Return ({selectedMatchScenario === "favorite" ? "+11%" : "+1900%"})</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="cta-footer-section">
        <h2>Ready to Assetize Your Bracket?</h2>
        <p>AuraPredict is live on Solana Devnet. Mint your World Cup Bracket Index and start trading today.</p>
        <Link href="/dashboard" className="btn-primary-glow btn-lg">
          Launch AuraPredict <ArrowRight size={20} />
        </Link>
      </section>

      <footer className="landing-footer-credits">
        <span>© 2026 AuraPredict. Verified by TxLINE Sports Oracle on Solana.</span>
        <span>All markets carry risk. Speculate responsibly.</span>
      </footer>

      {/* Landing Page Scoped CSS Styling */}
      <style jsx global>{`
        .landing-root {
          min-height: 100vh;
          background-color: var(--bg-primary);
          color: var(--color-text-main);
          font-family: var(--font-inter);
          position: relative;
          overflow: hidden;
          padding-bottom: 80px;
        }

        /* Ambient Orbs */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          z-index: 1;
          opacity: 0.18;
          pointer-events: none;
        }
        .orb-1 {
          top: -10%;
          left: 15%;
          width: 500px;
          height: 500px;
          background: var(--color-primary);
        }
        .orb-2 {
          bottom: 20%;
          right: 10%;
          width: 600px;
          height: 600px;
          background: var(--color-accent);
        }

        /* Cyberpunk Grid Overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 50px 50px;
          z-index: 2;
          pointer-events: none;
        }

        /* Header Navbar */
        .landing-header {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          margin: 0 auto;
          height: var(--navbar-height);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          border-bottom: 1px solid var(--border-light);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .brand-text {
          font-family: var(--font-outfit);
          font-size: 24px;
          font-weight: 900;
          background: linear-gradient(135deg, #fff 0%, var(--color-primary-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .header-meta {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .network-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: var(--color-success);
          font-size: 13px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 9999px;
        }
        .network-badge .dot {
          width: 6px;
          height: 6px;
          background-color: var(--color-success);
          border-radius: 50%;
        }

        /* Buttons styling */
        .btn-primary-glow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background-color: var(--color-primary);
          color: #fff;
          font-weight: 600;
          border-radius: 12px;
          border: 1px solid var(--color-primary-light);
          box-shadow: 0 0 16px var(--border-glow);
          transition: var(--transition-smooth);
          cursor: pointer;
        }
        .btn-primary-glow:hover {
          background-color: var(--color-primary-light);
          box-shadow: 0 0 24px rgba(131, 103, 248, 0.45);
          transform: translateY(-2px);
        }
        .btn-sm {
          padding: 8px 16px;
          font-size: 14px;
        }
        .btn-lg {
          padding: 16px 32px;
          font-size: 16px;
        }
        .btn-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-light);
          color: #fff;
          font-weight: 600;
          border-radius: 12px;
          transition: var(--transition-smooth);
          cursor: pointer;
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--color-text-muted);
          transform: translateY(-2px);
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          z-index: 10;
          max-width: 1000px;
          margin: 0 auto;
          padding: 100px 24px 60px 24px;
          text-align: center;
        }
        .concept-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(95, 59, 246, 0.1);
          border: 1px solid var(--border-glow);
          color: var(--color-primary-light);
          font-weight: 600;
          font-size: 13px;
          padding: 8px 16px;
          border-radius: 9999px;
          margin-bottom: 24px;
        }
        .hero-title {
          font-size: 72px;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
        }
        .hero-subtitle {
          font-size: 19px;
          line-height: 1.6;
          color: var(--color-text-muted);
          max-width: 760px;
          margin: 0 auto 40px auto;
        }
        .hero-ctas {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        /* Sections general */
        .section {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
        }
        .section-header {
          text-align: center;
          margin-bottom: 60px;
        }
        .section-title {
          font-size: 40px;
          font-weight: 800;
          margin-bottom: 16px;
        }
        .section-subtitle {
          font-size: 16px;
          color: var(--color-text-muted);
          max-width: 600px;
          margin: 0 auto;
        }

        /* Features grid */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
        }
        .feature-card {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .feature-icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          background: rgba(95, 59, 246, 0.1);
          border: 1px solid var(--border-glow);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .feature-icon-wrapper.mini {
          width: 40px;
          height: 40px;
          border-radius: 10px;
        }
        .feature-icon {
          color: var(--color-primary-light);
        }
        .feature-card h3 {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
        }
        .feature-card p {
          font-size: 14.5px;
          line-height: 1.6;
          color: var(--color-text-muted);
        }

        /* Options Simulator Widget */
        .simulator-section {
          display: flex;
          justify-content: center;
        }
        .simulator-container {
          width: 100%;
          max-width: 950px;
          padding: 48px;
          display: flex;
          align-items: center;
          gap: 48px;
        }
        .simulator-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .simulator-info h2 {
          font-size: 32px;
          font-weight: 800;
        }
        .simulator-info p {
          font-size: 15px;
          line-height: 1.6;
          color: var(--color-text-muted);
        }
        .scenario-toggles {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }
        .toggle-btn {
          width: 100%;
          text-align: left;
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-light);
          color: var(--color-text-muted);
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--border-glow);
        }
        .toggle-btn.active {
          color: #fff;
          background: rgba(95, 59, 246, 0.12);
          border-color: var(--color-primary-light);
          box-shadow: 0 0 12px rgba(95, 59, 246, 0.15);
        }

        .simulator-card {
          width: 380px;
          background: rgba(4, 8, 21, 0.8);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.02);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 12px;
        }
        .card-lbl {
          font-size: 11px;
          font-weight: 800;
          color: var(--color-text-dim);
          letter-spacing: 0.1em;
        }
        .card-id {
          font-size: 12px;
          font-weight: 700;
          color: var(--color-accent);
        }
        .simulator-stats {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: var(--color-text-muted);
        }
        .stat-row.highlight {
          border-top: 1px dashed var(--border-light);
          padding-top: 12px;
          font-weight: 600;
        }
        .stat-value {
          font-family: var(--font-outfit);
          font-size: 16px;
          font-weight: 700;
        }
        .text-white { color: #fff; }
        .text-success { color: var(--color-success); }
        .text-accent { color: var(--color-accent); }

        .simulator-chart-bar {
          height: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }
        .fill-bar {
          height: 100%;
          border-radius: 999px;
          transition: var(--transition-smooth);
        }
        .bar-labels {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--color-text-dim);
        }

        /* CTA Footer Section */
        .cta-footer-section {
          position: relative;
          z-index: 10;
          max-width: 800px;
          margin: 0 auto;
          padding: 80px 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .cta-footer-section h2 {
          font-size: 40px;
          font-weight: 800;
        }
        .cta-footer-section p {
          font-size: 16px;
          color: var(--color-text-muted);
          max-width: 500px;
          margin-bottom: 12px;
        }

        /* Footer Credits */
        .landing-footer-credits {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          margin: 40px auto 0 auto;
          border-top: 1px solid var(--border-light);
          padding: 24px;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--color-text-dim);
        }

        /* Text glows */
        .text-accent-glow {
          color: var(--color-accent);
          filter: drop-shadow(0 0 6px var(--color-accent-dim));
        }

        /* Responsive adaptations */
        @media (max-width: 900px) {
          .simulator-container {
            flex-direction: column;
            padding: 32px;
          }
          .simulator-card {
            width: 100%;
          }
          .hero-title {
            font-size: 50px;
          }
          .landing-footer-credits {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
