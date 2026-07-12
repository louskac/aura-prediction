import axios from "axios";
import fs from "fs";
import path from "path";

// Static mapping of TxLINE Fixture IDs to FotMob Match IDs
const FIXTURE_MAP: Record<number, number> = {
  18143850: 4538978, // Vietnam vs Myanmar
  18172280: 4653706, // Netherlands vs Morocco
  18172379: 4653709, // USA vs Bosnia & Herzegovina
  18172469: 4653711, // Brazil vs Japan
  18175397: 4653712, // Ivory Coast vs Norway
  18175918: 4653715, // Argentina vs Cape Verde
  18175981: 4653704, // France vs Sweden
  18175983: 4653703, // Germany vs Paraguay
  18176123: 4653716, // Australia vs Egypt
  18179549: 4653718, // Colombia vs Ghana
  18179550: 4653710, // Belgium vs Senegal
  18179551: 4653708, // Spain vs Austria
  18179552: 4653717, // Switzerland vs Algeria
  18179759: 4653713, // Mexico vs Ecuador
  18179763: 4653707, // Portugal vs Croatia
  18179764: 4653714, // England vs Congo DR / DR Congo
  18185036: 4653843, // Canada vs Morocco
  18187298: 4653846, // Brazil vs Norway
  18188721: 4653842, // Paraguay vs France
  18192996: 4653847, // Mexico vs England
  18193785: 4653845, // USA vs Belgium
  18198205: 4653844, // Portugal vs Spain
  18202701: 4653848, // Argentina vs Egypt
  18202783: 4653849, // Switzerland vs Colombia
  18209181: 4653851, // France vs Morocco
  18213979: 4653852, // Norway vs England
  18218149: 4653853, // Spain vs Belgium
  18222446: 4653854, // Argentina vs Switzerland
  18237038: 4653855, // France vs Spain
  20260109: 4653705  // Canada vs South Africa
};

export interface FotmobShot {
  min: number;
  team: "home" | "away";
  playerName: string;
  x: number; // 0..100 relative to attacking goal line
  y: number; // 0..100 relative to width of pitch
  expectedGoals: number;
  eventType: string;
  isOwnGoal: boolean;
}

export interface FotmobMomentumPoint {
  minute: number;
  v: number; // -1.0 .. +1.0 (Home positive, Away negative)
}

export interface FotmobMatchData {
  momentum: FotmobMomentumPoint[];
  shots: FotmobShot[];
}

export class FotmobScraper {
  private static CACHE_DIR = path.join(process.cwd(), "public", "data", "fotmob_cache");

  /**
   * Main entry point: get cached or scrape live FotMob match details
   */
  public static async getMatchData(
    fixtureId: number,
    homeTeam: string,
    awayTeam: string
  ): Promise<FotmobMatchData | null> {
    // 1. Ensure cache directory exists
    if (!fs.existsSync(this.CACHE_DIR)) {
      fs.mkdirSync(this.CACHE_DIR, { recursive: true });
    }

    const cacheFile = path.join(this.CACHE_DIR, `${fixtureId}.json`);

    // 2. Read from local cache if exists
    if (fs.existsSync(cacheFile)) {
      try {
        const cachedContent = fs.readFileSync(cacheFile, "utf-8");
        return JSON.parse(cachedContent);
      } catch (err: any) {
        console.warn(`Failed to parse cached FotMob file for fixture ${fixtureId}:`, err.message);
      }
    }

    // 3. Find FotMob match ID
    let fotmobMatchId = FIXTURE_MAP[fixtureId] || null;

    if (!fotmobMatchId) {
      console.log(`Resolving FotMob Match ID dynamically for ${homeTeam} vs ${awayTeam}...`);
      fotmobMatchId = await this.resolveMatchId(homeTeam, awayTeam);
    }

    if (!fotmobMatchId) {
      console.warn(`Could not map fixture ${fixtureId} (${homeTeam} vs ${awayTeam}) to a FotMob match ID.`);
      return null;
    }

    // 4. Fetch and parse FotMob match details
    console.log(`Fetching FotMob match page for ID ${fotmobMatchId}...`);
    const scrapedData = await this.scrapeMatchDetails(fotmobMatchId);
    if (!scrapedData) {
      return null;
    }

    // 5. Save to local cache
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(scrapedData, null, 2));
      console.log(`Successfully cached FotMob data to ${cacheFile}`);
    } catch (err: any) {
      console.error(`Failed to write cache file ${cacheFile}:`, err.message);
    }

    return scrapedData;
  }

  /**
   * Search for a match ID dynamically via suggest API
   */
  private static async resolveMatchId(home: string, away: string): Promise<number | null> {
    const translateTeamName = (name: string) => {
      const n = name.trim().toLowerCase();
      if (n === "congo dr" || n === "congo-dr") return "DR Congo";
      return name;
    };

    const cleanHome = translateTeamName(home);
    const cleanAway = translateTeamName(away);

    // Try combined search term
    const term = encodeURIComponent(`${cleanHome} ${cleanAway}`);
    const url = `https://apigw.fotmob.com/searchapi/suggest?term=${term}&lang=en`;

    try {
      const res = await axios.get(url, { timeout: 6000 });
      const idStr = res.data?.matchSuggest?.[0]?.options?.[0]?.payload?.id;
      if (idStr) {
        return Number(idStr);
      }
    } catch (e: any) {
      console.warn(`Combined FotMob suggestion search failed: ${e.message}`);
    }

    // Fallback: Search Home team matches
    const homeTerm = encodeURIComponent(cleanHome);
    const fallbackUrl = `https://apigw.fotmob.com/searchapi/suggest?term=${homeTerm}&lang=en`;
    try {
      const res = await axios.get(fallbackUrl, { timeout: 6000 });
      const options = res.data?.matchSuggest?.[0]?.options || [];
      for (const opt of options) {
        const payload = opt.payload;
        if (payload) {
          const paysHome = payload.homeName?.toLowerCase() || "";
          const paysAway = payload.awayName?.toLowerCase() || "";
          const cleanAwayLower = cleanAway.toLowerCase();
          
          if (paysAway.includes(cleanAwayLower) || cleanAwayLower.includes(paysAway) ||
              paysHome.includes(cleanAwayLower) || cleanAwayLower.includes(paysHome)) {
            return Number(payload.id);
          }
        }
      }
    } catch (e: any) {
      console.warn(`Fallback FotMob suggestion search failed: ${e.message}`);
    }

    return null;
  }

  /**
   * Fetch match page HTML and parse embedded __NEXT_DATA__
   */
  private static async scrapeMatchDetails(matchId: number): Promise<FotmobMatchData | null> {
    const url = `https://www.fotmob.com/match/${matchId}`;
    try {
      const res = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        },
        timeout: 10000
      });

      const html = res.data;
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
      if (!match) {
        console.error("Could not find __NEXT_DATA__ block on FotMob match page.");
        return null;
      }

      const nextDataJson = JSON.parse(match[1]);
      const content = nextDataJson.props?.pageProps?.content;
      const general = nextDataJson.props?.pageProps?.general;

      if (!content || !general) {
        console.error("Failed to parse expected fields from __NEXT_DATA__.");
        return null;
      }

      const homeTeamId = general.homeTeam?.id;
      const awayTeamId = general.awayTeam?.id;

      // 1. Process Momentum
      const rawMomentum = content.momentum?.main?.data || [];
      const momentum: FotmobMomentumPoint[] = rawMomentum.map((pt: any) => ({
        minute: pt.minute,
        v: pt.value / 100
      }));

      // 2. Process Shotmap
      const rawShots = content.shotmap?.shots || [];
      const shots: FotmobShot[] = rawShots.map((s: any) => ({
        min: s.min,
        team: s.teamId === homeTeamId ? "home" : "away",
        playerName: s.playerName,
        x: s.x,
        y: s.y,
        expectedGoals: s.expectedGoals || 0,
        eventType: s.eventType || "",
        isOwnGoal: s.isOwnGoal || false
      }));

      return {
        momentum,
        shots
      };
    } catch (err: any) {
      console.error(`Failed to scrape match page for ID ${matchId}:`, err.message);
      return null;
    }
  }
}

