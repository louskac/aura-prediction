import React, { useState } from "react";
import { Plus } from "lucide-react";

export interface Player {
  id: number;
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  team: string;
  basePrice: number;
  currentPrice: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  previousPoints: number;
  currentPoints: number;
  fotmobId?: number | null;
}

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  "Argentina": { primary: "#74ACDF", secondary: "#FFFFFF" },
  "Brazil": { primary: "#FFDF00", secondary: "#009B3A" },
  "France": { primary: "#002395", secondary: "#ED2939" },
  "Germany": { primary: "#000000", secondary: "#FFCC00" },
  "Spain": { primary: "#C60B1E", secondary: "#F1BF00" },
  "England": { primary: "#FFFFFF", secondary: "#CE1126" },
  "Portugal": { primary: "#FF0000", secondary: "#006600" },
  "Netherlands": { primary: "#FF4F00", secondary: "#002147" },
  "Italy": { primary: "#0066FF", secondary: "#FFFFFF" },
  "Belgium": { primary: "#E30613", secondary: "#FFE600" },
  "Croatia": { primary: "#FF0000", secondary: "#FFFFFF" },
  "Uruguay": { primary: "#0081C6", secondary: "#FFFFFF" },
  "USA": { primary: "#002868", secondary: "#BF0A30" },
  "United States": { primary: "#002868", secondary: "#BF0A30" },
  "Mexico": { primary: "#006847", secondary: "#CE1126" },
  "Japan": { primary: "#000080", secondary: "#FFFFFF" },
  "Morocco": { primary: "#C1272D", secondary: "#006233" },
  "Senegal": { primary: "#00853F", secondary: "#E31B23" },
  "Canada": { primary: "#FF0000", secondary: "#FFFFFF" },
  "Switzerland": { primary: "#D52B1E", secondary: "#FFFFFF" },
  "Denmark": { primary: "#C60C30", secondary: "#FFFFFF" },
  "Sweden": { primary: "#006AA7", secondary: "#FECC02" },
  "Norway": { primary: "#EF2B2D", secondary: "#00205B" },
  "Poland": { primary: "#DC143C", secondary: "#FFFFFF" },
  "Ukraine": { primary: "#0057B7", secondary: "#FFD700" },
  "Austria": { primary: "#ED2939", secondary: "#FFFFFF" },
  "Turkey": { primary: "#E30A17", secondary: "#FFFFFF" },
  "Colombia": { primary: "#FCD116", secondary: "#003893" },
  "Egypt": { primary: "#C1272D", secondary: "#000000" },
  "South Africa": { primary: "#007A4D", secondary: "#FFB612" },
  "Australia": { primary: "#00008B", secondary: "#FFCD00" },
  "South Korea": { primary: "#FFFFFF", secondary: "#CD1E3C" },
  "Ecuador": { primary: "#FFDD00", secondary: "#032F6F" },
  "Paraguay": { primary: "#D52B1E", secondary: "#0038A8" },
  "Ivory Coast": { primary: "#F77F00", secondary: "#009E60" },
  "DR Congo": { primary: "#007FFF", secondary: "#FCD116" },
  "Cape Verde": { primary: "#003893", secondary: "#CF0921" },
  "Bosnia and Herzegovina": { primary: "#002395", secondary: "#FECB00" },
  "Algeria": { primary: "#006633", secondary: "#D2143A" },
  "Ghana": { primary: "#FCD116", secondary: "#111111" }
};

function PlayerAvatar({ player }: { player: Player }) {
  const [hasError, setHasError] = useState(false);
  const colors = TEAM_COLORS[player.team] || { primary: "#5f3bf6", secondary: "#00e5ff" };
  const initials = player.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  
  const getPositionGlow = (pos: string) => {
    switch (pos) {
      case "GK": return "#f59e0b";
      case "DEF": return "#06b6d4";
      case "MID": return "#a855f7";
      case "FWD": return "#22c55e"; // Synced to brand green
      default: return "#00e5ff";
    }
  };
  
  const glow = getPositionGlow(player.position);
  
  if (player.fotmobId && !hasError) {
    const photoUrl = `https://images.fotmob.com/image_resources/playerimages/${player.fotmobId}.png`;
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img 
          src={photoUrl} 
          alt={player.name}
          onError={() => setHasError(true)}
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
    );
  }
  
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`bg-grad-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="0.45" />
          <stop offset="50%" stopColor="rgba(10, 15, 30, 0.9)" />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.25" />
        </linearGradient>
        <filter id={`glow-${player.id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Background card */}
      <rect width="100" height="100" fill={`url(#bg-grad-${player.id})`} rx="0" />
      
      {/* Abstract Circuit lines */}
      <path d="M 10 20 L 30 20 L 40 30 M 90 20 L 70 20 L 60 30 M 10 80 L 30 80 L 45 65" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />
      <circle cx="40" cy="30" r="1.5" fill="rgba(255,255,255,0.2)" />
      <circle cx="60" cy="30" r="1.5" fill="rgba(255,255,255,0.2)" />
      <circle cx="45" cy="65" r="1.5" fill="rgba(255,255,255,0.2)" />

      {/* HUD overlays */}
      <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.03)" strokeWidth="1" fill="none" strokeDasharray="5, 3" />
      <circle cx="50" cy="50" r="44" stroke={glow} strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
      
      {/* Stylized Silhouette */}
      <path d="M 38 48 C 38 28, 62 28, 62 48" fill="rgba(255,255,255,0.12)" />
      <circle cx="50" cy="42" r="11" fill="rgba(255,255,255,0.18)" />
      
      <path d="M 46 51 L 54 51 L 54 55 L 46 55 Z" fill="rgba(255,255,255,0.15)" />
      <path d="M 30 72 C 30 58, 70 58, 70 72 Z" fill="rgba(255,255,255,0.22)" />
      
      {/* Visor */}
      <rect x="42" y="38" width="16" height="4" rx="1" fill={glow} filter={`url(#glow-${player.id})`} />
      <line x1="39" y1="40" x2="61" y2="40" stroke={glow} strokeWidth="0.5" strokeOpacity="0.6" />

      {/* Team Color Chest Overlay */}
      <path d="M 45 61 L 55 61 L 57 72 L 43 72 Z" fill={colors.primary} opacity="0.65" />
      
      {/* Initials Text */}
      <text x="50" y="69" fontSize="8" fontWeight="900" fill="#fff" textAnchor="middle" opacity="0.85" style={{ letterSpacing: '0.5px' }}>
        {initials}
      </text>

      {/* Star emblem */}
      <circle cx="50" cy="14" r="5" fill="rgba(0,0,0,0.4)" stroke={glow} strokeWidth="0.75" />
      <text x="50" y="16.5" fontSize="7" fontWeight="bold" fill="#fff" textAnchor="middle">
        ★
      </text>
    </svg>
  );
}

interface PitchCardProps {
  player: Player | null;
  position: "GK" | "DEF" | "MID" | "FWD";
  onClick: () => void;
  onRemove?: () => void;
  onFocus?: () => void;
  color: string;
  flag: string;
}

export default function PitchCard({ 
  player, 
  position, 
  onClick, 
  onRemove, 
  onFocus, 
  color, 
  flag 
}: PitchCardProps) {
  const [hovered, setHovered] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    setRotateX((yc - y) / 5);
    setRotateY((x - xc) / 5);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  if (!player) {
    return (
      <div 
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "95px",
          height: "142px",
          position: "relative",
          cursor: "pointer",
          clipPath: "polygon(0% 0%, 100% 0%, 100% 82%, 50% 100%, 0% 82%)",
          background: hovered 
            ? `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.06) 100%)`
            : "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          padding: "1.5px",
          transition: "transform 0.2s ease, filter 0.2s ease",
          transform: hovered ? "scale(1.05)" : "scale(1)",
          filter: hovered 
            ? `drop-shadow(0 10px 20px rgba(0,0,0,0.5)) drop-shadow(0 0 8px ${color}55)` 
            : "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
        }}
      >
        <div style={{
          width: "100%",
          height: "100%",
          clipPath: "polygon(0% 0%, 100% 0%, 100% 82%, 50% 100%, 0% 82%)",
          background: "rgba(10, 15, 30, 0.7)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px"
        }}>
          <Plus size={20} color={color} />
          <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-text-dim)", letterSpacing: "1px" }}>DRAFT</span>
        </div>
      </div>
    );
  }

  const lastName = player.name.split(" ").slice(-1)[0];

  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onFocus}
      style={{
        width: "110px",
        height: "165px",
        position: "relative",
        cursor: "pointer",
        clipPath: "polygon(0% 0%, 100% 0%, 100% 82%, 50% 100%, 0% 82%)",
        background: hovered 
          ? `linear-gradient(135deg, var(--color-accent) 0%, ${color} 100%)`
          : `linear-gradient(135deg, ${color}55 0%, rgba(255,255,255,0.05) 50%, ${color}22 100%)`,
        padding: "1.5px",
        transition: "transform 0.1s ease, filter 0.3s ease",
        transform: hovered 
          ? `perspective(300px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.08) translateY(-4px)` 
          : "perspective(300px) rotateX(0deg) rotateY(0deg) scale(1)",
        filter: hovered 
          ? `drop-shadow(0 15px 30px rgba(0,0,0,0.6)) drop-shadow(0 0 15px ${color}88)` 
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

        {/* Remove Card button */}
        {onRemove && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              background: "var(--color-danger)",
              color: "#fff",
              border: "none",
              borderRadius: "0px",
              transform: "skewX(-12deg)",
              width: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              cursor: "pointer",
              zIndex: 20,
              boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
            }}
          >
            <span style={{ transform: "skewX(12deg)", display: "inline-block" }}>&times;</span>
          </button>
        )}

        {/* Card Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <span style={{ fontSize: "11px" }}>
            <span style={{ display: "inline-flex", borderRadius: "0px", overflow: "hidden", width: "13px", height: "13px", border: "0.5px solid rgba(255,255,255,0.2)" }}>
              <img src={flag} alt="flag" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </span>
          </span>
          <span style={{ 
            fontSize: "8px", 
            fontWeight: 850, 
            background: color, 
            color: position === "FWD" || position === "MID" ? "#000" : "#fff",
            padding: "1px 4px", 
            borderRadius: "0px",
            transform: "skewX(-12deg)",
            display: "inline-block"
          }}><span style={{ transform: "skewX(12deg)", display: "inline-block" }}>{position}</span></span>
        </div>

        {/* Player Avatar */}
        <div style={{ 
          width: "54px", 
          height: "54px", 
          margin: "4px auto", 
          position: "relative",
          zIndex: 10
        }}>
          <PlayerAvatar player={player} />
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
          <span style={{ fontSize: "8px", color: "var(--color-text-muted)" }}>${(player.currentPrice / 1000000).toFixed(1)}M</span>
          <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.2)" }}>•</span>
          <span style={{ fontSize: "9px", fontWeight: 850, color: "var(--color-accent)" }}>{player.currentPoints} pts</span>
        </div>
      </div>
    </div>
  );
}
