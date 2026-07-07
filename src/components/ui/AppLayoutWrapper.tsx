"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeft, User, HelpCircle } from "lucide-react";

interface MatchFixture {
  home: string;
  away: string;
  date: string;
}

interface AppLayoutWrapperProps {
  children: React.ReactNode;
  sidebarLogo: React.ReactNode;
  sidebarMenu: React.ReactNode;
  predictionsCount: number;
  draftedCount: number;
  upcomingMatches: MatchFixture[];
  truncatedWallet: string;
  solBalanceFormatted: string;
  txlBalanceFormatted: string;
  networkName: string;
  dotColor: string;
  fullWalletAddress: string;
}

function getAbstractArt(pathname: string) {
  const path = pathname || "";
  
  if (path.startsWith("/bracket")) {
    // Bracket Concentric paths
    return (
      <svg viewBox="0 0 400 400" width="100%" height="100%">
        <g stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7">
          <circle cx="200" cy="200" r="160" strokeDasharray="4,4" />
          <circle cx="200" cy="200" r="110" />
          <circle cx="200" cy="200" r="60" />
          <line x1="200" y1="40" x2="200" y2="360" />
          <line x1="40" y1="200" x2="360" y2="200" />
          <line x1="87" y1="87" x2="313" y2="313" />
          <line x1="87" y1="313" x2="313" y2="87" />
          <polygon points="190,30 210,30 215,50 185,50" fill="rgba(34, 197, 94, 0.1)" />
          <polygon points="190,350 210,350 215,370 185,370" fill="rgba(34, 197, 94, 0.1)" />
          <polygon points="350,190 350,210 370,215 370,185" fill="rgba(34, 197, 94, 0.1)" />
          <polygon points="30,190 30,210 50,215 50,185" fill="rgba(34, 197, 94, 0.1)" />
        </g>
      </svg>
    );
  }
  
  if (path.startsWith("/fantasy")) {
    // Football Pitch perspective matrix
    return (
      <svg viewBox="0 0 400 400" width="100%" height="100%">
        <g stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" transform="rotate(15 200 200)">
          <polygon points="100,80 300,80 350,320 50,320" />
          <line x1="200" y1="80" x2="200" y2="320" />
          <circle cx="200" cy="200" r="40" />
          <polygon points="150,80 250,80 260,130 140,130" />
          <polygon points="130,320 270,320 280,270 120,270" />
          <circle cx="200" cy="100" r="8" fill="currentColor" />
          <circle cx="150" cy="180" r="8" fill="currentColor" />
          <circle cx="250" cy="180" r="8" fill="currentColor" />
          <circle cx="200" cy="290" r="8" fill="currentColor" />
        </g>
      </svg>
    );
  }
  
  if (path.startsWith("/markets")) {
    // Stock Candlesticks and rising trend chart
    return (
      <svg viewBox="0 0 400 400" width="100%" height="100%">
        <g stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7">
          <line x1="50" y1="50" x2="50" y2="350" />
          <line x1="50" y1="350" x2="350" y2="350" />
          <line x1="50" y1="125" x2="350" y2="125" strokeDasharray="4,4" />
          <line x1="50" y1="200" x2="350" y2="200" strokeDasharray="4,4" />
          <line x1="50" y1="275" x2="350" y2="275" strokeDasharray="4,4" />
          <line x1="100" y1="180" x2="100" y2="280" />
          <rect x="92" y="200" width="16" height="60" fill="rgba(34, 197, 94, 0.1)" />
          <line x1="160" y1="130" x2="160" y2="230" />
          <rect x="152" y="150" width="16" height="50" fill="none" />
          <line x1="220" y1="80" x2="220" y2="190" />
          <rect x="212" y="100" width="16" height="60" fill="rgba(34, 197, 94, 0.1)" />
          <path d="M 50 320 Q 150 250 200 120 T 350 70" strokeWidth="2.5" />
        </g>
      </svg>
    );
  }
  
  if (path.startsWith("/portfolio")) {
    // Hexagonal Vault metrics
    return (
      <svg viewBox="0 0 400 400" width="100%" height="100%">
        <g stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7">
          <polygon points="200,40 320,110 320,290 200,360 80,290 80,110" />
          <polygon points="200,70 290,125 290,275 200,330 110,275 110,125" />
          <line x1="200" y1="40" x2="200" y2="360" />
          <line x1="80" y1="110" x2="320" y2="290" />
          <line x1="80" y1="290" x2="320" y2="110" />
        </g>
      </svg>
    );
  }

  // Dashboard / default (/dashboard, /admin, /api-dump) data grid console HUD
  return (
    <svg viewBox="0 0 400 400" width="100%" height="100%">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7">
        <rect x="50" y="50" width="300" height="300" strokeDasharray="4,4" />
        <circle cx="200" cy="200" r="120" />
        <line x1="200" y1="50" x2="200" y2="350" strokeDasharray="8,8" />
        <line x1="50" y1="200" x2="350" y2="200" strokeDasharray="8,8" />
        <rect x="80" y="100" width="40" height="80" fill="rgba(34, 197, 94, 0.1)" />
        <rect x="140" y="150" width="40" height="120" fill="rgba(34, 197, 94, 0.1)" />
        <rect x="200" y="80" width="40" height="160" fill="rgba(34, 197, 94, 0.1)" />
        <circle cx="280" cy="280" r="30" />
      </g>
    </svg>
  );
}

export default function AppLayoutWrapper({
  children,
  sidebarLogo,
  sidebarMenu,
  predictionsCount,
  draftedCount,
  upcomingMatches,
  truncatedWallet,
  solBalanceFormatted,
  txlBalanceFormatted,
  networkName,
  dotColor,
  fullWalletAddress
}: AppLayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard" || pathname === "/";
  
  // Real human language: convert SOL balance to rounded credits (e.g. 5.00 Credits)
  const solValueRaw = parseFloat(solBalanceFormatted.replace(/,/g, ""));
  const creditsFormatted = isNaN(solValueRaw) ? "0.00" : solValueRaw.toFixed(2);

  return (
    <div 
      className="landing-root" 
      style={{ 
        minHeight: "100vh", 
        display: "flex", 
        flexDirection: "column",
        paddingTop: "0px",
        paddingBottom: "0px"
      }}
    >
      {/* Immersive Cyberpunk HUD Backgrounds */}
      <div className="hero-bg-container">
        <div className="hero-bg-image"></div>
        <div className="hero-bg-overlay"></div>
      </div>

      <div className="grid-overlay"></div>
      
      {/* Glowing ambient lights */}
      <div className="console-glow-orb console-glow-primary"></div>
      <div className="console-glow-orb console-glow-accent"></div>

      {/* Floating expand button when sidebar is collapsed (Arc-browser style) */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand Sidebar"
          style={{
            position: "fixed",
            left: "20px",
            top: "24px",
            zIndex: 1000,
            background: "rgba(10, 15, 30, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "10px",
            cursor: "pointer",
            borderRadius: "0px",
            color: "var(--color-accent)",
            transform: "skewX(-12deg)",
            boxShadow: "0 0 15px rgba(34, 197, 94, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease"
          }}
        >
          <div style={{ transform: "skewX(12deg)" }}>
            <PanelLeft size={16} />
          </div>
        </button>
      )}

      {/* Dynamic Vertical Console Ruler (repeating ticks down the scroll height) */}
      <div style={{
        position: "fixed",
        right: "32px",
        top: "10%",
        bottom: "10%",
        width: "1px",
        background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.06) 80%, transparent)",
        zIndex: 1,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.12)", transform: "translateX(12px) rotate(90deg)" }}>SEC_01</span>
        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.12)", transform: "translateX(12px) rotate(90deg)" }}>SEC_02</span>
        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.12)", transform: "translateX(12px) rotate(90deg)" }}>SEC_03</span>
        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.12)", transform: "translateX(12px) rotate(90deg)" }}>SEC_04</span>
      </div>

      <div className="app-container" style={{ position: "relative", zIndex: 10 }}>
        {/* Desktop Sidebar Navigation */}
        <aside 
          className="sidebar" 
          style={{ 
            background: "rgba(10, 15, 30, 0.88)", 
            backdropFilter: "blur(20px)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            padding: "24px 20px",
            transform: isCollapsed ? "translateX(-260px)" : "translateX(0px)",
            transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex: 900
          }}
        >
          <div>
            {/* Sidebar Logo & Toggle Button */}
            <div 
              className="sidebar-logo" 
              style={{ 
                borderBottom: "1px solid rgba(255,255,255,0.06)", 
                paddingBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {sidebarLogo}
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                title="Collapse Sidebar"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(255, 255, 255, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  transition: "color 0.2s ease"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-accent)"}
                onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255, 255, 255, 0.3)"}
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
            
            <nav className="sidebar-menu" style={{ gap: "6px", marginTop: "24px" }}>
              {sidebarMenu}
            </nav>
          </div>
          
          {/* Clean, minimalist footer bar containing settings shortcuts (de-convoluted) */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "16px",
            width: "100%",
            transform: isCollapsed ? "skewX(12deg)" : "none"
          }}>
            <div style={{ display: "flex", gap: "16px" }}>
              <Link href="/portfolio" style={{ color: "rgba(255,255,255,0.35)", transition: "color 0.2s" }} title="User Profile">
                <User size={15} style={{ cursor: "pointer" }} />
              </Link>
              <a href="https://docs.txline.io" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.35)", transition: "color 0.2s" }} title="API Documentation">
                <HelpCircle size={15} style={{ cursor: "pointer" }} />
              </a>
            </div>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.15)", fontFamily: "monospace", letterSpacing: "0.5px" }}>AURA v1.0.0</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <div 
          className="main-content" 
          style={{ 
            minHeight: "100vh", 
            position: "relative", 
            zIndex: 10,
            marginLeft: isCollapsed ? "0px" : "var(--sidebar-width)",
            transition: "margin-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {/* Abstract fixed viewport backdrop (remains anchored when scrolling to prevent loss) */}
          <div style={{
            position: "fixed",
            right: isDashboard ? "35%" : "8%",
            top: "16%",
            width: "480px",
            height: "480px",
            opacity: 0.18,
            color: "var(--color-accent)",
            pointerEvents: "none",
            zIndex: 1,
            filter: "drop-shadow(0 0 12px rgba(34, 197, 94, 0.35))",
            transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            {getAbstractArt(pathname)}
          </div>

          {/* Header bar - Styled with premium horizontal border gradient from the landing page */}
          <header style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            paddingBottom: "20px",
            borderBottom: "2px solid transparent",
            borderImage: "linear-gradient(90deg, #22c55e 0%, #3b82f6 50%, #a855f7 100%) 1",
            boxShadow: "0 8px 30px -10px rgba(34, 197, 94, 0.12)",
            paddingLeft: isCollapsed ? "60px" : "0px", 
            transition: "padding-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            position: "relative",
            zIndex: 5
          }}>
            <div>
              <h1 className="gradient-text" style={{ 
                fontSize: "28px", 
                fontFamily: "var(--font-outfit)", 
                fontWeight: 900,
                letterSpacing: "-0.5px"
              }}>
                World Cup 2026 Fan Arena
              </h1>
              <p style={{ 
                color: "var(--color-text-muted)", 
                fontSize: "14px", 
                marginTop: "4px",
                fontFamily: "var(--font-outfit)",
                fontWeight: 500
              }}>
                Real-time sports data verifiable on-chain on Solana
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {/* Network Indicator Badge */}
              <div style={{ 
                background: "rgba(255, 255, 255, 0.02)", 
                border: "1px solid rgba(255, 255, 255, 0.05)",
                padding: "8px 14px", 
                borderRadius: "0px", 
                display: "flex", 
                alignItems: "center", 
                gap: "8px",
                fontFamily: "var(--font-outfit)",
                transform: "skewX(-12deg)"
              }}>
                <div style={{ 
                  width: "6px", 
                  height: "6px", 
                  borderRadius: "50%", 
                  backgroundColor: dotColor,
                  boxShadow: `0 0 6px ${dotColor}`,
                  transform: "skewX(12deg)"
                }}></div>
                <span style={{ 
                  fontSize: "11px", 
                  fontWeight: 900, 
                  color: "var(--color-text-muted)", 
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  transform: "skewX(12deg)"
                }}>
                  {networkName}
                </span>
              </div>

              {/* Wallet Balance Pill - Communicates in real human language, left aligned inside container */}
              <div 
                onClick={() => setIsWalletModalOpen(true)}
                title="Click to view Account Node details"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  padding: "6px 16px",
                  cursor: "pointer",
                  transform: "skewX(-12deg)",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
                className="hover-bright"
              >
                <span style={{
                  fontFamily: "var(--font-outfit), sans-serif",
                  fontWeight: 900,
                  fontSize: "16px",
                  color: "var(--color-accent)",
                  display: "inline-block",
                  transform: "skewX(12deg)"
                }}>/</span>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start", // Left-aligned next to slash for clean layout alignment
                  lineHeight: "1.1",
                  transform: "skewX(12deg)"
                }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                    FAN ACCOUNT
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 900, color: "#fff", letterSpacing: "-0.01em" }}>
                    {creditsFormatted} CREDITS
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="fade-in" style={{ paddingTop: "24px", position: "relative", zIndex: 5 }}>
            {children}
          </main>
        </div>
      </div>

      {/* Account Node Details Popup Modal */}
      {isWalletModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.8)",
          backdropFilter: "blur(8px)",
          zIndex: 2000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div 
            className="glass-panel" 
            style={{
              background: "rgba(10, 15, 30, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderTop: "4px solid var(--color-accent)",
              padding: "32px",
              width: "100%",
              maxWidth: "460px",
              transform: "skewX(-6deg)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)"
            }}
          >
            <div style={{ transform: "skewX(6deg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px", color: "#fff" }}>
                  // Account Node Status
                </h3>
                <button 
                  onClick={() => setIsWalletModalOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    fontWeight: 700
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-accent)"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255, 255, 255, 0.4)"}
                >
                  [ CLOSE ]
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontFamily: "monospace", fontSize: "11.5px" }}>
                <div style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "14px" }}>
                  <div style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "9px", marginBottom: "4px", letterSpacing: "0.05em" }}>
                    FAN WALLET IDENTITY (SOLANA ADDRESS)
                  </div>
                  <div style={{ wordBreak: "break-all", color: "#fff", fontWeight: 700 }}>
                    {fullWalletAddress}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "14px" }}>
                  <div>
                    <div style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "9px", marginBottom: "4px", letterSpacing: "0.05em" }}>
                      PLAYING CREDITS
                    </div>
                    <div style={{ color: "var(--color-accent)", fontSize: "16px", fontWeight: 900 }}>
                      {creditsFormatted} CREDITS
                    </div>
                    <div style={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "8px", marginTop: "2px" }}>
                      ({solBalanceFormatted} SOL)
                    </div>
                  </div>
                  <div>
                    <div style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "9px", marginBottom: "4px", letterSpacing: "0.05em" }}>
                      PORTFOLIO VALUE
                    </div>
                    <div style={{ color: "#fff", fontSize: "16px", fontWeight: 900 }}>
                      {parseFloat(txlBalanceFormatted).toFixed(2)} TXL
                    </div>
                    <div style={{ color: "rgba(255, 255, 255, 0.2)", fontSize: "8px", marginTop: "2px" }}>
                      (Aura Protocol Assets)
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>SOLANA LAYER:</span>
                    <span style={{ color: "#fff", fontWeight: 700 }}>{networkName}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>TXLINE ORACLE FEED:</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>CONNECTED (ONLINE)</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>CONSENSUS STATUS:</span>
                    <span style={{ color: "#10b981", fontWeight: 700 }}>SECURED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
