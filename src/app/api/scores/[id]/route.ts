import { NextRequest, NextResponse } from "next/server";
import { txline } from "@/services/txline";
import { VisualizerSynthesizer } from "@/services/visualizer-synthesizer";
import { db } from "@/db/db";
import { fixtures } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FotmobScraper } from "@/services/fotmob-scraper";
import fs from "fs";
import path from "path";
import axios from "axios";

const CACHE_DIR = path.join(process.cwd(), "public", "data", "fotmob_cache");

function normalizeTeam(name: string): string {
  let n = name.trim().toLowerCase();
  if (n === "congo dr" || n === "congo-dr" || n === "dr congo") return "dr congo";
  if (n === "usa" || n === "united states" || n === "united states of america") return "usa";
  if (n === "south korea" || n === "korea republic") return "south korea";
  if (n === "saudi arabia" || n === "saudi-arabia") return "saudi arabia";
  return n;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fixtureId = Number(params.id);
    if (isNaN(fixtureId)) {
      return NextResponse.json({ success: false, error: "Invalid fixture ID" }, { status: 400 });
    }

    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Fetch match details from local DB
    const match = db.select()
      .from(fixtures)
      .where(eq(fixtures.fixtureId, fixtureId))
      .get();

    let richTimeline = null;
    let richMomentum = null;
    let richStats = null;
    let isRich = false;

    if (match) {
      try {
        // Load matches index
        const matchesCacheFile = path.join(CACHE_DIR, "matches.json");
        let matchesList = [];
        if (fs.existsSync(matchesCacheFile)) {
          matchesList = JSON.parse(fs.readFileSync(matchesCacheFile, "utf-8"));
        } else {
          console.log("Fetching matches.json from bogachev.fr...");
          const res = await axios.get("https://wc26.bogachev.fr/matches.json", { timeout: 6000 });
          matchesList = res.data;
          fs.writeFileSync(matchesCacheFile, JSON.stringify(matchesList, null, 2));
        }

        const matchEntry = matchesList.find((m: any) => {
          const h1 = normalizeTeam(m.home.name);
          const a1 = normalizeTeam(m.away.name);
          const h2 = normalizeTeam(match.participant1);
          const a2 = normalizeTeam(match.participant2);
          return (h1 === h2 && a1 === a2) || (h1 === a2 && a1 === h2);
        });

        if (matchEntry) {
          const whoscoredId = matchEntry.id;
          const timelineCacheFile = path.join(CACHE_DIR, `timeline_${whoscoredId}.json`);
          let rawTimelineDoc = null;

          if (fs.existsSync(timelineCacheFile)) {
            rawTimelineDoc = JSON.parse(fs.readFileSync(timelineCacheFile, "utf-8"));
          } else {
            console.log(`Fetching timeline JSON for WhoScored ID ${whoscoredId}...`);
            const res = await axios.get(`https://wc26.bogachev.fr/api/timeline/${whoscoredId}`, { timeout: 10000 });
            rawTimelineDoc = res.data;
            fs.writeFileSync(timelineCacheFile, JSON.stringify(rawTimelineDoc, null, 2));
          }

          if (rawTimelineDoc && rawTimelineDoc.events) {
            const isReversed = normalizeTeam(matchEntry.home.name) !== normalizeTeam(match.participant1);
            
            // Map raw events to VisualEvent format with normalized coordinates
            const mappedEvents = [];
            const SHOT_TYPES = new Set(['SavedShot', 'MissedShots', 'ShotOnPost', 'Goal']);

            for (const e of rawTimelineDoc.events) {
              if (e.shootout) continue;
              if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) continue;

              let team = e.team === 'home' || e.team === 'away' ? e.team : 'home';
              if (isReversed) {
                team = team === 'home' ? 'away' : 'home';
              }

              const kind = SHOT_TYPES.has(e.type) ? 'shot' : (e.type === 'Pass' ? 'pass' : 'event');
              
              // Normalize coordinates (0..100 to 0..1) and mirror for away
              let X = (Number(e.x) || 0) / 100;
              let Y = (Number(e.y) || 0) / 100;
              if (team === 'away') {
                X = 1 - X;
                Y = 1 - Y;
              }
              const u = Math.max(0, Math.min(1, X));
              const v = Math.max(0, Math.min(1, Y));

              const it: any = {
                t: (Number(e.t) || 0) * 60, // convert match-minutes to seconds
                minute: Number(e.minute) || 0,
                team,
                kind,
                dispMin: Number.isFinite(e.dispMin) ? e.dispMin : ((Number(e.minute) || 0) + 1),
                label: e.label != null ? String(e.label) : String((Number(e.minute) || 0) + 1),
                u,
                v,
                type: e.type || kind,
                outcome: e.outcome || '',
                isTouch: !!e.isTouch,
                len: Number(e.len) || 0,
                long: !!e.long,
                cross: !!e.cross,
                corner: !!e.corner,
              };

              if (e.name != null) it.name = String(e.name);
              if (e.surname != null) it.surname = String(e.surname);
              if (e.onName != null) it.onName = String(e.onName);
              if (e.onSurname != null) it.onSurname = String(e.onSurname);

              if (Number.isFinite(e.endX) && Number.isFinite(e.endY)) {
                let eX = (Number(e.endX) || 0) / 100;
                let eY = (Number(e.endY) || 0) / 100;
                if (team === 'away') {
                  eX = 1 - eX;
                  eY = 1 - eY;
                }
                it.eu = Math.max(0, Math.min(1, eX));
                it.ev = Math.max(0, Math.min(1, eY));
              }

              if (kind === 'shot') {
                it.xg = Number.isFinite(e.xg) ? e.xg : 0.05;
                it.isGoal = !!e.isGoal;
                it.ownGoal = !!e.ownGoal;
              }

              mappedEvents.push(it);
            }

            mappedEvents.sort((a, b) => a.t - b.t);
            richTimeline = mappedEvents;

            // Map momentum from matches list
            if (matchEntry.momentum) {
              const momList = matchEntry.momentum.map((val: number, idx: number) => ({
                minute: idx,
                v: isReversed ? -val : val
              }));
              richMomentum = momList;
            }

            // Calculate stats
            const homeStats = { goals: 0, shots: 0, corners: 0, yellows: 0, reds: 0 };
            const awayStats = { goals: 0, shots: 0, corners: 0, yellows: 0, reds: 0 };
            for (const e of mappedEvents) {
              const targetStats = e.team === 'home' ? homeStats : awayStats;
              if (e.type === 'Goal' || e.isGoal) {
                targetStats.goals++;
              } else if (e.kind === 'shot') {
                targetStats.shots++;
              } else if (e.corner) {
                targetStats.corners++;
              } else if (e.type === 'Card') {
                if (e.red) targetStats.reds++;
                else targetStats.yellows++;
              }
            }
            richStats = { home: homeStats, away: awayStats };
            isRich = true;
          }
        }
      } catch (err: any) {
        console.warn(`Failed to resolve rich match timeline, falling back:`, err.message);
      }
    }

    if (isRich && richTimeline && richMomentum) {
      console.log(`Using rich authentic WhoScored timeline for fixture ${fixtureId}`);
      return NextResponse.json({
        success: true,
        timeline: richTimeline,
        momentum: richMomentum,
        stats: richStats,
        isRich: true
      });
    }

    // Existing fallback procedural simulation
    let scores = [];
    try {
      scores = await txline.getScores(fixtureId);
    } catch (e) {
      console.warn(`Oracle feed fetch error, switching to procedural simulation:`, e);
    }

    if (!scores || scores.length === 0) {
      if (match) {
        scores = VisualizerSynthesizer.generateMockEvents(
          match.participant1,
          match.participant2,
          match.score1 ?? 0,
          match.score2 ?? 0,
          fixtureId
        );
      }
    }

    let fotmobData = null;
    if (match) {
      try {
        fotmobData = await FotmobScraper.getMatchData(fixtureId, match.participant1, match.participant2);
      } catch (err: any) {
        console.warn(`Failed to retrieve FotMob data for fixture ${fixtureId}:`, err.message);
      }
    }
    
    const timeline = await VisualizerSynthesizer.synthesizeTimeline(scores, fotmobData?.shots);
    const maxSec = scores.reduce((acc: number, e: any) => Math.max(acc, e.Clock?.Seconds || 0), 5400);
    const durationMinutes = Math.ceil(maxSec / 60);
    
    const momentum = (fotmobData?.momentum && fotmobData.momentum.length > 0)
      ? fotmobData.momentum
      : VisualizerSynthesizer.generateMomentum(scores, durationMinutes);
      
    const stats = VisualizerSynthesizer.calculateStats(scores);

    return NextResponse.json({ 
      success: true, 
      timeline, 
      momentum, 
      stats,
      isRich: false
    });
  } catch (err: any) {
    console.error(`Failed to fetch scores for fixture ${params.id}:`, err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
