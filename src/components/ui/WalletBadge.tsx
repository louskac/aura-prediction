import React from "react";

interface WalletBadgeProps {
  address: string;
  balance: string;
}

export default function WalletBadge({ address, balance }: WalletBadgeProps) {
  // Truncate address if not already truncated
  const displayAddress = address.length > 10
    ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}`
    : address;

  return (
    <div className="wallet-container-slanted">
      <span className="wallet-slash teal">/</span>
      <div className="wallet-content">
        <span className="wallet-address font-mono">{displayAddress}</span>
        <span className="wallet-balance">{balance}</span>
      </div>
    </div>
  );
}
