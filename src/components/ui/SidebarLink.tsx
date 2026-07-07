"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  activeColor?: string; // Optional custom color, but we unify to brand green for cleaner design
}

export default function SidebarLink({ 
  href, 
  icon, 
  children,
  activeColor
}: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  // Unify active menu styling to a single premium brand color (Neon Lime) to prevent "too many colors"
  const themeAccent = "var(--color-accent)"; 

  return (
    <Link 
      href={href}
      className={`sidebar-link ${isActive ? "active" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: isActive ? "10px 16px" : "10px 12px",
        borderRadius: "0px", 
        color: isActive ? "#fff" : "rgba(255, 255, 255, 0.45)",
        fontFamily: "var(--font-outfit)",
        fontWeight: isActive ? 850 : 500,
        fontSize: "12px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        whiteSpace: "nowrap", // Prevent text wrapping into the next line
        
        // Clean layout: inactive links have no background or borders to avoid convolution
        background: isActive 
          ? "rgba(157, 255, 0, 0.03)" 
          : "transparent",
        border: isActive 
          ? `1px solid rgba(157, 255, 0, 0.25)` 
          : "1px solid transparent",
        borderLeft: isActive 
          ? `3px solid ${themeAccent}` 
          : "1px solid transparent",
        
        position: "relative",
        overflow: "hidden",
        
        // Only active items are skewed, creating a clean indicator block without cluttering inactive items
        transform: isActive ? "skewX(-12deg)" : "none",
        boxShadow: isActive ? "0 4px 15px rgba(157, 255, 0, 0.08)" : "none"
      }}
    >
      {/* Subtle background glow for active link */}
      {isActive && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 10% 50%, rgba(157, 255, 0, 0.1), transparent 60%)`,
          pointerEvents: "none"
        }} />
      )}

      {/* Unskew children text back to upright (only if item is active/skewed) */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "10px", 
        width: "100%",
        transform: isActive ? "skewX(12deg)" : "none" 
      }}>
        {/* Slanted indicator slash: only highlighted on active item */}
        <span style={{ 
          fontWeight: 900, 
          color: themeAccent, 
          fontSize: "13px",
          width: "8px",
          textAlign: "center",
          opacity: isActive ? 1 : 0,
          transition: "opacity 0.2s ease"
        }}>
          /
        </span>

        <span style={{ 
          color: isActive ? themeAccent : "var(--color-text-dim)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.2s ease"
        }}>
          {icon}
        </span>
        
        <span style={{ 
          flexGrow: 1,
          transition: "transform 0.2s ease, color 0.2s ease",
          transform: isActive ? "translateX(2px)" : "none"
        }}>
          {children}
        </span>
      </div>
    </Link>
  );
}
