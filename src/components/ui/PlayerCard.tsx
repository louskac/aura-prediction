import React, { useState } from "react";

interface PlayerCardProps {
  name: string;
  position: string;
  flag: string;
  fotmobId: number;
  fps: string;
  yieldVal: string;
  accentColor: string;
}

export default function PlayerCard({
  name,
  position,
  flag,
  fotmobId,
  fps,
  yieldVal,
  accentColor
}: PlayerCardProps) {
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
  
  const isInvalidId = !fotmobId || fotmobId === 0;
  let photoUrl = isInvalidId ? "" : `https://images.fotmob.com/image_resources/playerimages/${fotmobId}.png`;

  const [imgError, setImgError] = useState(false);

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
            borderRadius: "0px"
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
            {!imgError && !isInvalidId ? (
              <img
                src={photoUrl}
                alt={name}
                onError={() => setImgError(true)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  filter: "drop-shadow(0px 3px 5px rgba(0,0,0,0.6))",
                  zIndex: 2
                }}
              />
            ) : (
              <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", zIndex: 2 }}>
                <circle cx="50" cy="40" r="20" fill="rgba(255,255,255,0.15)" />
                <path d="M 20 80 Q 50 50 80 80" fill="rgba(255,255,255,0.15)" />
              </svg>
            )}
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
