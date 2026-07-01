import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "AuraPredict | World Cup Bracket & Prediction Markets",
  description: "Verify live scores on-chain, trade fantasy prediction markets, and predict tournament brackets with real-time analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
