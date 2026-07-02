import { NextResponse } from "next/server";
import { fantasyService } from "@/services/fantasy";
import { db } from "@/db/db";
import { fantasyPlayers, fixtures as fixturesTable } from "@/db/schema";

export const revalidate = 0; // force dynamic rendering

const DEFAULT_WALLET = "GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet") || DEFAULT_WALLET;
    
    // First, ensure players are seeded!
    await fantasyService.seedPlayers();
    
    // Non-blocking backfill in background
    fantasyService.backfillFotmobIds().catch(err => console.error("Error backfilling fotmob IDs:", err));

    const allFixtures = db.select().from(fixturesTable).all();
    const allPlayers = db.select().from(fantasyPlayers).all();

    // Group unfinished fixtures by date YYYY-MM-DD
    const activeFixtures = allFixtures.filter(f => f.status !== "Finished");
    
    let activePlayDay = "2026-06-29"; // Default fallback
    if (activeFixtures.length > 0) {
      const earliestStartTime = Math.min(...activeFixtures.map(f => f.startTime));
      activePlayDay = new Date(earliestStartTime - 6 * 3600 * 1000).toISOString().split("T")[0];
    } else if (allFixtures.length > 0) {
      const latestStartTime = Math.max(...allFixtures.map(f => f.startTime));
      activePlayDay = new Date(latestStartTime - 6 * 3600 * 1000).toISOString().split("T")[0];
    }

    // Fixtures playing on the active play day
    const playDayFixtures = allFixtures.filter(f => {
      return new Date(f.startTime - 6 * 3600 * 1000).toISOString().split("T")[0] === activePlayDay;
    });

    const playDayMatchesCount = playDayFixtures.length || 1;
    // Scale budget: $70.0M base + $4.0M per match, capped between $75.0M and $100.0M (750 to 1000 credits)
    const dynamicBudget = Math.min(1000, Math.max(750, 700 + playDayMatchesCount * 40));
    const playDayDeadline = playDayFixtures.length > 0 
      ? Math.min(...playDayFixtures.map(f => f.startTime)) 
      : Date.now();

    const isLocked = Date.now() >= playDayDeadline;

    // Load squad
    let squad = fantasyService.getSquad(walletAddress);
    
    // Reset/Clear squad if it belongs to a past play day
    if (squad && squad.playDay !== activePlayDay) {
      squad = null;
    }

    return NextResponse.json({
      success: true,
      squad,
      players: allPlayers,
      fixtures: allFixtures,
      activePlayDay,
      playDayMatchesCount,
      dynamicBudget,
      playDayDeadline,
      isLocked
    });
  } catch (err: any) {
    console.error("Failed to fetch fantasy squad info:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerIds, formation, wallet: walletAddress } = body;
    const wallet = walletAddress || DEFAULT_WALLET;

    if (!playerIds || !Array.isArray(playerIds)) {
      return NextResponse.json(
        { success: false, error: "playerIds must be a JSON array of 11 player IDs." },
        { status: 400 }
      );
    }

    // Compute active play day on POST to prevent client bypass
    const allFixtures = db.select().from(fixturesTable).all();
    const activeFixtures = allFixtures.filter(f => f.status !== "Finished");
    
    let activePlayDay = "2026-06-29";
    if (activeFixtures.length > 0) {
      const earliestStartTime = Math.min(...activeFixtures.map(f => f.startTime));
      activePlayDay = new Date(earliestStartTime - 6 * 3600 * 1000).toISOString().split("T")[0];
    } else if (allFixtures.length > 0) {
      const latestStartTime = Math.max(...allFixtures.map(f => f.startTime));
      activePlayDay = new Date(latestStartTime - 6 * 3600 * 1000).toISOString().split("T")[0];
    }

    const result = fantasyService.saveSquad(wallet, playerIds, formation || "4-3-3", activePlayDay);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Failed to draft fantasy squad:", err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}
