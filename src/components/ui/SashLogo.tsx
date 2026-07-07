import React from "react";

interface SashLogoProps {
  versionText?: string;
  showVersion?: boolean;
}

export default function SashLogo({ 
  versionText = "DEVNET.v1", 
  showVersion = true 
}: SashLogoProps) {
  return (
    <>
      <div className="logo-sashes">
        <span className="logo-slash green"></span>
        <span className="logo-slash blue"></span>
        <span className="logo-slash purple"></span>
        <span className="logo-slash teal"></span>
      </div>
      <span className="logo-text">AURA</span>
      {showVersion && <span className="logo-ver">{versionText}</span>}
    </>
  );
}
