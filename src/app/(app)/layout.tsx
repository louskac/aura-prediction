import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, Trophy, LineChart, FolderHeart, ShieldCheck, Database, Wallet, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "AuraPredict | World Cup Bracket & Prediction Markets",
  description: "Verify live scores on-chain, trade fantasy prediction markets, and predict tournament brackets with real-time analytics.",
};

import { txline } from "@/services/txline";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const status = await txline.getStatus();
  const solBalanceFormatted = status.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const txlBalanceFormatted = status.txlBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const truncatedWallet = status.walletExists
    ? `${status.walletAddress.substring(0, 4)}...${status.walletAddress.substring(status.walletAddress.length - 4)}`
    : "No Wallet";
  
  const isDevnet = status.network === "devnet";
  const networkName = isDevnet ? "Solana Devnet" : "Solana Mainnet";
  const dotColor = isDevnet ? "var(--color-success)" : "#ffb700";
  return (
    <div className="app-container">
          {/* Desktop Sidebar Navigation */}
          <aside className="sidebar">
            <div>
              <div className="sidebar-logo">
                <Trophy size={28} color="#9dff00" />
                <span className="sidebar-logo-text">AURAPREDICT</span>
              </div>
              <nav className="sidebar-menu">
                <Link href="/dashboard" className="sidebar-link">
                  <LayoutDashboard size={20} />
                  Dashboard
                </Link>
                <Link href="/bracket" className="sidebar-link">
                  <Trophy size={20} />
                  Bracket Predictor
                </Link>
                <Link href="/fantasy" className="sidebar-link">
                  <Activity size={20} />
                  Aura Fantasy
                </Link>
                <Link href="/markets" className="sidebar-link">
                  <LineChart size={20} />
                  Fantasy Markets
                </Link>
                <Link href="/portfolio" className="sidebar-link">
                  <FolderHeart size={20} />
                  Fan Portfolio
                </Link>
                <Link href="/admin" className="sidebar-link">
                  <ShieldCheck size={20} />
                  TxLINE Admin
                </Link>
                <Link href="/api-dump" className="sidebar-link">
                  <Database size={20} />
                  API Raw Dump
                </Link>
              </nav>
            </div>
            
            <div className="sidebar-footer">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--color-text-muted)" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "var(--color-accent)" }}></div>
                TxLINE API Connected
              </div>
            </div>
          </aside>

          {/* Mobile Bottom Navigation Bar */}
          <nav className="bottom-nav">
            <Link href="/" className="bottom-nav-link">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/bracket" className="bottom-nav-link">
              <Trophy size={20} />
              <span>Bracket</span>
            </Link>
            <Link href="/fantasy" className="bottom-nav-link">
              <Activity size={20} />
              <span>Fantasy</span>
            </Link>
            <Link href="/markets" className="bottom-nav-link">
              <LineChart size={20} />
              <span>Markets</span>
            </Link>
            <Link href="/portfolio" className="bottom-nav-link">
              <FolderHeart size={20} />
              <span>Portfolio</span>
            </Link>
            <Link href="/admin" className="bottom-nav-link">
              <ShieldCheck size={20} />
              <span>TxLINE</span>
            </Link>
          </nav>

          {/* Main Content Area */}
          <div className="main-content">
            {/* Header bar */}
            <header style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              paddingBottom: "20px",
              borderBottom: "1px solid var(--border-light)"
            }}>
              <div>
                <h1 className="gradient-text" style={{ fontSize: "28px" }}>World Cup 2026 Fan Arena</h1>
                <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginTop: "4px" }}>
                  Real-time sports data verifiable on-chain on Solana
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {/* Network Indicator Badge */}
                <div className="glass-panel" style={{ padding: "8px 16px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: dotColor }}></div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                    {networkName}
                  </span>
                </div>

                {/* Wallet Balance Pill */}
                <div className="glass-panel" style={{ 
                  padding: "8px 16px", 
                  borderRadius: "10px", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "12px",
                  border: "1px solid var(--border-light)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-dim)" }}>
                    <Wallet size={16} />
                    <span style={{ fontSize: "11px", fontWeight: 600 }}>{truncatedWallet}</span>
                  </div>
                  <div style={{ width: "1px", height: "18px", backgroundColor: "var(--border-light)" }}></div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-main)" }}>
                      {solBalanceFormatted} SOL
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--color-accent)", fontWeight: 700 }}>
                      {txlBalanceFormatted} TxL
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <main className="fade-in">
              {children}
            </main>
          </div>
        </div>
  );
}
