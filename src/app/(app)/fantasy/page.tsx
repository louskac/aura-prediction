"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  Activity, 
  Zap, 
  TrendingUp, 
  Award, 
  Shield, 
  HelpCircle, 
  RefreshCw, 
  Coins, 
  ChevronRight, 
  Info,
  Check,
  AlertCircle,
  Calendar,
  Layers,
  Sparkles,
  Lock,
  Clock,
  Wallet
} from "lucide-react";

interface Player {
  id: number;
  name: string;
  position: "GK" | "DEF" | "MID" | "FWD";
  team: string;
  basePrice: number;
  currentPrice: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  yellowCards: number;
  redCards: number;
  previousPoints: number;
  currentPoints: number;
  fotmobId?: number | null;
}

interface Fixture {
  fixtureId: number;
  startTime: number;
  competition: string;
  participant1: string;
  participant2: string;
  status: string;
  score1: number;
  score2: number;
}

interface Squad {
  walletAddress: string;
  playerIds: number[];
  players: Player[];
  budgetRemaining: number;
  totalPoints: number;
  totalCollateral?: number;
  estimatedPayout?: number;
  yieldRate?: number;
  isResolved?: boolean;
}

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  "Argentina": { primary: "#74ACDF", secondary: "#FFFFFF" },
  "Brazil": { primary: "#FFDF00", secondary: "#009B3A" },
  "France": { primary: "#002395", secondary: "#ED2939" },
  "Germany": { primary: "#000000", secondary: "#FFCC00" },
  "Spain": { primary: "#C60B1E", secondary: "#F1BF00" },
  "England": { primary: "#FFFFFF", secondary: "#CE1126" },
  "Portugal": { primary: "#FF0000", secondary: "#006600" },
  "Netherlands": { primary: "#FF4F00", secondary: "#002147" },
  "Italy": { primary: "#0066FF", secondary: "#FFFFFF" },
  "Belgium": { primary: "#E30613", secondary: "#FFE600" },
  "Croatia": { primary: "#FF0000", secondary: "#FFFFFF" },
  "Uruguay": { primary: "#0081C6", secondary: "#FFFFFF" },
  "USA": { primary: "#002868", secondary: "#BF0A30" },
  "United States": { primary: "#002868", secondary: "#BF0A30" },
  "Mexico": { primary: "#006847", secondary: "#CE1126" },
  "Japan": { primary: "#000080", secondary: "#FFFFFF" },
  "Morocco": { primary: "#C1272D", secondary: "#006233" },
  "Senegal": { primary: "#00853F", secondary: "#E31B23" },
  "Canada": { primary: "#FF0000", secondary: "#FFFFFF" },
  "Switzerland": { primary: "#D52B1E", secondary: "#FFFFFF" },
  "Denmark": { primary: "#C60C30", secondary: "#FFFFFF" },
  "Sweden": { primary: "#006AA7", secondary: "#FECC02" },
  "Norway": { primary: "#EF2B2D", secondary: "#00205B" },
  "Poland": { primary: "#DC143C", secondary: "#FFFFFF" },
  "Ukraine": { primary: "#0057B7", secondary: "#FFD700" },
  "Austria": { primary: "#ED2939", secondary: "#FFFFFF" },
  "Turkey": { primary: "#E30A17", secondary: "#FFFFFF" },
  "Colombia": { primary: "#FCD116", secondary: "#003893" },
  "Egypt": { primary: "#C1272D", secondary: "#000000" },
  "South Africa": { primary: "#007A4D", secondary: "#FFB612" },
  "Australia": { primary: "#00008B", secondary: "#FFCD00" },
  "South Korea": { primary: "#FFFFFF", secondary: "#CD1E3C" },
  "Ecuador": { primary: "#FFDD00", secondary: "#032F6F" },
  "Paraguay": { primary: "#D52B1E", secondary: "#0038A8" },
  "Ivory Coast": { primary: "#F77F00", secondary: "#009E60" },
  "DR Congo": { primary: "#007FFF", secondary: "#FCD116" },
  "Cape Verde": { primary: "#003893", secondary: "#CF0921" },
  "Bosnia and Herzegovina": { primary: "#002395", secondary: "#FECB00" },
  "Algeria": { primary: "#006633", secondary: "#D2143A" },
  "Ghana": { primary: "#FCD116", secondary: "#111111" }
};

export default function FantasyPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ position: "GK" | "DEF" | "MID" | "FWD"; index: number } | null>(null);
  const [selectedRoster, setSelectedRoster] = useState<(number | null)[]>(Array(11).fill(null));
  const [filterPosition, setFilterPosition] = useState<string>("ALL");
  const [filterTeam, setFilterTeam] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("price");
  
  const [formation, setFormation] = useState<string>("4-3-3");
  const [activePlayDay, setActivePlayDay] = useState<string>("2026-06-29");
  const [dynamicBudget, setDynamicBudget] = useState<number>(1000);
  const [playDayDeadline, setPlayDayDeadline] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [focusedPlayer, setFocusedPlayer] = useState<Player | null>(null);

  // Web3 Solana Collateral states
  const [showWeb3Modal, setShowWeb3Modal] = useState(false);
  const [web3Step, setWeb3Step] = useState<"idle" | "connecting" | "preparing" | "authorizing" | "signing" | "success" | "error">("idle");
  const [web3Error, setWeb3Error] = useState<string | null>(null);

  useEffect(() => {
    if (!playDayDeadline) return;
    
    const updateTime = () => {
      const now = Date.now();
      const diff = playDayDeadline - now;
      if (diff <= 0) {
        setTimeLeft("LOCKED / IN PROGRESS");
        setIsLocked(true);
        return true;
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const dStr = days > 0 ? `${days}d ` : "";
        const hStr = String(hours).padStart(2, "0");
        const mStr = String(minutes).padStart(2, "0");
        const sStr = String(seconds).padStart(2, "0");
        
        setTimeLeft(`${dStr}${hStr}h ${mStr}m ${sStr}s`);
        return false;
      }
    };

    const isDone = updateTime();
    if (isDone) return;

    const interval = setInterval(() => {
      const isDoneTick = updateTime();
      if (isDoneTick) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [playDayDeadline]);

  const getFormationCounts = (form: string): { D: number; M: number; F: number } => {
    const parts = form.split("-").map(Number);
    return {
      D: parts[0] || 4,
      M: parts[1] || 3,
      F: parts[2] || 3
    };
  };

  const getSlotsForFormation = (form: string) => {
    const { D, M, F } = getFormationCounts(form);
    const slotsList: { position: "GK" | "DEF" | "MID" | "FWD"; label: string; index: number }[] = [];

    // Goalkeeper
    slotsList.push({ position: "GK", label: "Goalkeeper", index: 0 });

    // Defenders
    if (D === 3) {
      slotsList.push({ position: "DEF", label: "Center Back L", index: 0 });
      slotsList.push({ position: "DEF", label: "Center Back C", index: 1 });
      slotsList.push({ position: "DEF", label: "Center Back R", index: 2 });
    } else if (D === 4) {
      slotsList.push({ position: "DEF", label: "Left Back", index: 0 });
      slotsList.push({ position: "DEF", label: "Center Back L", index: 1 });
      slotsList.push({ position: "DEF", label: "Center Back R", index: 2 });
      slotsList.push({ position: "DEF", label: "Right Back", index: 3 });
    } else if (D === 5) {
      slotsList.push({ position: "DEF", label: "Left Wingback", index: 0 });
      slotsList.push({ position: "DEF", label: "Center Back L", index: 1 });
      slotsList.push({ position: "DEF", label: "Center Back C", index: 2 });
      slotsList.push({ position: "DEF", label: "Center Back R", index: 3 });
      slotsList.push({ position: "DEF", label: "Right Wingback", index: 4 });
    }

    // Midfielders
    if (M === 3) {
      slotsList.push({ position: "MID", label: "Left Mid", index: 0 });
      slotsList.push({ position: "MID", label: "Center Mid", index: 1 });
      slotsList.push({ position: "MID", label: "Right Mid", index: 2 });
    } else if (M === 4) {
      slotsList.push({ position: "MID", label: "Left Mid", index: 0 });
      slotsList.push({ position: "MID", label: "Center Mid L", index: 1 });
      slotsList.push({ position: "MID", label: "Center Mid R", index: 2 });
      slotsList.push({ position: "MID", label: "Right Mid", index: 3 });
    } else if (M === 5) {
      slotsList.push({ position: "MID", label: "Left Mid", index: 0 });
      slotsList.push({ position: "MID", label: "Center Mid L", index: 1 });
      slotsList.push({ position: "MID", label: "Center Mid C", index: 2 });
      slotsList.push({ position: "MID", label: "Center Mid R", index: 3 });
      slotsList.push({ position: "MID", label: "Right Mid", index: 4 });
    }

    // Forwards
    if (F === 2) {
      slotsList.push({ position: "FWD", label: "Left Striker", index: 0 });
      slotsList.push({ position: "FWD", label: "Right Striker", index: 1 });
    } else if (F === 3) {
      slotsList.push({ position: "FWD", label: "Left Wing", index: 0 });
      slotsList.push({ position: "FWD", label: "Striker", index: 1 });
      slotsList.push({ position: "FWD", label: "Right Wing", index: 2 });
    }

    return slotsList;
  };

  const slots = getSlotsForFormation(formation);

  useEffect(() => {
    fetchSquadData();
  }, []);

  const getSlotArrayIndex = (position: "GK" | "DEF" | "MID" | "FWD", index: number): number => {
    const { D, M } = getFormationCounts(formation);
    if (position === "GK") return 0;
    if (position === "DEF") return 1 + index;
    if (position === "MID") return 1 + D + index;
    if (position === "FWD") return 1 + D + M + index;
    return 0;
  };

  const mapLoadedSquadToSlots = (playerIds: number[], playersList: Player[], form: string): (number | null)[] => {
    const slotsArray: (number | null)[] = Array(11).fill(null);
    if (!playerIds || playerIds.length === 0) return slotsArray;

    const squadPlayers = playersList.filter(p => playerIds.includes(p.id));
    const gks = squadPlayers.filter(p => p.position === "GK");
    const defs = squadPlayers.filter(p => p.position === "DEF");
    const mids = squadPlayers.filter(p => p.position === "MID");
    const fwds = squadPlayers.filter(p => p.position === "FWD");

    const { D, M, F } = getFormationCounts(form);

    if (gks.length > 0) slotsArray[0] = gks[0].id;
    for (let i = 0; i < Math.min(D, defs.length); i++) slotsArray[1 + i] = defs[i].id;
    for (let i = 0; i < Math.min(M, mids.length); i++) slotsArray[1 + D + i] = mids[i].id;
    for (let i = 0; i < Math.min(F, fwds.length); i++) slotsArray[1 + D + M + i] = fwds[i].id;

    return slotsArray;
  };

  const fetchSquadData = async () => {
    try {
      const res = await fetch("/api/fantasy/squad");
      const data = await res.json();
      if (data.success) {
        setPlayers(data.players || []);
        setFixtures(data.fixtures || []);
        setActivePlayDay(data.activePlayDay || "2026-06-29");
        setDynamicBudget(data.dynamicBudget || 1000);
        setPlayDayDeadline(data.playDayDeadline || 0);
        setIsLocked(!!data.isLocked);

        if (data.squad) {
          setSquad(data.squad);
          const loadedFormation = data.squad.formation || "4-3-3";
          setFormation(loadedFormation);
          const mappedRoster = mapLoadedSquadToSlots(data.squad.playerIds || [], data.players || [], loadedFormation);
          setSelectedRoster(mappedRoster);
        } else {
          setSquad({
            walletAddress: "GQZnVmJiySbuZ77HWuu4oB1BQaS2hXXnUtNovyGK2PpE",
            playerIds: [],
            players: [],
            budgetRemaining: data.dynamicBudget || 1000,
            totalPoints: 0
          });
          setSelectedRoster(Array(11).fill(null));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const syncStats = async () => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/fantasy/sync");
      const data = await res.json();
      if (data.success) {
        setMessage({ text: data.message, type: "success" });
        await fetchSquadData();
      } else {
        setMessage({ text: data.error || "Sync failed", type: "error" });
      }
    } catch (e: any) {
      setMessage({ text: e.message || "Failed to trigger sync", type: "error" });
    } finally {
      setIsSyncing(false);
    }
  };

  const executeLockRoster = async (activeIds: number[]) => {
    setWeb3Step("signing");
    setIsSaving(true);
    try {
      const res = await fetch("/api/fantasy/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerIds: activeIds, formation })
      });
      const data = await res.json();
      if (data.success) {
        setWeb3Step("success");
        setMessage({ text: "Aura Liquid Squad locked on Solana successfully!", type: "success" });
        await fetchSquadData();
        setTimeout(() => {
          setShowWeb3Modal(false);
          setWeb3Step("idle");
        }, 1500);
      } else {
        setWeb3Step("error");
        setWeb3Error(data.error || "Transaction broadcast failed.");
      }
    } catch (e: any) {
      setWeb3Step("error");
      setWeb3Error(e.message || "Connection timeout to Solana RPC.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveSquad = async () => {
    if (isLocked) {
      setMessage({ text: "This play day has already locked. No squad changes can be saved.", type: "error" });
      return;
    }

    const activeIds = selectedRoster.filter((id): id is number => id !== null);
    if (activeIds.length !== 11) {
      setMessage({ text: `Draft squad is incomplete. You must select exactly 11 players. Current: ${activeIds.length}`, type: "error" });
      return;
    }

    // Verify GK formation rule
    const selectedList = players.filter(p => activeIds.includes(p.id));
    const gks = selectedList.filter(p => p.position === "GK");
    if (gks.length !== 1) {
      setMessage({ text: "Your line-up must contain exactly 1 Goalkeeper.", type: "error" });
      return;
    }

    setMessage(null);
    setShowWeb3Modal(true);
    setWeb3Step("connecting");
    setWeb3Error(null);

    setTimeout(() => {
      setWeb3Step("preparing");
      setTimeout(() => {
        setWeb3Step("authorizing");
      }, 700);
    }, 600);
  };

  const getPlayerAtSlot = (position: "GK" | "DEF" | "MID" | "FWD", index: number): Player | null => {
    const arrayIdx = getSlotArrayIndex(position, index);
    const pId = selectedRoster[arrayIdx];
    if (!pId) return null;
    return players.find(p => p.id === pId) || null;
  };

  const selectPlayer = (player: Player) => {
    if (isLocked) return;
    if (!selectedSlot || !squad) return;

    const arrayIdx = getSlotArrayIndex(selectedSlot.position, selectedSlot.index);
    
    // Check if player is already drafted in another slot
    if (selectedRoster.includes(player.id) && selectedRoster[arrayIdx] !== player.id) {
      setMessage({ text: "Player is already drafted in your squad.", type: "error" });
      return;
    }

    const newRoster = [...selectedRoster];
    newRoster[arrayIdx] = player.id;

    const activeIds = newRoster.filter((id): id is number => id !== null);
    const selectedList = players.filter(p => activeIds.includes(p.id));
    const totalCost = selectedList.reduce((sum, p) => sum + p.currentPrice, 0);

    if (totalCost > dynamicBudget) {
      setMessage({ text: `Selection exceeds the $${(dynamicBudget / 10).toFixed(1)}M salary budget cap for this play day.`, type: "error" });
      return;
    }

    setSelectedRoster(newRoster);
    setSquad({
      ...squad,
      playerIds: activeIds,
      players: selectedList,
      budgetRemaining: dynamicBudget - totalCost,
      totalPoints: selectedList.reduce((sum, p) => sum + p.currentPoints, 0)
    });

    setSelectedSlot(null);
    setMessage(null);
  };

  const removePlayer = (player: Player) => {
    if (isLocked) return;
    if (!squad) return;
    
    const newRoster = selectedRoster.map(id => id === player.id ? null : id);
    const activeIds = newRoster.filter((id): id is number => id !== null);
    const selectedList = players.filter(p => activeIds.includes(p.id));
    const totalCost = selectedList.reduce((sum, p) => sum + p.currentPrice, 0);

    setSelectedRoster(newRoster);
    setSquad({
      ...squad,
      playerIds: activeIds,
      players: selectedList,
      budgetRemaining: dynamicBudget - totalCost,
      totalPoints: selectedList.reduce((sum, p) => sum + p.currentPoints, 0)
    });
    setMessage(null);
  };

  const getSlotColor = (position: string) => {
    switch (position) {
      case "GK": return "#f59e0b"; // Golden Amber
      case "DEF": return "#06b6d4"; // Sapphire Cyan
      case "MID": return "#a855f7"; // Amethyst Purple
      case "FWD": return "#9dff00"; // Emerald Lime
      default: return "#00e5ff";
    }
  };

  const getFlag = (team: string) => {
    const flags: Record<string, string> = {
      "Canada": "🇨🇦", "South Africa": "🇿🇦", "Netherlands": "🇳🇱", "Morocco": "🇲🇦",
      "Germany": "🇩🇪", "Paraguay": "🇵🇾", "France": "🇫🇷", "Sweden": "🇸🇪",
      "Brazil": "🇧🇷", "Japan": "🇯🇵", "Ivory Coast": "🇨🇮", "Norway": "🇳🇴",
      "Mexico": "🇲🇽", "Ecuador": "🇪🇨", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "DR Congo": "🇨🇩",
      "Portugal": "🇵🇹", "Croatia": "🇭🇷", "Spain": "🇪🇸", "Austria": "🇦🇹",
      "United States": "🇺🇸", "USA": "🇺🇸", "Bosnia and Herzegovina": "🇧🇦",
      "Belgium": "🇧🇪", "Senegal": "🇸🇳", "Argentina": "🇦🇷", "Cape Verde": "🇨🇻",
      "Australia": "🇦🇺", "Egypt": "🇪🇬", "Switzerland": "🇨🇭", "Algeria": "🇩🇿",
      "Colombia": "🇨🇴", "Ghana": "🇬🇭"
    };
    return flags[team] || "🏳️";
  };
  const normalizeTeamName = (name: string): string => {
    const lowercase = name.toLowerCase().trim();
    if (lowercase === "usa" || lowercase === "united states") return "usa";
    if (lowercase.includes("bosnia")) return "bosnia";
    if (lowercase.includes("congo") || lowercase.includes("dr congo")) return "congo";
    return lowercase;
  };

  const allowedNormalizedTeams = new Set(
    fixtures
      .filter(f => new Date(f.startTime - 6 * 3600 * 1000).toISOString().split("T")[0] === activePlayDay)
      .flatMap(f => [normalizeTeamName(f.participant1), normalizeTeamName(f.participant2)])
  );

  const filteredPlayers = players.filter(player => {
    // Unconditionally restrict to teams playing on the active play day
    if (!allowedNormalizedTeams.has(normalizeTeamName(player.team))) return false;

    if (filterPosition !== "ALL" && player.position !== filterPosition) return false;
    if (filterTeam !== "ALL" && player.team !== filterTeam) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return player.name.toLowerCase().includes(q) || player.team.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (sortOrder === "price") return b.currentPrice - a.currentPrice;
    return b.currentPoints - a.currentPoints;
  });

  const uniqueTeams = Array.from(new Set(
    players
      .filter(p => allowedNormalizedTeams.has(normalizeTeamName(p.team)))
      .map(p => p.team)
  )).sort();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", minHeight: "100vh", position: "relative" }}>
      
      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "28px", display: "flex", alignItems: "center", gap: "10px" }} className="gradient-text">
            Aura Fantasy Football <Activity size={24} color="var(--color-accent)" />
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginTop: "4px" }}>
            Draft 11 World Cup players under the dynamic budget cap. Experience holographic cards and interactive 3D physics.
          </p>

          {/* Dynamic Play Day & Countdown Timer Banner */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px", 
            marginTop: "10px",
            fontSize: "13px", 
            fontWeight: 600,
            color: "#fff"
          }}>
            <span style={{ 
              background: "rgba(34, 197, 94, 0.15)", 
              border: "1px solid var(--color-accent)",
              padding: "3px 8px", 
              borderRadius: "0px",
              transform: "skewX(-12deg)",
              display: "inline-block",
              fontSize: "11px",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              letterSpacing: "0.5px"
            }}>
              <span style={{ display: "inline-block", transform: "skewX(12deg)" }}>Play Day: {activePlayDay}</span>
            </span>
            <span style={{ color: "rgba(255,255,255,0.15)" }}>&bull;</span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={14} color={isLocked ? "#ff4c4c" : "var(--color-accent)"} />
              <span style={{ color: "var(--color-text-muted)" }}>Kickoff Countdown:</span>
              <strong style={{ 
                color: isLocked ? "#ff4c4c" : "var(--color-accent)",
                fontFamily: "monospace",
                fontSize: "14px",
                letterSpacing: "0.5px"
              }}>
                {timeLeft || "Calculating..."}
              </strong>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Formation Dropdown Selector */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            background: "rgba(255,255,255,0.05)", 
            border: "1px solid var(--border-light)", 
            borderRadius: "0px", 
            transform: "skewX(-12deg)",
            padding: "0 10px 0 12px", 
            height: "38px" 
          }}>
            <span style={{ transform: "skewX(12deg)", display: "inline-block", fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 800 }}>Formation</span>
            <select
              value={formation}
              onChange={(e) => {
                const newFormation = e.target.value;
                setFormation(newFormation);
                const activeIds = selectedRoster.filter((id): id is number => id !== null);
                const remapped = mapLoadedSquadToSlots(activeIds, players, newFormation);
                setSelectedRoster(remapped);
              }}
              className="premium-select"
              style={{
                transform: "skewX(12deg)",
                background: "none",
                border: "none",
                fontSize: "13px",
                color: "#fff",
                fontWeight: 800,
                outline: "none",
                cursor: "pointer",
                paddingRight: "20px",
                backgroundPosition: "right 0px center",
                backgroundSize: "12px",
                height: "100%",
                boxShadow: "none"
              }}
            >
              <option value="4-3-3" style={{ background: "#0b0f19" }}>4-3-3</option>
              <option value="4-4-2" style={{ background: "#0b0f19" }}>4-4-2</option>
              <option value="3-5-2" style={{ background: "#0b0f19" }}>3-5-2</option>
              <option value="3-4-3" style={{ background: "#0b0f19" }}>3-4-3</option>
              <option value="5-3-2" style={{ background: "#0b0f19" }}>5-3-2</option>
            </select>
          </div>

          <button 
            onClick={() => setShowGuide(!showGuide)} 
            className="btn-secondary" 
            style={{ padding: "8px 14px", fontSize: "13px", height: "38px" }}
          >
            <HelpCircle size={16} /> Scoring Rules
          </button>
          
          <button 
            onClick={syncStats} 
            disabled={isSyncing}
            className="btn-secondary" 
            style={{ 
              padding: "8px 14px", 
              fontSize: "13px", 
              height: "38px", 
              background: "var(--color-accent-dim)", 
              border: "1px solid var(--color-accent)",
              color: "var(--color-accent)"
            }}
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} /> 
            {isSyncing ? "Syncing TxLINE..." : "Sync Live Scores"}
          </button>

          <button 
            onClick={saveSquad} 
            disabled={isSaving || isLocked}
            className="btn-primary" 
            style={{ 
              padding: "8px 18px", 
              fontSize: "13px", 
              height: "38px",
              background: isLocked ? "rgba(239, 68, 68, 0.15)" : undefined,
              border: isLocked ? "1px solid #ef4444" : undefined,
              color: isLocked ? "#ef4444" : undefined,
              cursor: isLocked ? "not-allowed" : "pointer"
            }}
          >
            {isLocked ? (
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={15} /> Locked
              </span>
            ) : isSaving ? (
              "Locking..."
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={16} /> Lock Squad
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="glass-panel" style={{ 
          padding: "12px 20px", 
          borderLeft: `4px solid ${message.type === "success" ? "var(--color-success)" : "var(--color-danger)"}`,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "13px",
          background: message.type === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 46, 116, 0.08)"
        }}>
          {message.type === "success" ? <Check size={18} color="var(--color-success)" /> : <AlertCircle size={18} color="var(--color-danger)" />}
          <span style={{ color: "var(--color-text-main)" }}>{message.text}</span>
        </div>
      )}

      {/* Guide/Scoring Rules */}
      {showGuide && (
        <div className="glass-panel animate-fade-in" style={{ padding: "28px", borderRadius: "0px", background: "linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(10, 15, 38, 0.8) 100%)", border: "1px solid rgba(34, 197, 94, 0.25)" }}>
          <h3 style={{ fontSize: "19px", fontWeight: 800, marginBottom: "20px", color: "var(--color-accent)", display: "flex", alignItems: "center", gap: "10px" }}>
            <Sparkles size={22} color="var(--color-accent)" /> Aura Liquid Fantasy: How It Works
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", fontSize: "13.5px", lineHeight: "1.6" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "rgba(34, 197, 94, 0.15)", color: "var(--color-accent)", width: "24px", height: "24px", borderRadius: "0px", transform: "skewX(-12deg)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800 }}><span style={{ transform: "skewX(12deg)" }}>1</span></span>
                <strong style={{ color: "#fff" }}>Live Option Pricing</strong>
              </div>
              <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
                Every player's draft price is tied directly to the live trading price of their <strong>YES Option</strong> in the prediction markets.
              </p>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.03)", fontSize: "12px", fontFamily: "monospace" }}>
                <span style={{ color: "var(--color-accent)" }}>Yamal YES trades at 65¢</span> &rarr; <span style={{ color: "#fff" }}>$9.8M Draft Cost</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "rgba(34, 197, 94, 0.15)", color: "var(--color-accent)", width: "24px", height: "24px", borderRadius: "0px", transform: "skewX(-12deg)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800 }}><span style={{ transform: "skewX(12deg)" }}>2</span></span>
                <strong style={{ color: "#fff" }}>Web3 Collateral Lock</strong>
              </div>
              <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
                When locking your 11-player squad, deposit a fixed collateral fee of <strong>0.05 SOL</strong>. This enters your portfolio directly into the Solana yield pool.
              </p>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.03)", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-dim)" }}>Devnet Stake Required:</span>
                <strong style={{ color: "var(--color-success)" }}>0.05 SOL</strong>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "rgba(34, 197, 94, 0.15)", color: "var(--color-accent)", width: "24px", height: "24px", borderRadius: "0px", transform: "skewX(-12deg)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800 }}><span style={{ transform: "skewX(12deg)" }}>3</span></span>
                <strong style={{ color: "#fff" }}>Claim Real Yield (ROI)</strong>
              </div>
              <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
                Each drafted player who scores, assists, or keeps a clean sheet resolves their YES contract to 100¢. Your return yield is based on successfully resolved contracts!
              </p>
              <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.03)", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-dim)" }}>Average 8/11 Success Payout:</span>
                <strong style={{ color: "var(--color-accent)" }}>0.072 SOL (+44% ROI)</strong>
              </div>
            </div>
          </div>

          {/* Point System Breakdown Collapse */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "20px", paddingTop: "16px", display: "flex", gap: "32px", flexWrap: "wrap", fontSize: "12px", color: "var(--color-text-muted)" }}>
            <div>
              <span style={{ fontWeight: 800, color: "#fff", marginRight: "8px" }}>Point Accruals:</span>
              Goal (FWD +4, MID +5, CB +6) | Assist (+3) | Clean Sheet (+4) | Win (+2) | Corners (+0.5)
            </div>
            <div>
              <span style={{ fontWeight: 800, color: "var(--color-danger)", marginRight: "8px" }}>Deductions:</span>
              Yellow Card (-1) | Red Card (-3) | Conceded Goals (-1 per 2 conceded)
            </div>
          </div>
        </div>
      )}

      {/* Roster & Stats Header Dashboard */}
      {(() => {
        const squadYield = squad?.yieldRate ?? 0;
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            <div className="glass-panel" style={{ padding: "16px", borderRadius: "0px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "rgba(34, 197, 94, 0.1)", borderRadius: "0px", transform: "skewX(-12deg)", padding: "10px", display: "inline-flex" }}>
                <div style={{ transform: "skewX(12deg)", display: "flex" }}>
                  <Coins size={24} color="var(--color-accent)" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Remaining Budget</div>
                <div style={{ fontSize: "20px", fontWeight: 800 }}>
                  ${squad ? (squad.budgetRemaining / 10).toFixed(1) : (dynamicBudget / 10).toFixed(1)}M
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "16px", borderRadius: "0px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "rgba(34, 197, 94, 0.1)", borderRadius: "0px", transform: "skewX(-12deg)", padding: "10px", display: "inline-flex" }}>
                <div style={{ transform: "skewX(12deg)", display: "flex" }}>
                  <Award size={24} color="var(--color-accent)" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Total points</div>
                <div style={{ fontSize: "20px", fontWeight: 800 }}>
                  {squad ? squad.totalPoints : 0} PTS
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "16px", borderRadius: "0px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ background: "rgba(6, 182, 212, 0.1)", borderRadius: "0px", transform: "skewX(-12deg)", padding: "10px", display: "inline-flex" }}>
                <div style={{ transform: "skewX(12deg)", display: "flex" }}>
                  <Zap size={24} color="#06b6d4" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Draft count</div>
                <div style={{ fontSize: "20px", fontWeight: 800 }}>
                  {selectedRoster.filter(id => id !== null).length} / 11
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "16px", borderRadius: "0px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ 
                background: squad && squad.playerIds && squad.playerIds.length > 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.03)", 
                borderRadius: "0px", 
                transform: "skewX(-12deg)",
                padding: "10px",
                display: "inline-flex"
              }}>
                <div style={{ transform: "skewX(12deg)", display: "flex" }}>
                  <Wallet size={24} color={squad && squad.playerIds && squad.playerIds.length > 0 ? "var(--color-success)" : "var(--color-text-muted)"} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>Locked Collateral</div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: squad && squad.playerIds && squad.playerIds.length > 0 ? "var(--color-success)" : "#fff" }}>
                  {squad && squad.playerIds && squad.playerIds.length > 0 ? "0.05" : "0.00"} SOL
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "16px", borderRadius: "0px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ 
                background: squad && squad.playerIds && squad.playerIds.length > 0 && squadYield >= 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(255, 46, 116, 0.1)", 
                borderRadius: "0px", 
                transform: "skewX(-12deg)",
                padding: "10px",
                display: "inline-flex"
              }}>
                <div style={{ transform: "skewX(12deg)", display: "flex" }}>
                  <TrendingUp size={24} color={squad && squad.playerIds && squad.playerIds.length > 0 && squadYield >= 0 ? "var(--color-accent)" : "var(--color-danger)"} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                  {squad && squad.playerIds && squad.playerIds.length > 0 ? "Roster Yield (ROI)" : "Est. Yield (ROI)"}
                </div>
                <div style={{ 
                  fontSize: "20px", 
                  fontWeight: 800, 
                  color: squad && squad.playerIds && squad.playerIds.length > 0 
                    ? (squadYield >= 0 ? "var(--color-accent)" : "var(--color-danger)") 
                    : "var(--color-text-muted)"
                }}>
                  {squad && squad.playerIds && squad.playerIds.length > 0 
                    ? `${(squadYield >= 0 ? "+" : "")}${squadYield.toFixed(1)}%` 
                    : `${(selectedRoster.filter(id => id !== null).length > 0 
                        ? ((selectedRoster.filter(id => id !== null).reduce((sum, pId) => {
                            const player = players.find(p => p.id === pId);
                            if (!player) return sum;
                            const yesPrice = Math.round(player.currentPrice / 1.5);
                            return sum + (yesPrice / 100) * 0.009;
                          }, 0) - 0.05) / 0.05) * 100
                        : 0
                      ).toFixed(1)}%`
                  }
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Pitch & Selection area */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
        
        {/* The Football Pitch Container */}
        <div style={{ 
          background: "linear-gradient(180deg, #05180f 0%, #020704 100%)",
          borderRadius: "0px",
          border: "2px solid rgba(22, 101, 52, 0.5)",
          padding: "45px 20px",
          position: "relative",
          boxShadow: "0 25px 60px rgba(0,0,0,0.65), inset 0 0 100px rgba(16, 185, 129, 0.12)",
          overflow: "hidden"
        }}>
          {/* Field Markings */}
          <div style={{ position: "absolute", inset: "25px", border: "1px dashed rgba(16, 185, 129, 0.22)", borderRadius: "0px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: "50%", top: "25px", bottom: "25px", width: "1px", borderLeft: "1px dashed rgba(16, 185, 129, 0.22)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "160px", height: "160px", borderRadius: "50%", border: "1px dashed rgba(16, 185, 129, 0.22)", pointerEvents: "none" }} />

          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            justifyContent: "space-between", 
            height: "760px",
            position: "relative",
            zIndex: 10
          }}>
            {/* STRIKERS / ATTACK (FWD) */}
            <div style={{ display: "flex", justifyContent: "space-around", width: "100%" }}>
              {slots.filter(s => s.position === "FWD").map((slot) => {
                const player = getPlayerAtSlot(slot.position, slot.index);
                return (
                  <div key={`FWD-${slot.index}`} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: "10px", color: "var(--color-text-dim)", marginBottom: "8px", fontWeight: 700, letterSpacing: "1px" }}>{slot.label}</div>
                    <PitchCard 
                      player={player} 
                      position={slot.position} 
                      onClick={isLocked ? () => {} : () => setSelectedSlot({ position: slot.position, index: slot.index })}
                      onRemove={player && !isLocked ? () => removePlayer(player) : undefined}
                      onFocus={player ? () => setFocusedPlayer(player) : undefined}
                      color={getSlotColor(slot.position)}
                      flag={player ? getFlag(player.team) : ""}
                    />
                  </div>
                );
              })}
            </div>

            {/* MIDFIELDERS (MID) */}
            <div style={{ display: "flex", justifyContent: "space-around", width: "100%" }}>
              {slots.filter(s => s.position === "MID").map((slot) => {
                const player = getPlayerAtSlot(slot.position, slot.index);
                return (
                  <div key={`MID-${slot.index}`} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: "10px", color: "var(--color-text-dim)", marginBottom: "8px", fontWeight: 700, letterSpacing: "1px" }}>{slot.label}</div>
                    <PitchCard 
                      player={player} 
                      position={slot.position} 
                      onClick={isLocked ? () => {} : () => setSelectedSlot({ position: slot.position, index: slot.index })}
                      onRemove={player && !isLocked ? () => removePlayer(player) : undefined}
                      onFocus={player ? () => setFocusedPlayer(player) : undefined}
                      color={getSlotColor(slot.position)}
                      flag={player ? getFlag(player.team) : ""}
                    />
                  </div>
                );
              })}
            </div>

            {/* DEFENDERS (DEF) */}
            <div style={{ display: "flex", justifyContent: "space-around", width: "100%" }}>
              {slots.filter(s => s.position === "DEF").map((slot) => {
                const player = getPlayerAtSlot(slot.position, slot.index);
                return (
                  <div key={`DEF-${slot.index}`} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: "10px", color: "var(--color-text-dim)", marginBottom: "8px", fontWeight: 700, letterSpacing: "1px" }}>{slot.label}</div>
                    <PitchCard 
                      player={player} 
                      position={slot.position} 
                      onClick={isLocked ? () => {} : () => setSelectedSlot({ position: slot.position, index: slot.index })}
                      onRemove={player && !isLocked ? () => removePlayer(player) : undefined}
                      onFocus={player ? () => setFocusedPlayer(player) : undefined}
                      color={getSlotColor(slot.position)}
                      flag={player ? getFlag(player.team) : ""}
                    />
                  </div>
                );
              })}
            </div>

            {/* GOALKEEPER (GK) */}
            <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
              {slots.filter(s => s.position === "GK").map((slot) => {
                const player = getPlayerAtSlot(slot.position, slot.index);
                return (
                  <div key={`GK-${slot.index}`} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ fontSize: "10px", color: "var(--color-text-dim)", marginBottom: "8px", fontWeight: 700, letterSpacing: "1px" }}>{slot.label}</div>
                    <PitchCard 
                      player={player} 
                      position={slot.position} 
                      onClick={isLocked ? () => {} : () => setSelectedSlot({ position: slot.position, index: slot.index })}
                      onRemove={player && !isLocked ? () => removePlayer(player) : undefined}
                      onFocus={player ? () => setFocusedPlayer(player) : undefined}
                      color={getSlotColor(slot.position)}
                      flag={player ? getFlag(player.team) : ""}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Selection Drawer / Focus details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Selection Modal/Drawer */}
          {selectedSlot ? (
            <div className="glass-panel" style={{ 
              padding: "20px", 
              border: `1px solid ${getSlotColor(selectedSlot.position)}`,
              background: "rgba(10, 15, 38, 0.95)",
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 15px ${getSlotColor(selectedSlot.position)}22`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Layers size={16} color={getSlotColor(selectedSlot.position)} /> Draft {selectedSlot.position}
                </h3>
                <button 
                  onClick={() => setSelectedSlot(null)} 
                  style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "22px", lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              {/* Roster Filters */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "11px", color: "var(--color-text-dim)" }} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search player or team..." 
                    style={{ 
                      width: "100%", 
                      background: "rgba(0,0,0,0.25)", 
                      border: "1px solid var(--border-light)", 
                      borderRadius: "0px", 
                      padding: "8px 10px 8px 30px", 
                      fontSize: "12px",
                      color: "#fff"
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <select 
                    value={filterTeam} 
                    onChange={(e) => setFilterTeam(e.target.value)}
                    className="premium-select"
                    style={{ 
                      flex: 1, 
                      padding: "6px 28px 6px 10px", 
                      fontSize: "11px"
                    }}
                  >
                    <option value="ALL">🌐 All Teams</option>
                    {uniqueTeams.map(t => (
                      <option key={t} value={t}>{getFlag(t)} {t}</option>
                    ))}
                  </select>

                  <select 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="premium-select"
                    style={{ 
                      flex: 1, 
                      padding: "6px 28px 6px 10px", 
                      fontSize: "11px"
                    }}
                  >
                    <option value="points">Sort: Points</option>
                    <option value="price">Sort: Price</option>
                  </select>
                </div>
              </div>

              {/* Roster list */}
              <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredPlayers.filter(p => p.position === selectedSlot.position).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px", color: "var(--color-text-dim)", fontSize: "12px" }}>
                    No matching players found
                  </div>
                ) : (
                  filteredPlayers.filter(p => p.position === selectedSlot.position).map(p => {
                    const isDrafted = selectedRoster.includes(p.id);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => !isDrafted && selectPlayer(p)}
                        style={{ 
                          padding: "8px 10px", 
                          background: isDrafted ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.03)", 
                          borderRadius: "0px", 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          cursor: isDrafted ? "default" : "pointer",
                          opacity: isDrafted ? 0.4 : 1,
                          border: "1px solid transparent",
                          transition: "var(--transition-smooth)"
                        }}
                        className="roster-item-hover"
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "0px", overflow: "hidden", transform: "skewX(-12deg)", border: "1px solid rgba(255,255,255,0.1)" }}>
                            <div style={{ transform: "skewX(12deg)", width: "100%", height: "100%" }}>
                              <PlayerAvatar player={p} />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 600 }}>{p.name}</div>
                            <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                              {getFlag(p.team)} {p.team}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-accent)" }}>
                            ${(p.currentPrice / 10).toFixed(1)}M
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                            {p.currentPoints} pts
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Matchday Status Card */}
              <div className="glass-panel" style={{ 
                padding: "20px",
                border: isLocked ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
                background: isLocked ? "rgba(239, 68, 68, 0.02)" : "rgba(16, 185, 129, 0.02)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid var(--border-light)", paddingBottom: "10px" }}>
                  <Calendar size={16} color={isLocked ? "#ff4c4c" : "#10b981"} />
                  <h3 style={{ fontSize: "14px", fontWeight: 700 }}>Matchday Status Guide</h3>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", lineHeight: "1.5" }}>
                  <div>
                    <span style={{ color: "var(--color-text-muted)" }}>Active Play Day: </span>
                    <strong style={{ color: "#fff" }}>{activePlayDay}</strong>
                  </div>

                  <div>
                    <span style={{ color: "var(--color-text-muted)" }}>Roster Picking Status: </span>
                    <strong style={{ color: isLocked ? "#ff4c4c" : "#10b981" }}>
                      {isLocked ? "LOCKED (Kicked Off)" : "OPEN (Drafting Available)"}
                    </strong>
                  </div>

                  {isLocked ? (
                    <div style={{ 
                      padding: "10px", 
                      background: "rgba(239, 68, 68, 0.08)", 
                      borderRadius: "0px", 
                      fontSize: "11.5px", 
                      color: "var(--color-text-main)",
                      border: "1px solid rgba(239, 68, 68, 0.15)"
                    }}>
                      <strong>Why is it locked?</strong> Roster locked on <strong>{playDayDeadline > 0 ? new Date(playDayDeadline).toLocaleString() : "Loading..."}</strong> because matches have already started. To unlock drafting, click the <strong>"Sync Live Scores"</strong> button above to resolve the matches and advance to the next play day.
                    </div>
                  ) : (
                    <div>
                      <span style={{ color: "var(--color-text-muted)" }}>Deadline: </span>
                      <strong style={{ color: "var(--color-accent)", fontFamily: "monospace" }}>
                        {playDayDeadline > 0 ? new Date(playDayDeadline).toLocaleString() : "Loading..."}
                      </strong>
                    </div>
                  )}

                  <div>
                    <span style={{ color: "var(--color-text-muted)", display: "block", marginBottom: "4px" }}>Allowed Teams Today:</span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
                      {fixtures.length === 0 ? (
                        <span style={{ color: "var(--color-text-dim)", fontSize: "11px", fontStyle: "italic" }}>Loading active teams...</span>
                      ) : (
                        Array.from(new Set(
                          fixtures
                            .filter(f => new Date(f.startTime - 6 * 3600 * 1000).toISOString().split("T")[0] === activePlayDay)
                            .flatMap(f => [f.participant1, f.participant2])
                        )).map(team => (
                          <span key={team} style={{ 
                            background: "rgba(255,255,255,0.06)", 
                            padding: "2px 6px", 
                            borderRadius: "0px", 
                            transform: "skewX(-12deg)",
                            fontSize: "11px",
                            border: "1px solid rgba(255,255,255,0.05)",
                            display: "inline-block"
                          }}>
                            <span style={{ transform: "skewX(12deg)", display: "inline-block" }}>
                              {getFlag(team)} {team}
                            </span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Guide */}
              <div className="glass-panel" style={{ padding: "20px", borderRadius: "0px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", borderBottom: "1px solid var(--border-light)", paddingBottom: "10px" }}>
                  <Info size={16} color="var(--color-accent)" />
                  <h3 style={{ fontSize: "14px" }}>Verification Guide</h3>
                </div>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", lineHeight: "1.5" }}>
                  Hover over drafted players to trigger the dynamic 3D card tilt and holographic foil glare. Select any card to focus and view their stats details.
                </p>
              </div>
            </div>
          )}

          {/* Focused Player Detail Panel */}
          {focusedPlayer && (
            <div className="glass-panel" style={{ 
              padding: "20px", 
              borderRadius: "0px",
              borderLeft: `4px solid ${getSlotColor(focusedPlayer.position)}`,
              background: "rgba(10, 15, 38, 0.95)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "0px", overflow: "hidden", transform: "skewX(-12deg)", border: `1.5px solid ${getSlotColor(focusedPlayer.position)}` }}>
                    <div style={{ transform: "skewX(12deg)", width: "100%", height: "100%" }}>
                      <PlayerAvatar player={focusedPlayer} />
                    </div>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "14px", fontWeight: 700 }}>{focusedPlayer.name}</h4>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {getFlag(focusedPlayer.team)} {focusedPlayer.team} &bull; {focusedPlayer.position}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setFocusedPlayer(null)} 
                  style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "16px" }}
                >
                  &times;
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px", marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "6px" }}>
                  <span>Dynamic Valuation:</span>
                  <strong style={{ color: "var(--color-accent)" }}>${(focusedPlayer.currentPrice / 10).toFixed(1)}M</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "6px" }}>
                  <span>Total Fantasy Points:</span>
                  <strong style={{ color: "#fff" }}>{focusedPlayer.currentPoints} PTS</strong>
                </div>
                
                <div style={{ marginTop: "10px", fontSize: "11px", color: "var(--color-text-muted)" }}>
                  <div style={{ fontWeight: 600, color: "var(--color-text-main)", marginBottom: "6px" }}>Statistics Attributed (Deterministic):</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <div style={{ padding: "4px 8px", background: "rgba(255,255,255,0.02)", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.04)" }}>Goals: {focusedPlayer.goals}</div>
                    <div style={{ padding: "4px 8px", background: "rgba(255,255,255,0.02)", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.04)" }}>Assists: {focusedPlayer.assists}</div>
                    <div style={{ padding: "4px 8px", background: "rgba(255,255,255,0.02)", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.04)" }}>Clean Sheets: {focusedPlayer.cleanSheets}</div>
                    <div style={{ padding: "4px 8px", background: "rgba(255,255,255,0.02)", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.04)" }}>Yellow: {focusedPlayer.yellowCards}</div>
                    <div style={{ padding: "4px 8px", background: "rgba(255,255,255,0.02)", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.04)" }}>Red: {focusedPlayer.redCards}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Roster Leaderboard / Top Players */}
          <div className="glass-panel" style={{ padding: "20px", borderRadius: "0px" }}>
            <h3 style={{ fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-light)", paddingBottom: "8px" }}>
              Roster Leaders (Round of 32)
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {players.slice(0, 5).map((p, idx) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span>{idx+1}. {p.name} ({getFlag(p.team)})</span>
                  <strong style={{ color: "var(--color-accent)" }}>{p.currentPoints} pts</strong>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* World Cup Round Fixtures Recap */}
      <div className="glass-panel" style={{ padding: "24px", borderRadius: "0px" }}>
        <h3 style={{ fontSize: "18px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Calendar size={20} color="var(--color-accent)" /> World Cup Round of 32 Matches (Oracle Feeds)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
          {fixtures.slice(0, 16).map(f => {
            const isFinished = f.status === "Finished";
            const isLive = f.status === "InPlay";
            return (
              <div 
                key={f.fixtureId} 
                style={{ 
                  padding: "12px 16px", 
                  background: isLive ? "rgba(34, 197, 94, 0.08)" : "rgba(255,255,255,0.02)",
                  border: isLive ? "1px solid var(--color-accent)" : "1px solid var(--border-light)",
                  borderRadius: "0px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--color-text-dim)" }}>
                  <span>ID: {f.fixtureId}</span>
                  <span style={{ 
                    color: isLive ? "var(--color-danger)" : isFinished ? "var(--color-success)" : "var(--color-text-dim)", 
                    fontWeight: 700 
                  }}>
                    {isLive ? "● LIVE" : isFinished ? "FINISHED" : "UPCOMING"}
                  </span>
                </div>
                
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                    <span>{getFlag(f.participant1)} {f.participant1}</span>
                  </div>
                  <strong style={{ fontSize: "14px" }}>{isFinished || isLive ? f.score1 : "-"}</strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
                    <span>{getFlag(f.participant2)} {f.participant2}</span>
                  </div>
                  <strong style={{ fontSize: "14px" }}>{isFinished || isLive ? f.score2 : "-"}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Web3 Solana Collateral Lock Modal */}
      {showWeb3Modal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(3, 7, 18, 0.85)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "20px"
        }}>
          <div className="glass-panel" style={{
            width: "100%",
            maxWidth: "480px",
            background: "linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(3, 7, 18, 0.98) 100%)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "0px",
            padding: "28px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 24px rgba(34, 197, 94, 0.15)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            gap: "20px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Wallet size={20} color="var(--color-accent)" />
                <h3 style={{ fontSize: "16px", fontWeight: 800 }}>Solana devnet transaction</h3>
              </div>
              {web3Step !== "signing" && web3Step !== "success" && (
                <button 
                  onClick={() => setShowWeb3Modal(false)}
                  style={{ background: "none", border: "none", color: "var(--color-text-dim)", fontSize: "20px", cursor: "pointer" }}
                >
                  &times;
                </button>
              )}
            </div>

            {/* Steps Console / Log Output */}
            <div style={{ 
              background: "rgba(0,0,0,0.4)", 
              padding: "16px", 
              borderRadius: "0px", 
              fontFamily: "monospace", 
              fontSize: "12px", 
              display: "flex", 
              flexDirection: "column", 
              gap: "10px",
              border: "1px solid rgba(255,255,255,0.04)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: web3Step === "connecting" ? "var(--color-accent)" : "var(--color-success)" }}>
                <span>[1/4]</span>
                <span>Connecting Wallet GQZn...2PpE</span>
                {web3Step === "connecting" ? <RefreshCw size={12} className="animate-spin" /> : <span>✓</span>}
              </div>

              {(web3Step !== "connecting") && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: web3Step === "preparing" ? "var(--color-accent)" : "var(--color-success)" }}>
                  <span>[2/4]</span>
                  <span>Preparing Squad Options payload</span>
                  {web3Step === "preparing" ? <RefreshCw size={12} className="animate-spin" /> : <span>✓</span>}
                </div>
              )}

              {(web3Step !== "connecting" && web3Step !== "preparing") && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: web3Step === "authorizing" ? "var(--color-accent)" : "var(--color-success)" }}>
                  <span>[3/4]</span>
                  <span>Authorizing 0.05 SOL Collateral lock</span>
                  {web3Step === "authorizing" ? <span className="animate-pulse" style={{ color: "var(--color-accent)" }}>●</span> : <span>✓</span>}
                </div>
              )}

              {(web3Step === "signing" || web3Step === "success" || web3Step === "error") && (
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px", 
                  color: web3Step === "signing" ? "var(--color-accent)" : web3Step === "error" ? "var(--color-danger)" : "var(--color-success)" 
                }}>
                  <span>[4/4]</span>
                  <span>{web3Step === "signing" ? "Signing & Broadcasting to Solana..." : web3Step === "error" ? "Transaction Failed" : "Transaction Finalized!"}</span>
                  {web3Step === "signing" ? <RefreshCw size={12} className="animate-spin" /> : web3Step === "error" ? <span>✕</span> : <span>✓</span>}
                </div>
              )}
            </div>

            {/* Roster & Pricing breakdown */}
            {web3Step === "authorizing" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  You are locking a squad of 11 players. Their dynamically priced performance contracts will be registered in the Solana Liquid Pool:
                </div>
                <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "0px", border: "1px solid rgba(255,255,255,0.04)" }}>
                  {players.filter(p => selectedRoster.filter(id => id !== null).includes(p.id)).map(p => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "var(--color-text-main)" }}>{p.name} ({p.team})</span>
                      <span style={{ color: "var(--color-accent)" }}>${(p.currentPrice / 10).toFixed(1)}M</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: "10px", fontSize: "13px" }}>
                  <span>Total Deposit Fee:</span>
                  <strong style={{ color: "#fff" }}>0.05 SOL</strong>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {web3Step === "authorizing" && (
              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button 
                  onClick={() => setShowWeb3Modal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, height: "42px" }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => executeLockRoster(selectedRoster.filter((id): id is number => id !== null))}
                  className="btn-primary"
                  style={{ 
                    flex: 1, 
                    height: "42px", 
                    borderRadius: "0px",
                    background: "var(--color-accent-dim)", 
                    border: "1px solid var(--color-accent)", 
                    color: "var(--color-accent)",
                    boxShadow: "0 0 12px rgba(34, 197, 94, 0.4)" 
                  }}
                >
                  Approve & Sign
                </button>
              </div>
            )}

            {web3Step === "success" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "10px 0" }}>
                <div style={{ background: "rgba(16, 185, 129, 0.15)", borderRadius: "0px", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Check size={28} color="var(--color-success)" />
                </div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-success)" }}>Transaction Confirmed!</div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", textAlign: "center" }}>
                  Signature: <span style={{ fontFamily: "monospace", color: "var(--color-accent)" }}>5Gz3...7mKp</span>
                </div>
              </div>
            )}

            {web3Step === "error" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-danger)" }}>
                  <AlertCircle size={20} />
                  <span style={{ fontSize: "13px", fontWeight: 700 }}>Transaction Error</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", background: "rgba(255,46,116,0.06)", padding: "10px", borderRadius: "0px", border: "1px solid rgba(255,46,116,0.15)", fontFamily: "monospace" }}>
                  {web3Error}
                </div>
                <button 
                  onClick={() => {
                    setWeb3Step("connecting");
                    setWeb3Error(null);
                    setTimeout(() => {
                      setWeb3Step("preparing");
                      setTimeout(() => {
                        setWeb3Step("authorizing");
                      }, 700);
                    }, 600);
                  }}
                  className="btn-primary"
                  style={{ height: "40px", borderRadius: "0px" }}
                >
                  Retry Transaction
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Procedural Cyberpunk SVG Avatar Component
function PlayerAvatar({ player }: { player: Player }) {
  const [hasError, setHasError] = useState(false);
  const colors = TEAM_COLORS[player.team] || { primary: "#5f3bf6", secondary: "#00e5ff" };
  const initials = player.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  
  const getPositionGlow = (pos: string) => {
    switch (pos) {
      case "GK": return "#f59e0b";
      case "DEF": return "#06b6d4";
      case "MID": return "#a855f7";
      case "FWD": return "#9dff00";
      default: return "#00e5ff";
    }
  };
  
  const glow = getPositionGlow(player.position);
  
  if (player.fotmobId && !hasError) {
    const photoUrl = `https://images.fotmob.com/image_resources/playerimages/${player.fotmobId}.png`;
    return (
      <div style={{ width: "100%", height: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img 
          src={photoUrl} 
          alt={player.name}
          onError={() => setHasError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0px 3px 5px rgba(0,0,0,0.6))",
            zIndex: 2
          }}
        />
        {/* Subtle background glow for the photo */}
        <div style={{
          position: "absolute",
          inset: "10%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glow}44 0%, transparent 70%)`,
          filter: "blur(4px)",
          zIndex: 1,
          pointerEvents: "none"
        }} />
      </div>
    );
  }
  
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ display: "block" }}>
      <defs>
        <linearGradient id={`bg-grad-${player.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} stopOpacity="0.45" />
          <stop offset="50%" stopColor="rgba(10, 15, 30, 0.9)" />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.25" />
        </linearGradient>
        <filter id={`glow-${player.id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Background card */}
      <rect width="100" height="100" fill={`url(#bg-grad-${player.id})`} rx="8" />
      
      {/* Abstract Circuit lines */}
      <path d="M 10 20 L 30 20 L 40 30 M 90 20 L 70 20 L 60 30 M 10 80 L 30 80 L 45 65" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />
      <circle cx="40" cy="30" r="1.5" fill="rgba(255,255,255,0.2)" />
      <circle cx="60" cy="30" r="1.5" fill="rgba(255,255,255,0.2)" />
      <circle cx="45" cy="65" r="1.5" fill="rgba(255,255,255,0.2)" />

      {/* HUD overlays */}
      <circle cx="50" cy="50" r="38" stroke="rgba(255,255,255,0.03)" strokeWidth="1" fill="none" strokeDasharray="5, 3" />
      <circle cx="50" cy="50" r="44" stroke={glow} strokeWidth="0.5" strokeOpacity="0.2" fill="none" />
      
      {/* Stylized Silhouette */}
      <path d="M 38 48 C 38 28, 62 28, 62 48" fill="rgba(255,255,255,0.12)" />
      <circle cx="50" cy="42" r="11" fill="rgba(255,255,255,0.18)" />
      
      <path d="M 46 51 L 54 51 L 54 55 L 46 55 Z" fill="rgba(255,255,255,0.15)" />
      <path d="M 30 72 C 30 58, 70 58, 70 72 Z" fill="rgba(255,255,255,0.22)" />
      
      {/* Visor */}
      <rect x="42" y="38" width="16" height="4" rx="1" fill={glow} filter={`url(#glow-${player.id})`} />
      <line x1="39" y1="40" x2="61" y2="40" stroke={glow} strokeWidth="0.5" strokeOpacity="0.6" />

      {/* Team Color Chest Overlay */}
      <path d="M 45 61 L 55 61 L 57 72 L 43 72 Z" fill={colors.primary} opacity="0.65" />
      
      {/* Initials Text */}
      <text x="50" y="69" fontSize="8" fontWeight="900" fill="#fff" textAnchor="middle" opacity="0.85" style={{ letterSpacing: '0.5px' }}>
        {initials}
      </text>

      {/* Star emblem */}
      <circle cx="50" cy="14" r="5" fill="rgba(0,0,0,0.4)" stroke={glow} strokeWidth="0.75" />
      <text x="50" y="16.5" fontSize="7" fontWeight="bold" fill="#fff" textAnchor="middle">
        ★
      </text>
    </svg>
  );
}

// Subcomponent: 3D Holographic FUT Trading Card
interface PitchCardProps {
  player: Player | null;
  position: "GK" | "DEF" | "MID" | "FWD";
  onClick: () => void;
  onRemove?: () => void;
  onFocus?: () => void;
  color: string;
  flag: string;
}

function PitchCard({ player, position, onClick, onRemove, onFocus, color, flag }: PitchCardProps) {
  const [hovered, setHovered] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    setRotateX((yc - y) / 5);
    setRotateY((x - xc) / 5);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  if (!player) {
    return (
      <div 
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: "95px",
          height: "142px",
          position: "relative",
          cursor: "pointer",
          clipPath: "polygon(0% 0%, 100% 0%, 100% 82%, 50% 100%, 0% 82%)",
          background: hovered 
            ? `linear-gradient(135deg, ${color} 0%, rgba(255,255,255,0.06) 100%)`
            : "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          padding: "1.5px",
          transition: "transform 0.2s ease, filter 0.2s ease",
          transform: hovered ? "scale(1.05)" : "scale(1)",
          filter: hovered 
            ? `drop-shadow(0 10px 20px rgba(0,0,0,0.5)) drop-shadow(0 0 8px ${color}55)` 
            : "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
        }}
      >
        <div style={{
          width: "100%",
          height: "100%",
          clipPath: "polygon(0% 0%, 100% 0%, 100% 82%, 50% 100%, 0% 82%)",
          background: "rgba(10, 15, 30, 0.7)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px"
        }}>
          <Plus size={20} color={color} />
          <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-text-dim)", letterSpacing: "1px" }}>DRAFT</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onFocus}
      style={{
        width: "110px",
        height: "165px",
        position: "relative",
        cursor: "pointer",
        clipPath: "polygon(0% 0%, 100% 0%, 100% 82%, 50% 100%, 0% 82%)",
        background: hovered 
          ? `linear-gradient(135deg, var(--color-accent) 0%, ${color} 100%)`
          : `linear-gradient(135deg, ${color}55 0%, rgba(255,255,255,0.05) 50%, ${color}22 100%)`,
        padding: "1.5px",
        transition: "transform 0.1s ease, filter 0.3s ease",
        transform: hovered 
          ? `perspective(300px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.08) translateY(-4px)` 
          : "perspective(300px) rotateX(0deg) rotateY(0deg) scale(1)",
        filter: hovered 
          ? `drop-shadow(0 15px 30px rgba(0,0,0,0.6)) drop-shadow(0 0 15px ${color}88)` 
          : `drop-shadow(0 6px 12px rgba(0,0,0,0.45))`,
      }}
    >
      <div style={{
        width: "100%",
        height: "100%",
        clipPath: "polygon(0% 0%, 100% 0%, 100% 82%, 50% 100%, 0% 82%)",
        background: "linear-gradient(180deg, rgba(10, 20, 50, 0.95) 0%, rgba(5, 10, 25, 0.98) 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "10px 8px 26px 8px",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Holographic Glare Overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: hovered 
            ? `linear-gradient(${rotateY * 4 + 135}deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.06) 100%)`
            : `linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 60%)`,
          mixBlendMode: "overlay",
          pointerEvents: "none",
          zIndex: 5,
          transition: "background 0.1s ease"
        }} />

        {/* Shifting Foil Shine */}
        {hovered && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(255, 0, 128, 0.08) 0%, rgba(0, 255, 255, 0.08) 50%, rgba(255, 255, 0, 0.08) 100%)",
            mixBlendMode: "color-dodge",
            pointerEvents: "none",
            zIndex: 4,
            animation: "pulse 2s infinite alternate"
          }} />
        )}

        {/* Remove Card button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (onRemove) onRemove();
          }}
          style={{
            position: "absolute",
            top: "4px",
            right: "4px",
            background: "var(--color-danger)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: "18px",
            height: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            cursor: "pointer",
            zIndex: 20,
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)"
          }}
        >
          &times;
        </button>

        {/* Card Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
          <span style={{ fontSize: "13px" }}>{flag}</span>
          <span style={{ 
            fontSize: "8px", 
            fontWeight: 850, 
            background: color, 
            color: position === "FWD" ? "#000" : "#fff",
            padding: "1px 4px", 
            borderRadius: "3px" 
          }}>{position}</span>
        </div>

        {/* Player Avatar */}
        <div style={{ 
          width: "54px", 
          height: "54px", 
          margin: "4px auto", 
          position: "relative",
          zIndex: 10
        }}>
          <PlayerAvatar player={player} />
        </div>

        {/* Player Name */}
        <div style={{ 
          fontSize: "10px", 
          fontWeight: 800, 
          textAlign: "center", 
          lineHeight: "1.1",
          color: "#fff",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          margin: "4px 0",
          zIndex: 10,
          textShadow: "0 1px 3px rgba(0,0,0,0.8)"
        }}>
          {player.name.split(" ").slice(-1)[0]}
        </div>

        {/* Pricing / Points footer - Centered to prevent clipping from sloped edges */}
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          gap: "6px",
          borderTop: "1px solid rgba(255,255,255,0.08)", 
          paddingTop: "4px",
          zIndex: 10 
        }}>
          <span style={{ fontSize: "8px", color: "var(--color-text-muted)" }}>${(player.currentPrice / 10).toFixed(1)}M</span>
          <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.2)" }}>•</span>
          <span style={{ fontSize: "9px", fontWeight: 850, color: "var(--color-accent)" }}>{player.currentPoints} pts</span>
        </div>
      </div>
    </div>
  );
}
