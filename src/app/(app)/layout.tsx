import type { Metadata } from "next";
import Link from "next/link";
import SashLogo from "@/components/ui/SashLogo";
import SidebarLink from "@/components/ui/SidebarLink";
import AppLayoutWrapper from "@/components/ui/AppLayoutWrapper";
import { txline } from "@/services/txline";
import { db, initDb } from "@/db/db";
import { bracketPredictions, fantasySquads, fixtures } from "@/db/schema";
import { eq } from "drizzle-orm";
import { 
  LayoutDashboard, 
  Trophy, 
  Activity, 
  LineChart, 
  FolderHeart, 
  ShieldCheck, 
  Database 
} from "lucide-react";

export const metadata: Metadata = {
  title: "AuraPredict | World Cup Bracket & Prediction Markets",
  description: "Verify live scores on-chain, trade fantasy prediction markets, and predict tournament brackets with real-time analytics.",
};

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
  const dotColor = isDevnet ? "#00e5ff" : "#ffb700";

  // Server-side database queries for dynamic user activity telemetry
  initDb();
  
  // 1. Bracketpredictions count
  const predictions = db.select().from(bracketPredictions).where(eq(bracketPredictions.walletAddress, status.walletAddress)).all();
  const predictionsCount = predictions.length;

  // 2. Fantasy roster count
  const squad = db.select().from(fantasySquads).where(eq(fantasySquads.walletAddress, status.walletAddress)).get();
  let draftedCount = 0;
  if (squad && squad.playerIds) {
    try {
      draftedCount = JSON.parse(squad.playerIds).length;
    } catch (e) {}
  }

  // 3. Next 2 upcoming fixtures
  const dbUpcoming = db.select().from(fixtures).where(eq(fixtures.status, "NotStarted")).orderBy(fixtures.startTime).limit(2).all();
  const upcomingMatches = dbUpcoming.map(f => {
    const d = new Date(f.startTime);
    const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    return {
      home: f.participant1,
      away: f.participant2,
      date: dateStr
    };
  });

  // Render the Server elements that are passed to the Client state container wrapper
  const sidebarLogo = <SashLogo showVersion={false} />;
  
  const sidebarMenu = (
    <>
      <SidebarLink href="/dashboard" icon={<LayoutDashboard size={18} />} activeColor="#00e5ff">
        Dashboard
      </SidebarLink>
      <SidebarLink href="/bracket" icon={<Trophy size={18} />} activeColor="#a855f7">
        Bracket Predictor
      </SidebarLink>
      <SidebarLink href="/fantasy" icon={<Activity size={18} />} activeColor="#22c55e">
        Aura Fantasy
      </SidebarLink>
      <SidebarLink href="/markets" icon={<LineChart size={18} />} activeColor="#ff00a0">
        Fantasy Markets
      </SidebarLink>
      <SidebarLink href="/portfolio" icon={<FolderHeart size={18} />} activeColor="#ffcc00">
        Fan Portfolio
      </SidebarLink>
      <SidebarLink href="/admin" icon={<ShieldCheck size={18} />} activeColor="#ff3333">
        TxLINE Admin
      </SidebarLink>
      <SidebarLink href="/api-dump" icon={<Database size={18} />} activeColor="#ffffff">
        API Raw Dump
      </SidebarLink>
    </>
  );

  return (
    <AppLayoutWrapper
      sidebarLogo={sidebarLogo}
      sidebarMenu={sidebarMenu}
      predictionsCount={predictionsCount}
      draftedCount={draftedCount}
      upcomingMatches={upcomingMatches}
      truncatedWallet={truncatedWallet}
      solBalanceFormatted={solBalanceFormatted}
      txlBalanceFormatted={txlBalanceFormatted}
      networkName={networkName}
      dotColor={dotColor}
      fullWalletAddress={status.walletAddress}
    >
      {children}
    </AppLayoutWrapper>
  );
}
