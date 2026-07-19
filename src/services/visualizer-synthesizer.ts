import { db } from "@/db/db";
import { fantasyPlayers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FotmobShot } from "./fotmob-scraper";

export interface TxlineEvent {
  FixtureId: number;
  GameState: string;
  StartTime: number;
  Action: string;
  Clock?: {
    Seconds: number;
  };
  Participant?: number; // 1 = Home, 2 = Away
  Score?: {
    Participant1?: { Total?: { Goals?: number } };
    Participant2?: { Total?: { Goals?: number } };
  };
  Data?: {
    PlayerId?: number;
    PlayerInId?: number;
    PlayerOutId?: number;
    GoalType?: string;
    Outcome?: string;
    Minutes?: number;
    Conditions?: string[];
    Type?: string;
  };
}

export interface VisualEvent {
  t: number;          // clock seconds
  minute: number;     // display minute
  team: "home" | "away";
  kind: "shot" | "pass" | "event";
  dispMin: number;
  label: string;
  u: number;          // normalized coordinate x
  v: number;          // normalized coordinate y
  type: string;       // action type
  outcome: string;    // e.g. "OnTarget", "Goal"
  isTouch: boolean;
  len: number;
  long: boolean;
  cross: boolean;
  corner: boolean;
  xg?: number;
  isGoal?: boolean;
  ownGoal?: boolean;
  name?: string;
  surname?: string;
  onName?: string;
  onSurname?: string;
  position?: string;
  fotmobId?: number;
  eu?: number;
  ev?: number;
  through?: boolean;
}

export interface MomentumPoint {
  minute: number;
  v: number; // -1.0 to +1.0
}

export interface MatchStats {
  home: {
    goals: number;
    shots: number;
    corners: number;
    yellows: number;
    reds: number;
  };
  away: {
    goals: number;
    shots: number;
    corners: number;
    yellows: number;
    reds: number;
  };
}

/**
 * Procedurally enrich TxLINE events and calculate the momentum curve.
 */
export class VisualizerSynthesizer {
  /**
   * Procedural match events simulator based on scoreline
   */
  public static generateMockEvents(
    homeTeam: string,
    awayTeam: string,
    homeScore: number,
    awayScore: number,
    fixtureId: number
  ): TxlineEvent[] {
    const mockEvents: TxlineEvent[] = [];
    
    // Seed standard actions using fixtureId as random seed source
    let seed = fixtureId;
    const rand = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // 1. Kickoff
    mockEvents.push({
      FixtureId: fixtureId,
      GameState: "inplay",
      StartTime: Date.now() - 5400000,
      Action: "status",
      Clock: { Seconds: 0 },
      Participant: 1
    });

    // 2. Generate exact goals based on scoreline
    // Home goals
    for (let g = 0; g < homeScore; g++) {
      const min = Math.floor(10 + rand() * 75);
      mockEvents.push({
        FixtureId: fixtureId,
        GameState: "inplay",
        StartTime: Date.now(),
        Action: "goal",
        Clock: { Seconds: min * 60 + Math.floor(rand() * 45) },
        Participant: 1,
        Data: { PlayerId: 1000 + g, Outcome: "Goal" }
      });
    }
    // Away goals
    for (let g = 0; g < awayScore; g++) {
      const min = Math.floor(15 + rand() * 70);
      mockEvents.push({
        FixtureId: fixtureId,
        GameState: "inplay",
        StartTime: Date.now(),
        Action: "goal",
        Clock: { Seconds: min * 60 + Math.floor(rand() * 45) },
        Participant: 2,
        Data: { PlayerId: 2000 + g, Outcome: "Goal" }
      });
    }

    // 3. Generate random shots (e.g. 14 shots total)
    const numShots = 10 + Math.floor(rand() * 6);
    for (let s = 0; s < numShots; s++) {
      const min = Math.floor(5 + rand() * 83);
      const team = rand() > 0.5 ? 1 : 2;
      mockEvents.push({
        FixtureId: fixtureId,
        GameState: "inplay",
        StartTime: Date.now(),
        Action: "shot",
        Clock: { Seconds: min * 60 + Math.floor(rand() * 45) },
        Participant: team,
        Data: { PlayerId: team === 1 ? 1010 + s : 2010 + s, Outcome: rand() > 0.4 ? "OnTarget" : "OffTarget" }
      });
    }

    // 4. Generate random corners (e.g. 9 corners total)
    const numCorners = 6 + Math.floor(rand() * 6);
    for (let c = 0; c < numCorners; c++) {
      const min = Math.floor(2 + rand() * 88);
      const team = rand() > 0.5 ? 1 : 2;
      mockEvents.push({
        FixtureId: fixtureId,
        GameState: "inplay",
        StartTime: Date.now(),
        Action: "corner",
        Clock: { Seconds: min * 60 + Math.floor(rand() * 45) },
        Participant: team
      });
    }

    // 5. Generate random danger possessions to create wave shapes
    const numPossessions = 20 + Math.floor(rand() * 15);
    for (let p = 0; p < numPossessions; p++) {
      const min = Math.floor(1 + rand() * 89);
      const team = rand() > 0.5 ? 1 : 2;
      const type = rand() > 0.4 ? "danger_possession" : "high_danger_possession";
      mockEvents.push({
        FixtureId: fixtureId,
        GameState: "inplay",
        StartTime: Date.now(),
        Action: type,
        Clock: { Seconds: min * 60 + Math.floor(rand() * 45) },
        Participant: team
      });
    }

    // 6. Sort all events by timeline seconds
    mockEvents.sort((a, b) => (a.Clock?.Seconds || 0) - (b.Clock?.Seconds || 0));
    
    // Add cumulative stats to card events
    let curHGoals = 0;
    let curAGoals = 0;
    mockEvents.forEach(e => {
      if (e.Action === "goal") {
        if (e.Participant === 1) curHGoals++;
        else curAGoals++;
      }
      e.Score = {
        Participant1: { Total: { Goals: curHGoals } },
        Participant2: { Total: { Goals: curAGoals } }
      };
    });

    return mockEvents;
  }

  /**
   * Helper to retrieve player names and positions from SQLite database by FotMob/Player ID
   */
  private static async getPlayerName(playerId?: number): Promise<{ name: string; surname: string; position?: string } | null> {
    if (!playerId) return null;
    try {
      const player = db.select()
        .from(fantasyPlayers)
        .where(eq(fantasyPlayers.fotmobId, playerId))
        .get();
      
      if (player) {
        const parts = player.name.split(" ");
        const surname = parts[parts.length - 1] || "";
        const name = parts.slice(0, -1).join(" ") || parts[0];
        return { name, surname, position: player.position };
      }
    } catch (e) {
      // Database not ready or no player found
    }
    // Fallback
    return { name: `Player`, surname: `#${playerId}`, position: "FWD" };
  }

  /**
   * Synthesize match timeline events with coordinates, estimated xG, and player names
   */
  public static async synthesizeTimeline(events: TxlineEvent[], fotmobShots?: FotmobShot[]): Promise<VisualEvent[]> {
    const hasFotmobShots = fotmobShots && fotmobShots.length > 0;
    
    // Filter out raw shot and goal events from TxLINE since we'll inject the authentic ones from FotMob
    const sortedEvents = [...events]
      .filter(e => e.Clock && e.Clock.Seconds !== undefined)
      .filter(e => !hasFotmobShots || (e.Action !== "shot" && e.Action !== "goal"))
      .sort((a, b) => (a.Clock?.Seconds || 0) - (b.Clock?.Seconds || 0));

    const out: VisualEvent[] = [];

    for (let i = 0; i < sortedEvents.length; i++) {
      const e = sortedEvents[i];
      const seconds = e.Clock?.Seconds || 0;
      const minute = Math.floor(seconds / 60);
      const team: "home" | "away" = e.Participant === 2 ? "away" : "home";
      
      // Classify type
      let kind: "shot" | "pass" | "event" = "event";
      let isGoal = false;
      let ownGoal = false;
      let isCorner = false;
      
      if (e.Action === "goal") {
        kind = "shot";
        isGoal = true;
      } else if (e.Action === "shot") {
        kind = "shot";
      } else if (e.Action === "corner") {
        isCorner = true;
      }

      // Procedural coordinates synthesis (u, v in 0..1 range)
      // Home team attacks u -> 1, Away team attacks u -> 0
      let u = 0.5;
      let v = 0.5;
      
      // Deterministic randomness based on event index to keep scrub identical
      const seed = Math.sin(i * 1234.567) * 0.5 + 0.5;

      if (isGoal) {
        u = team === "home" ? 0.96 : 0.04;
        v = 0.5 + (seed - 0.5) * 0.08; // slightly offset from center of net
      } else if (e.Action === "shot") {
        u = team === "home" ? 0.8 + seed * 0.12 : 0.2 - seed * 0.12;
        v = 0.3 + (seed * 0.4); // spread across the box
      } else if (isCorner) {
        u = team === "home" ? 1.0 : 0.0;
        v = seed > 0.5 ? 1.0 : 0.0;
      } else if (e.Action === "danger_possession" || e.Action === "high_danger_possession") {
        u = team === "home" ? 0.75 + seed * 0.1 : 0.25 - seed * 0.1;
        v = 0.2 + seed * 0.6;
      } else if (e.Action === "safe_possession" || e.Action === "possession") {
        u = team === "home" ? 0.4 + seed * 0.2 : 0.6 - seed * 0.2;
        v = 0.1 + seed * 0.8;
      }

      // xG estimation
      let xg = 0;
      if (isGoal) {
        xg = 1.0;
      } else if (e.Action === "shot") {
        const isHighDanger = sortedEvents.slice(Math.max(0, i - 3), i).some(prev => 
          prev.Action === "high_danger_possession" && prev.Participant === e.Participant
        );
        const outcome = e.Data?.Outcome || "";
        xg = outcome === "OnTarget" ? (isHighDanger ? 0.32 : 0.14) : 0.06;
      }

      const dispMin = minute + 1;
      const label = String(dispMin);

      const it: VisualEvent = {
        t: seconds,
        minute,
        team,
        kind,
        dispMin,
        label,
        u,
        v,
        type: e.Action,
        outcome: e.Data?.Outcome || (isGoal ? "Goal" : ""),
        isTouch: kind === "shot" || isCorner,
        len: 0,
        long: false,
        cross: isCorner,
        corner: isCorner,
        xg,
        isGoal,
        ownGoal,
      };

      // Player names attribution
      if (e.Data?.PlayerId) {
        const playerInfo = await this.getPlayerName(e.Data.PlayerId);
        if (playerInfo) {
          it.name = playerInfo.name;
          it.surname = playerInfo.surname;
          it.position = playerInfo.position;
          it.fotmobId = e.Data.PlayerId;
        }
      }
      if (e.Data?.PlayerInId) {
        const playerIn = await this.getPlayerName(e.Data.PlayerInId);
        if (playerIn) {
          it.onName = playerIn.name;
          it.onSurname = playerIn.surname;
        }
      }
      if (e.Data?.PlayerOutId) {
        const playerOut = await this.getPlayerName(e.Data.PlayerOutId);
        if (playerOut) {
          it.name = playerOut.name;
          it.surname = playerOut.surname;
          it.position = playerOut.position;
        }
      }

      out.push(it);
    }

    // 3. Inject authentic shots and goals from FotMob if present
    if (hasFotmobShots) {
      fotmobShots.forEach((s) => {
        const isGoal = s.eventType === "Goal";
        const seconds = s.min * 60;
        
        const parts = s.playerName.split(" ");
        const surname = parts[parts.length - 1] || "";
        const name = parts.slice(0, -1).join(" ") || parts[0];
        
        const uRaw = s.team === "home" ? s.x / 100 : 1.0 - (s.x / 100);
        const vRaw = s.y / 100;
        const u = Math.max(0, Math.min(1, uRaw));
        const v = Math.max(0, Math.min(1, vRaw));

        let position = "FWD";
        let fotmobId: number | undefined = undefined;
        try {
          const player = db.select()
            .from(fantasyPlayers)
            .where(eq(fantasyPlayers.name, s.playerName))
            .get();
          if (player) {
            position = player.position;
            fotmobId = player.fotmobId || undefined;
          }
        } catch (err) {}
        
        out.push({
          t: seconds,
          minute: s.min - 1,
          team: s.team,
          kind: "shot",
          dispMin: s.min,
          label: String(s.min),
          u,
          v,
          type: isGoal ? "goal" : "shot",
          outcome: s.eventType,
          isTouch: true,
          len: 0,
          long: false,
          cross: false,
          corner: false,
          xg: s.expectedGoals,
          isGoal: isGoal,
          ownGoal: s.isOwnGoal,
          name,
          surname,
          position,
          fotmobId
        });
      });
    }

    // 4. Sort all combined events by timeline seconds
    out.sort((a, b) => a.t - b.t);

    return out;
  }

  /**
   * Procedurally generate match momentum curve using recent events sliding integration window
   */
  public static generateMomentum(events: TxlineEvent[], durationMinutes: number = 95): MomentumPoint[] {
    const momentumList: MomentumPoint[] = [];
    
    // Create rolling window score
    for (let m = 0; m <= durationMinutes; m++) {
      let score = 0;
      
      events.forEach(e => {
        const seconds = e.Clock?.Seconds || 0;
        const eventMin = Math.floor(seconds / 60);
        
        // Sliding window of last 6 minutes
        if (eventMin > m - 6 && eventMin <= m) {
          const diff = m - eventMin;
          const weight = Math.exp(-diff / 2.0); // exponential decay over time
          
          let val = 0;
          if (e.Action === "goal") val = 6.0;
          else if (e.Action === "shot") val = 1.8;
          else if (e.Action === "corner") val = 0.8;
          else if (e.Action === "high_danger_possession") val = 1.4;
          else if (e.Action === "danger_possession") val = 0.8;
          else if (e.Action === "possession") val = 0.25;
          else if (e.Action === "safe_possession") val = 0.1;
          
          // Home positive, Away negative
          const teamSign = e.Participant === 2 ? -1 : 1;
          score += val * weight * teamSign;
        }
      });
      
      // Normalize using hyperbolic tangent to bound between -1.0 and 1.0 smoothly
      const valueNorm = Math.tanh(score / 4.0);
      
      momentumList.push({
        minute: m,
        v: valueNorm
      });
    }

    return momentumList;
  }

  /**
   * Aggregate final match statistics
   */
  public static calculateStats(events: TxlineEvent[]): MatchStats {
    const stats: MatchStats = {
      home: { goals: 0, shots: 0, corners: 0, yellows: 0, reds: 0 },
      away: { goals: 0, shots: 0, corners: 0, yellows: 0, reds: 0 }
    };

    events.forEach(e => {
      const teamKey: "home" | "away" = e.Participant === 2 ? "away" : "home";
      
      if (e.Action === "goal") {
        stats[teamKey].goals++;
      } else if (e.Action === "shot") {
        stats[teamKey].shots++;
      } else if (e.Action === "corner") {
        stats[teamKey].corners++;
      } else if (e.Action === "additional_time" || e.Action === "substitution") {
        // Skip
      } else if (e.Action === "status") {
        // Check cards if stats block is present
        const statsBlock = (e as any).Stats;
        if (statsBlock) {
          stats.home.yellows = Number(statsBlock["3"] ?? 0);
          stats.away.yellows = Number(statsBlock["4"] ?? 0);
          stats.home.reds = Number(statsBlock["5"] ?? 0);
          stats.away.reds = Number(statsBlock["6"] ?? 0);
        }
      }
    });

    return stats;
  }
}

