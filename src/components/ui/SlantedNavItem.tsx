import React from "react";
import Link from "next/link";

interface SlantedNavItemProps {
  href: string;
  slashColor: "green" | "blue" | "purple" | "teal";
  children: React.ReactNode;
}

export default function SlantedNavItem({ href, slashColor, children }: SlantedNavItemProps) {
  const isExternal = href.startsWith("http://") || href.startsWith("https://");

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="nav-item">
        <span className={`nav-slash ${slashColor}`}>/</span>
        <span className="nav-text">{children}</span>
      </a>
    );
  }

  return (
    <Link href={href} className="nav-item">
      <span className={`nav-slash ${slashColor}`}>/</span>
      <span className="nav-text">{children}</span>
    </Link>
  );
}
