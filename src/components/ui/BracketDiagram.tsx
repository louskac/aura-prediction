import React from "react";

export default function BracketDiagram() {
  return (
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
        <path d="M 50 180 L 90 180" fill="none" stroke="#22c55e" strokeWidth="2.5" filter="url(#glow-green)" />
        <path d="M 50 100 L 90 180" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.5" />
        <path d="M 50 260 L 90 180" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.5" />
        <path d="M 90 180 L 140 180" fill="none" stroke="#22c55e" strokeWidth="2" />

        {/* Right Branch - France side */}
        <path d="M 310 180 L 270 180" fill="none" stroke="#3b82f6" strokeWidth="2.5" filter="url(#glow-blue)" />
        <path d="M 310 100 L 270 180" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.5" />
        <path d="M 310 260 L 270 180" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1.5" />
        <path d="M 270 180 L 220 180" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" />

        {/* Outer Round Badges (Redesigned as slanted parallelograms) */}
        {/* Croatia */}
        <polygon points="30,88 64,88 70,112 36,112" fill="#131B2E" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />
        <foreignObject x="33" y="88" width="34" height="24">
          <div style={{ width: "100%", height: "100%", clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://flagcdn.com/w80/hr.png" alt="Croatia" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </foreignObject>

        {/* Brazil */}
        <polygon points="30,248 64,248 70,272 36,272" fill="#131B2E" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />
        <foreignObject x="33" y="248" width="34" height="24">
          <div style={{ width: "100%", height: "100%", clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://flagcdn.com/w80/br.png" alt="Brazil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </foreignObject>

        {/* Morocco */}
        <polygon points="290,88 324,88 330,112 296,112" fill="#131B2E" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />
        <foreignObject x="293" y="88" width="34" height="24">
          <div style={{ width: "100%", height: "100%", clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://flagcdn.com/w80/ma.png" alt="Morocco" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </foreignObject>

        {/* Portugal */}
        <polygon points="290,248 324,248 330,272 296,272" fill="#131B2E" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />
        <foreignObject x="293" y="248" width="34" height="24">
          <div style={{ width: "100%", height: "100%", clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://flagcdn.com/w80/pt.png" alt="Portugal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </foreignObject>

        {/* Semifinals Badges */}
        {/* Argentina */}
        <polygon points="64,165 108,165 116,195 72,195" fill="#131B2E" stroke="#22c55e" strokeWidth="2.5" filter="url(#glow-green)" />
        <foreignObject x="68" y="165" width="44" height="30">
          <div style={{ width: "100%", height: "100%", clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://flagcdn.com/w80/ar.png" alt="Argentina" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </foreignObject>

        {/* France */}
        <polygon points="244,165 288,165 296,195 252,195" fill="#131B2E" stroke="#3b82f6" strokeWidth="2.5" filter="url(#glow-blue)" />
        <foreignObject x="248" y="165" width="44" height="30">
          <div style={{ width: "100%", height: "100%", clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://flagcdn.com/w80/fr.png" alt="France" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </foreignObject>

        {/* Winner Center Node */}
        <polygon points="148,162 202,162 212,198 158,198" fill="rgba(34, 197, 94, 0.05)" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 3" />
        <polygon points="152,165 198,165 206,195 160,195" fill="#090d1a" stroke="#22c55e" strokeWidth="2" />
        <text x="178" y="184" fill="#22c55e" fontSize="13" fontWeight="bold" textAnchor="middle">🏆</text>
      </svg>
    </div>
  );
}
