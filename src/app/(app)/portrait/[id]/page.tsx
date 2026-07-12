import { notFound } from "next/navigation";
import { db } from "@/db/db";
import { fixtures } from "@/db/schema";
import { eq } from "drizzle-orm";
import dynamic from "next/dynamic";

// Dynamically import the client visualizer with SSR disabled to prevent server-side hydration mismatches and Three.js canvas crashes
const MatchDataPortraitClient = dynamic(
  () => import("@/components/MatchDataPortraitClient"),
  { ssr: false }
);

interface PortraitPageProps {
  params: {
    id: string;
  };
}

export default async function PortraitPage({ params }: PortraitPageProps) {
  const fixtureId = Number(params.id);
  if (isNaN(fixtureId)) {
    notFound();
  }

  // Retrieve match details from SQLite database
  const match = db.select()
    .from(fixtures)
    .where(eq(fixtures.fixtureId, fixtureId))
    .get();

  if (!match) {
    notFound();
  }

  return (
    <div style={{ width: "100%", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <MatchDataPortraitClient
        fixtureId={fixtureId}
        homeTeam={match.participant1}
        awayTeam={match.participant2}
        homeScore={match.score1 ?? 0}
        awayScore={match.score2 ?? 0}
        status={match.status}
      />
    </div>
  );
}
