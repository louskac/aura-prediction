import { NextRequest, NextResponse } from "next/server";
import { txline } from "@/services/txline";
import { VisualizerSynthesizer } from "@/services/visualizer-synthesizer";
import { db } from "@/db/db";
import { fixtures } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FotmobScraper } from "@/services/fotmob-scraper";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fixtureId = Number(params.id);
    if (isNaN(fixtureId)) {
      return NextResponse.json({ success: false, error: "Invalid fixture ID" }, { status: 400 });
    }

    // Fetch match details from local DB for FotMob resolution
    const match = db.select()
      .from(fixtures)
      .where(eq(fixtures.fixtureId, fixtureId))
      .get();

    let scores = [];
    try {
      scores = await txline.getScores(fixtureId);
    } catch (e) {
      console.warn(`Oracle feed fetch error, switching to procedural simulation:`, e);
    }

    // Fallback: If oracle scores array is empty or throws, simulate events
    if (!scores || scores.length === 0) {
      if (match) {
        console.log(`Generating simulated match events for: ${match.participant1} vs ${match.participant2}`);
        scores = VisualizerSynthesizer.generateMockEvents(
          match.participant1,
          match.participant2,
          match.score1 ?? 0,
          match.score2 ?? 0,
          fixtureId
        );
      }
    }

    // Try to get real momentum and shotmap from FotMob
    let fotmobData = null;
    if (match) {
      try {
        fotmobData = await FotmobScraper.getMatchData(fixtureId, match.participant1, match.participant2);
      } catch (err: any) {
        console.warn(`Failed to retrieve FotMob data for fixture ${fixtureId}:`, err.message);
      }
    }
    
    // Perform server-side synthesis
    const timeline = await VisualizerSynthesizer.synthesizeTimeline(scores, fotmobData?.shots);
    
    const maxSec = scores.reduce((acc: number, e: any) => Math.max(acc, e.Clock?.Seconds || 0), 5400);
    const durationMinutes = Math.ceil(maxSec / 60);
    
    // Use real momentum from FotMob if available, otherwise fall back to procedural
    const momentum = (fotmobData?.momentum && fotmobData.momentum.length > 0)
      ? fotmobData.momentum
      : VisualizerSynthesizer.generateMomentum(scores, durationMinutes);
      
    const stats = VisualizerSynthesizer.calculateStats(scores);

    return NextResponse.json({ 
      success: true, 
      timeline, 
      momentum, 
      stats 
    });
  } catch (err: any) {
    console.error(`Failed to fetch scores for fixture ${params.id}:`, err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
