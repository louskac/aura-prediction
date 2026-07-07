"use client";

import { useState, useTransition, useRef } from "react";
import { Trophy, Save, CheckCircle2, Lock, Check, X, AlertCircle } from "lucide-react";

interface Match {
  left: string;
  right: string;
  key: string;
}

interface DbFixture {
  fixtureId: number;
  startTime: number;
  competitionId: number;
  competition: string;
  fixtureGroupId: number | null;
  participant1: string;
  participant2: string;
  status: string;
  score1: number | null;
  score2: number | null;
}

interface BracketPredictorClientProps {
  initialPredictions: Record<string, string>;
  activeMatches: Match[];  // R32 matches
  r16Matches: Match[];     // R16 matches (derived from actual API fixture group data server-side)
  startStage: "R32" | "R16";
  submitAction: (formData: FormData) => Promise<void>;
  dbFixtures: DbFixture[];
}

const flagCodes: Record<string, string> = {
  "germany": "de", "switzerland": "ch", "spain": "es", "croatia": "hr",
  "argentina": "ar", "australia": "au", "netherlands": "nl", "usa": "us",
  "united states": "us", "england": "gb-eng", "senegal": "sn", "france": "fr",
  "poland": "pl", "brazil": "br", "south korea": "kr", "portugal": "pt",
  "morocco": "ma", "italy": "it", "austria": "at", "belgium": "be",
  "denmark": "dk", "uruguay": "uy", "ghana": "gh", "mexico": "mx",
  "canada": "ca", "japan": "jp", "sweden": "se", "colombia": "co",
  "ecuador": "ec", "chile": "cl", "nigeria": "ng", "ukraine": "ua",
  "wales": "gb-wls", "paraguay": "py", "cape verde": "cv", "algeria": "dz",
  "south africa": "za", "bosnia and herzegovina": "ba", "bosnia & herzegovina": "ba",
  "dr congo": "cd", "congo dr": "cd", "norway": "no", "egypt": "eg",
  "vietnam": "vn", "myanmar": "mm", "ivory coast": "ci"
};

function getFlagUrl(country: string): string {
  if (!country || country.toLowerCase() === "tbd" || country.toLowerCase() === "winner..." || country.toLowerCase() === "finalist..." || country.toLowerCase() === "awaiting winner") {
    return "";
  }
  const code = flagCodes[country.toLowerCase()] || "un";
  return `https://flagcdn.com/w80/${code}.png`;
}

export default function BracketPredictorClient({
  initialPredictions,
  activeMatches,
  r16Matches,
  startStage,
  submitAction,
  dbFixtures
}: BracketPredictorClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    teamName: string;
    stage: string;
    matchIdx: number;
    slot: "left" | "right";
  } | null>(null);

  const isR32 = startStage === "R32";
  const stagesOrder = ["R32", "R16", "QF", "SF", "Final", "Winner"];

  const radiusMap: Record<string, number> = {
    R32: 430,
    R16: 350,
    QF: 270,
    SF: 190,
    Final: 110,
    Winner: 0
  };

  // Helper to normalize country names for database lookup
  function normalizeName(name: string): string {
    const lower = name.toLowerCase().trim();
    if (lower === "united states" || lower === "usa") return "usa";
    if (lower === "dr congo" || lower === "congo dr" || lower === "dr. congo") return "dr congo";
    if (lower === "bosnia and herzegovina" || lower === "bosnia & herzegovina") return "bosnia";
    return lower;
  }

  // Find fixture details in local database matching two team names
  const findFixtureInDb = (teamA: string, teamB: string) => {
    if (!teamA || !teamB) return null;
    const normA = normalizeName(teamA);
    const normB = normalizeName(teamB);
    return dbFixtures.find(f => {
      const p1 = normalizeName(f.participant1);
      const p2 = normalizeName(f.participant2);
      return (p1 === normA && p2 === normB) || (p1 === normB && p2 === normA);
    });
  };

  // Resolve actual winner of a match using database outcomes
  const getActualWinner = (teamA: string, teamB: string): string | null => {
    const match = findFixtureInDb(teamA, teamB);
    if (!match || match.status !== "Finished") return null;
    const s1 = match.score1 ?? 0;
    const s2 = match.score2 ?? 0;
    return s1 > s2 ? match.participant1 : match.participant2;
  };

  // Recursive actual winner resolution for any round in the bracket tree
  const getActualWinnerForNode = (stage: string, matchIdx: number): string => {
    if (stage === "R32") {
      const fallback = activeMatches[matchIdx];
      return getActualWinner(fallback.left, fallback.right) || "";
    }
    
    // For R16, use the server-provided r16Matches (based on real API fixture groups)
    if (stage === "R16") {
      const r16 = r16Matches[matchIdx];
      if (!r16 || r16.left === "TBD" || r16.right === "TBD") return "";
      return getActualWinner(r16.left, r16.right) || "";
    }
    
    const prevStage = stagesOrder[stagesOrder.indexOf(stage) - 1];
    const leftActual = getActualWinnerForNode(prevStage, 2 * matchIdx);
    const rightActual = getActualWinnerForNode(prevStage, 2 * matchIdx + 1);
    
    if (!leftActual || !rightActual) return "";
    return getActualWinner(leftActual, rightActual) || "";
  };

  // Retrieve actual teams, scores, status and winner for a slot dynamically
  const getActualTeamsForMatch = (stage: string, matchIdx: number) => {
    if (stage === "Winner") {
      const finalLeft = getActualWinnerForNode("Final", 0);
      return {
        left: finalLeft,
        right: "",
        winner: finalLeft,
        status: finalLeft ? "Finished" : "NotStarted",
        score1: finalLeft ? 1 : 0,
        score2: 0
      };
    }

    if (stage === "R32") {
      const fallback = activeMatches[matchIdx];
      const match = findFixtureInDb(fallback.left, fallback.right);
      const winner = getActualWinner(fallback.left, fallback.right) || "";
      return {
        left: fallback.left,
        right: fallback.right,
        winner,
        status: match?.status || "NotStarted",
        score1: match?.score1 ?? 0,
        score2: match?.score2 ?? 0
      };
    }

    // For R16, use the authoritative server-provided r16Matches
    if (stage === "R16") {
      const r16 = r16Matches[matchIdx];
      const left = r16?.left || "TBD";
      const right = r16?.right || "TBD";
      const match = (left !== "TBD" && right !== "TBD") ? findFixtureInDb(left, right) : null;
      const winner = getActualWinner(left, right) || "";
      return {
        left,
        right,
        winner,
        status: match?.status || "NotStarted",
        score1: match?.score1 ?? 0,
        score2: match?.score2 ?? 0
      };
    }
    
    const prevStage = stagesOrder[stagesOrder.indexOf(stage) - 1];
    const left = getActualWinnerForNode(prevStage, 2 * matchIdx);
    const right = getActualWinnerForNode(prevStage, 2 * matchIdx + 1);
    const winner = (left && right) ? (getActualWinner(left, right) || "") : "";
    const match = (left && right) ? findFixtureInDb(left, right) : null;
    
    return {
      left,
      right,
      winner,
      status: match?.status || "NotStarted",
      score1: match?.score1 ?? 0,
      score2: match?.score2 ?? 0
    };
  };

  // Check if a match is finished in the database (prediction locked)
  const isMatchLocked = (stage: string, matchIdx: number): boolean => {
    const actual = getActualTeamsForMatch(stage, matchIdx);
    return actual.status === "Finished";
  };

  const getWinnerOfMatch = (stage: string, matchIdx: number, currentPredictions: Record<string, string>): string => {
    const actual = getActualTeamsForMatch(stage, matchIdx);
    if (actual.status === "Finished" && actual.winner) {
      return actual.winner;
    }
    const mKey = `${stage}_${matchIdx + 1}`;
    return currentPredictions[mKey] || "TBD";
  };

  // Helper to find valid teams for a match in a given stage based on previous stage selections
  const getValidTeamsForMatch = (stage: string, matchIdx: number, currentPredictions: Record<string, string>): { left: string; right: string } => {
    if (stage === startStage) {
      const match = activeMatches[matchIdx];
      return { left: match?.left || "", right: match?.right || "" };
    }

    if (stage === "Winner") {
      const finalWinner = currentPredictions["Final_1"] || "";
      return { left: finalWinner, right: "" };
    }

    const prevStage = stagesOrder[stagesOrder.indexOf(stage) - 1];
    const leftTeam = getWinnerOfMatch(prevStage, 2 * matchIdx, currentPredictions);
    const rightTeam = getWinnerOfMatch(prevStage, 2 * matchIdx + 1, currentPredictions);

    return { left: leftTeam, right: rightTeam };
  };

  // Sanitizer to discard invalid predictions stored in the database from old schemas or seeds
  const sanitizePredictions = (initial: Record<string, string>): Record<string, string> => {
    const clean: Record<string, string> = {};
    
    if (startStage === "R32") {
      for (let mIdx = 0; mIdx < 16; mIdx++) {
        const key = `R32_${mIdx + 1}`;
        const val = initial[key];
        if (val) {
          const match = activeMatches[mIdx];
          const normVal = normalizeName(val);
          const normLeft = normalizeName(match?.left || "");
          const normRight = normalizeName(match?.right || "");
          if (normVal === normLeft || normVal === normRight) {
            clean[key] = val;
          }
        }
      }
    } else {
      for (let mIdx = 0; mIdx < 8; mIdx++) {
        const key = `R16_${mIdx + 1}`;
        const val = initial[key];
        if (val) {
          const match = activeMatches[mIdx];
          const normVal = normalizeName(val);
          const normLeft = normalizeName(match?.left || "");
          const normRight = normalizeName(match?.right || "");
          if (normVal === normLeft || normVal === normRight) {
            clean[key] = val;
          }
        }
      }
    }

    const nextStages = stagesOrder.slice(stagesOrder.indexOf(startStage) + 1);
    for (const stage of nextStages) {
      const length = stage === "Winner" ? 1 : stage === "R16" ? 8 : stage === "QF" ? 4 : stage === "SF" ? 2 : 1;
      const keys = stage === "Winner" ? ["Winner_1"] : Array.from({ length }, (_, i) => `${stage}_${i + 1}`);
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const val = initial[key];
        if (val) {
          const valids = getValidTeamsForMatch(stage, i, clean);
          const normVal = normalizeName(val);
          const normLeft = normalizeName(valids.left);
          const normRight = normalizeName(valids.right);
          if (normVal && (normVal === normLeft || normVal === normRight)) {
            clean[key] = val;
          }
        }
      }
    }

    return clean;
  };

  const [predictions, setPredictions] = useState<Record<string, string>>(() => sanitizePredictions(initialPredictions));

  // Safe prediction updater that cleans up downstream predictions automatically
  const updatePrediction = (key: string, team: string) => {
    if (!team) return;
    
    let newPredictions = { ...predictions, [key]: team };

    // Set Winner_1 automatically if Final_1 is selected
    if (key === "Final_1") {
      newPredictions["Winner_1"] = team;
    }

    // Cascade validation downstream to clear invalid selections
    for (let sIdx = 1; sIdx < stagesOrder.length; sIdx++) {
      const stage = stagesOrder[sIdx];
      const length = stage === "Winner" ? 1 : stage === "R16" ? 8 : stage === "QF" ? 4 : stage === "SF" ? 2 : 1;
      
      for (let mIdx = 0; mIdx < length; mIdx++) {
        const mKey = stage === "Winner" ? "Winner_1" : `${stage}_${mIdx + 1}`;
        const selected = newPredictions[mKey];
        if (!selected) continue;

        const valids = getValidTeamsForMatch(stage, mIdx, newPredictions);
        if (selected !== valids.left && selected !== valids.right) {
          delete newPredictions[mKey];
        }
      }
    }

    setPredictions(newPredictions);
    setIsSaved(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(predictions).forEach(([key, val]) => {
      formData.append(key, val);
    });

    startTransition(async () => {
      await submitAction(formData);
      setIsSaved(true);
    });
  };

  // Polar coordinate translators (0 degrees is straight UP / 12 o'clock)
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  // Dynamic geometry nodes index calculator
  const getNodeInfo = (stage: string, matchIdx: number, slot: "left" | "right" | "mid") => {
    let angle = 0;
    if (stage === "R32") {
      angle = slot === "left" ? (2 * matchIdx * 11.25) : slot === "right" ? ((2 * matchIdx + 1) * 11.25) : ((2 * matchIdx + 0.5) * 11.25);
    } else if (stage === "R16") {
      angle = slot === "left" ? ((4 * matchIdx + 0.5) * 11.25) : slot === "right" ? ((4 * matchIdx + 2.5) * 11.25) : ((4 * matchIdx + 1.5) * 11.25);
    } else if (stage === "QF") {
      angle = slot === "left" ? ((8 * matchIdx + 1.5) * 11.25) : slot === "right" ? ((8 * matchIdx + 5.5) * 11.25) : ((8 * matchIdx + 3.5) * 11.25);
    } else if (stage === "SF") {
      angle = slot === "left" ? ((16 * matchIdx + 3.5) * 11.25) : slot === "right" ? ((16 * matchIdx + 11.5) * 11.25) : ((16 * matchIdx + 7.5) * 11.25);
    } else if (stage === "Final") {
      angle = slot === "left" ? (7.5 * 11.25) : slot === "right" ? (23.5 * 11.25) : (15.5 * 11.25);
    } else {
      angle = 15.5 * 11.25;
    }
    
    // Convergence meetings occur slightly inside child radii
    const radius = slot === "mid" ? (radiusMap[stage] - 30) : radiusMap[stage];
    return { angle, radius, coord: polarToCartesian(500, 500, radius, angle) };
  };

  // Base connection paths builder (elbow connectors with concentric arcs)
  const getConnectorPath = (stage: string, matchIdx: number) => {
    const leftInfo = getNodeInfo(stage, matchIdx, "left");
    const rightInfo = getNodeInfo(stage, matchIdx, "right");
    const midInfo = getNodeInfo(stage, matchIdx, "mid");
    
    const nextStage = stagesOrder[stagesOrder.indexOf(stage) + 1];
    const parentSlot = matchIdx % 2 === 0 ? "left" : "right";
    const parentInfo = getNodeInfo(nextStage, Math.floor(matchIdx / 2), parentSlot);

    const leftMeet = polarToCartesian(500, 500, midInfo.radius, leftInfo.angle);
    const rightMeet = polarToCartesian(500, 500, midInfo.radius, rightInfo.angle);
    const midMeet = polarToCartesian(500, 500, midInfo.radius, midInfo.angle);

    return `
      M ${leftInfo.coord.x} ${leftInfo.coord.y}
      L ${leftMeet.x} ${leftMeet.y}
      A ${midInfo.radius} ${midInfo.radius} 0 0 1 ${rightMeet.x} ${rightMeet.y}
      M ${rightInfo.coord.x} ${rightInfo.coord.y}
      L ${rightMeet.x} ${rightMeet.y}
      M ${midMeet.x} ${midMeet.y}
      L ${parentInfo.coord.x} ${parentInfo.coord.y}
    `;
  };

  // Highlight connector segment path builder
  const getHalfConnectorPath = (stage: string, matchIdx: number, side: "left" | "right") => {
    const leftInfo = getNodeInfo(stage, matchIdx, "left");
    const rightInfo = getNodeInfo(stage, matchIdx, "right");
    const midInfo = getNodeInfo(stage, matchIdx, "mid");
    
    const nextStage = stagesOrder[stagesOrder.indexOf(stage) + 1];
    const parentSlot = matchIdx % 2 === 0 ? "left" : "right";
    const parentInfo = getNodeInfo(nextStage, Math.floor(matchIdx / 2), parentSlot);

    const leftMeet = polarToCartesian(500, 500, midInfo.radius, leftInfo.angle);
    const rightMeet = polarToCartesian(500, 500, midInfo.radius, rightInfo.angle);
    const midMeet = polarToCartesian(500, 500, midInfo.radius, midInfo.angle);

    if (side === "left") {
      return `
        M ${leftInfo.coord.x} ${leftInfo.coord.y}
        L ${leftMeet.x} ${leftMeet.y}
        A ${midInfo.radius} ${midInfo.radius} 0 0 1 ${midMeet.x} ${midMeet.y}
        L ${parentInfo.coord.x} ${parentInfo.coord.y}
      `;
    } else {
      return `
        M ${rightInfo.coord.x} ${rightInfo.coord.y}
        L ${rightMeet.x} ${rightMeet.y}
        A ${midInfo.radius} ${midInfo.radius} 0 0 0 ${midMeet.x} ${midMeet.y}
        L ${parentInfo.coord.x} ${parentInfo.coord.y}
      `;
    }
  };

  // Color selection matching correctness (Green: Correct, Red: Incorrect, Blue: Pending prediction)
  const getPathStatusColor = (stage: string, matchIdx: number, selectedTeam: string) => {
    if (!selectedTeam) return "rgba(255, 255, 255, 0.08)";
    
    const actual = getActualTeamsForMatch(stage, matchIdx);
    if (actual.status === "Finished") {
      if (normalizeName(selectedTeam) === normalizeName(actual.winner)) {
        return "#10B981"; // Emerald green
      } else {
        return "#EF4444"; // Crimson red
      }
    }
    
    return "#3B82F6"; // Glowing blue
  };

  // Tooltip tracking mouse triggers
  const handleMouseEnter = (e: React.MouseEvent, stage: string, matchIdx: number, teamName: string, slot: "left" | "right") => {
    const parentRect = e.currentTarget.closest("form")?.getBoundingClientRect();
    if (parentRect) {
      const mouseX = e.clientX - parentRect.left;
      const mouseY = e.clientY - parentRect.top;
      
      const tooltipWidth = 280;
      const tooltipHeight = 160;

      let posX = mouseX + 15;
      if (posX + tooltipWidth > parentRect.width) {
        posX = mouseX - tooltipWidth - 15;
      }
      if (posX < 0) posX = 10;

      let posY = mouseY + 15;
      if (posY + tooltipHeight > parentRect.height) {
        posY = mouseY - tooltipHeight - 15;
      }
      if (posY < 0) posY = 10;

      setActiveTooltip({
        x: posX,
        y: posY,
        stage,
        matchIdx,
        teamName,
        slot
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const parentRect = e.currentTarget.closest("form")?.getBoundingClientRect();
    if (parentRect && activeTooltip) {
      const mouseX = e.clientX - parentRect.left;
      const mouseY = e.clientY - parentRect.top;
      
      const tooltipWidth = 280;
      const tooltipHeight = 160;

      let posX = mouseX + 15;
      if (posX + tooltipWidth > parentRect.width) {
        posX = mouseX - tooltipWidth - 15;
      }
      if (posX < 0) posX = 10;

      let posY = mouseY + 15;
      if (posY + tooltipHeight > parentRect.height) {
        posY = mouseY - tooltipHeight - 15;
      }
      if (posY < 0) posY = 10;

      setActiveTooltip(prev => prev ? {
        ...prev,
        x: posX,
        y: posY
      } : null);
    }
  };

  const handleMouseLeave = () => {
    setActiveTooltip(null);
  };

  // Circular flag badge renderer with dynamic border outlines matching correctness
  const renderBadge = (teamName: string, x: number, y: number, r: number, stage: string, matchIdx: number, slot: "left" | "right") => {
    const hasTeam = !!teamName && teamName !== "" && teamName.toLowerCase() !== "tbd" && teamName.toLowerCase() !== "awaiting winner" && teamName.toLowerCase() !== "winner..." && teamName.toLowerCase() !== "finalist...";
    const flagUrl = getFlagUrl(teamName);
    
    let strokeColor = "rgba(255, 255, 255, 0.15)";
    let isCorrect = false;
    let isIncorrect = false;
    let isPending = false;
    
    const mKey = stage === "Winner" ? "Winner_1" : `${stage}_${matchIdx + 1}`;
    
    if (hasTeam) {
      const actual = getActualTeamsForMatch(stage, matchIdx);
      if (actual.status === "Finished") {
        if (normalizeName(teamName) === normalizeName(actual.winner)) {
          strokeColor = "#10B981"; // Won the current match
          isCorrect = true;
        } else {
          strokeColor = "#EF4444"; // Lost the current match
          isIncorrect = true;
        }
      } else if (actual.status === "InPlay") {
        strokeColor = "#F59E0B";
        isPending = true;
      } else {
        // Current round match has not finished or started yet
        if (stage !== "R32") {
          const prevStage = stagesOrder[stagesOrder.indexOf(stage) - 1];
          const childMatchIdx = 2 * matchIdx + (slot === "right" ? 1 : 0);
          const childActual = getActualTeamsForMatch(prevStage, childMatchIdx);
          
          if (childActual.status === "Finished") {
            if (normalizeName(teamName) === normalizeName(childActual.winner)) {
              strokeColor = "#10B981"; // Correct qualification
              isCorrect = true;
            } else {
              strokeColor = "#EF4444"; // Incorrect qualification
              isIncorrect = true;
            }
          } else {
            strokeColor = "#3B82F6"; // Pending qualification path
            isPending = true;
          }
        } else {
          // Starting teams outer ring pending match
          strokeColor = "rgba(255, 255, 255, 0.15)";
        }
      }
    }

    const isLocked = isMatchLocked(stage, matchIdx);
    
    const w = r * 2.3;
    const h = r * 1.5;
    const skew = h * 0.15;

    return (
      <g
        className="badge-node"
        style={{ cursor: hasTeam && !isLocked ? "pointer" : "default" }}
        onClick={() => {
          if (hasTeam && !isLocked) {
            if (stage === "Winner") return;
            updatePrediction(mKey, teamName);
          }
        }}
        onMouseEnter={(e) => hasTeam && handleMouseEnter(e, stage, matchIdx, teamName, slot)}
        onMouseMove={(e) => hasTeam && handleMouseMove(e)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Glow halo outer parallelogram */}
        {hasTeam && (isCorrect || isIncorrect || isPending) && (
          <polygon
            points={`${x - w/2 - skew - 2},${y - h/2 - 1} ${x + w/2 - skew - 2},${y - h/2 - 1} ${x + w/2 + skew + 2},${y + h/2 + 1} ${x - w/2 + skew + 2},${y + h/2 + 1}`}
            fill="none"
            stroke={isCorrect ? "#10B981" : isIncorrect ? "#EF4444" : isPending ? "#3B82F6" : "none"}
            strokeWidth={2}
            opacity={0.5}
            style={{ filter: "blur(3px)" }}
          />
        )}
        
        {/* Base parallelogram background */}
        <polygon
          points={`${x - w/2 - skew},${y - h/2} ${x + w/2 - skew},${y - h/2} ${x + w/2 + skew},${y + h/2} ${x - w/2 + skew},${y + h/2}`}
          fill="#131B2E"
          stroke={strokeColor}
          strokeWidth={hasTeam ? 2 : 1}
          strokeDasharray={hasTeam ? "none" : "2, 2"}
          style={{ transition: "stroke 0.3s ease" }}
        />
        
        {hasTeam && flagUrl ? (
          <foreignObject x={x - w/2} y={y - h/2} width={w} height={h}>
            <div style={{
              width: "100%",
              height: "100%",
              clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none"
            }}>
              <img
                src={flagUrl}
                alt={teamName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />
            </div>
          </foreignObject>
        ) : (
          <text
            x={x}
            y={y + (h * 0.25)}
            textAnchor="middle"
            fill="rgba(255,255,255,0.2)"
            fontSize={h * 0.8}
            fontWeight={800}
          >
            ?
          </text>
        )}

        {/* Lock indicator */}
        {hasTeam && isLocked && (
          <g transform={`translate(${x - 6}, ${y + h/2 - 6})`}>
            <polygon points="0,0 12,0 15,12 3,12" fill="#1E293B" stroke="var(--border-light)" strokeWidth={1} />
            <g transform="translate(4, 3)">
              <Lock size={6} color="var(--color-text-muted)" />
            </g>
          </g>
        )}
      </g>
    );
  };

  // Custom hover tooltips compiler
  const renderTooltip = () => {
    if (!activeTooltip) return null;
    const { stage, matchIdx, teamName } = activeTooltip;
    const actual = getActualTeamsForMatch(stage, matchIdx);
    const predictedWinner = predictions[stage === "Winner" ? "Winner_1" : `${stage}_${matchIdx + 1}`] || "";

    const isWinner = stage === "Winner";
    const stageTitle = isWinner ? "Predicted Champion" : stage === "R32" ? "Round of 32" : stage === "R16" ? "Round of 16" : stage === "QF" ? "Quarter-Finals" : stage === "SF" ? "Semi-Finals" : "Finals";
    
    let accuracyText = "Pending Match Outcome";
    let accuracyColor = "var(--color-text-dim)";
    let AccuracyIcon = AlertCircle;

    if (actual.status === "Finished" && predictedWinner) {
      if (normalizeName(predictedWinner) === normalizeName(actual.winner)) {
        accuracyText = "Correct Prediction!";
        accuracyColor = "var(--color-success)";
        AccuracyIcon = Check;
      } else {
        accuracyText = "Incorrect Prediction";
        accuracyColor = "var(--color-danger)";
        AccuracyIcon = X;
      }
    }

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes tooltipAppear {
            from { opacity: 0; transform: scale(0.96) translateY(4px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}} />
        <div
          className="glass-panel"
          style={{
            position: "absolute",
            left: activeTooltip.x,
            top: activeTooltip.y,
            padding: "14px 18px",
            borderRadius: "0px",
            border: "1px solid var(--border-light)",
            borderLeft: `3px solid ${accuracyColor}`,
            background: "rgba(6, 10, 26, 0.94)",
            zIndex: 1000,
            pointerEvents: "none",
            minWidth: "270px",
            boxShadow: `0 0 25px ${
              accuracyColor === "var(--color-text-dim)" 
                ? "rgba(95, 59, 246, 0.15)" 
                : accuracyColor === "var(--color-success)" 
                ? "rgba(16, 185, 129, 0.3)" 
                : "rgba(255, 46, 116, 0.3)"
            }, 0 10px 30px -5px rgba(0, 0, 0, 0.65)`,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            backdropFilter: "blur(16px)",
            transformOrigin: "center left",
            animation: "tooltipAppear 0.12s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            transition: "left 0.12s cubic-bezier(0.25, 1, 0.5, 1), top 0.12s cubic-bezier(0.25, 1, 0.5, 1)"
          }}
        >
          <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--color-accent)", letterSpacing: "0.05em" }}>
            {stageTitle} {!isWinner && `#${matchIdx + 1}`}
          </div>
          
          {/* Match score details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700 }}>
              <span style={{ color: actual.left ? "var(--color-text-main)" : "var(--color-text-dim)" }}>{actual.left || "TBD"}</span>
              <span style={{ color: "var(--color-accent)", fontFamily: "var(--font-outfit)" }}>{actual.status === "NotStarted" ? "-" : actual.score1}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", fontWeight: 700 }}>
              <span style={{ color: actual.right ? "var(--color-text-main)" : "var(--color-text-dim)" }}>{actual.right || "TBD"}</span>
              <span style={{ color: "var(--color-accent)", fontFamily: "var(--font-outfit)" }}>{actual.status === "NotStarted" ? "-" : actual.score2}</span>
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ 
                width: "6px", 
                height: "6px", 
                borderRadius: "50%", 
                backgroundColor: actual.status === "Finished" ? "var(--color-success)" : actual.status === "InPlay" ? "var(--color-accent)" : "var(--color-text-dim)" 
              }}></span>
              Status: {actual.status === "Finished" ? "Finished" : actual.status === "InPlay" ? "Live" : "Scheduled"}
            </div>
          </div>

          {/* Prediction details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "11px", color: "var(--color-text-dim)" }}>
              Your Prediction: <strong style={{ color: "var(--color-text-main)", fontWeight: 700 }}>{predictedWinner || "None"}</strong>
            </div>
            {predictedWinner && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: accuracyColor, marginTop: "4px" }}>
                <AccuracyIcon size={12} />
                <span>{accuracyText}</span>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const champion = predictions["Winner_1"] || "";
  const champFlag = getFlagUrl(champion);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} ref={containerRef}>
      {/* Legend Map Header - Styled as skewed sharp CAD console toolbar */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: "16px 20px", 
          borderRadius: "0px", 
          borderLeft: "3px solid var(--color-accent)",
          transform: "skewX(-6deg)",
          boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.4)"
        }}
      >
        <div style={{ transform: "skewX(6deg)", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "13px", fontWeight: 900, color: "var(--color-text-main)", textTransform: "uppercase", fontFamily: "var(--font-outfit)" }}>
              Interactive Radial Bracket Layout
            </span>
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
              Click any flag badge to advance them inwards. Gold matches are locked.
            </span>
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "10px", fontWeight: 700, fontFamily: "monospace" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "9px", height: "9px", transform: "skewX(-12deg)", backgroundColor: "#22c55e", display: "inline-block" }}></span>
              <span style={{ color: "var(--color-success)" }}>CORRECT PREDICTION</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "9px", height: "9px", transform: "skewX(-12deg)", backgroundColor: "#EF4444", display: "inline-block" }}></span>
              <span style={{ color: "var(--color-danger)" }}>INCORRECT PREDICTION</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "9px", height: "9px", transform: "skewX(-12deg)", backgroundColor: "#3B82F6", display: "inline-block" }}></span>
              <span style={{ color: "#3B82F6" }}>ACTIVE / PENDING</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "9px", height: "9px", transform: "skewX(-12deg)", backgroundColor: "rgba(255,255,255,0.15)", display: "inline-block" }}></span>
              <span style={{ color: "var(--color-text-muted)" }}>UNSELECTED / EMPTY</span>
            </div>
          </div>
        </div>
      </div>

      {isSaved && (
        <div className="fade-in" style={{ 
          background: "rgba(16, 185, 129, 0.08)", 
          color: "var(--color-success)", 
          border: "1px solid rgba(16, 185, 129, 0.15)",
          borderLeft: "4px solid var(--color-success)",
          padding: "12px 18px",
          borderRadius: "0px",
          fontSize: "13px",
          fontWeight: 700,
          fontFamily: "monospace",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <CheckCircle2 size={16} />
          BRACKET PREDICTION SUCCESSFULLY LOCKED ON-CHAIN!
        </div>
      )}

      {/* Main radial bracket canvas */}
      <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center", position: "relative", width: "100%" }}>
        
        {/* Render Float Tooltip */}
        {renderTooltip()}

        <div className="glass-panel" style={{ 
          width: "100%", 
          maxWidth: "920px", 
          aspectRatio: "1/1",
          borderRadius: "0px",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          background: "rgba(10, 15, 30, 0.65)",
          padding: "10px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden"
        }}>
          <svg viewBox="0 0 1000 1000" width="100%" height="100%" style={{ maxHeight: "880px" }}>
            <defs>
              <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 1. Draw base connector lines first (bottom layer) */}
            <g className="bracket-base-lines">
              {stagesOrder.slice(0, -1).map((stage) => {
                const length = stage === "R32" ? 16 : stage === "R16" ? 8 : stage === "QF" ? 4 : stage === "SF" ? 2 : 1;
                return Array.from({ length }).map((_, mIdx) => (
                  <path
                    key={`base-${stage}-${mIdx}`}
                    d={getConnectorPath(stage, mIdx)}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeWidth={2}
                  />
                ));
              })}
            </g>

            {/* 2. Draw highlighted prediction connection segments (middle layer) */}
            <g className="bracket-highlight-lines">
              {stagesOrder.slice(0, -1).map((stage) => {
                const length = stage === "R32" ? 16 : stage === "R16" ? 8 : stage === "QF" ? 4 : stage === "SF" ? 2 : 1;
                return Array.from({ length }).map((_, mIdx) => {
                  const mKey = `${stage}_${mIdx + 1}`;
                  const valids = getValidTeamsForMatch(stage, mIdx, predictions);
                  const winner = predictions[mKey] || "";
                  
                  if (!winner) return null;
                  
                  const side = winner === valids.left ? "left" : "right";
                  const color = getPathStatusColor(stage, mIdx, winner);
                  const filterId = color === "#10B981" ? "url(#glow-green)" : color === "#EF4444" ? "url(#glow-red)" : "url(#glow-blue)";
                  
                  return (
                    <path
                      key={`highlight-${stage}-${mIdx}`}
                      d={getHalfConnectorPath(stage, mIdx, side)}
                      fill="none"
                      stroke={color}
                      strokeWidth={3.5}
                      filter={filterId}
                      strokeLinecap="round"
                    />
                  );
                });
              })}
            </g>

            {/* 3. Draw circular flag nodes (top layer) */}
            <g className="bracket-flag-nodes">
              {/* Round of 32 nodes */}
              {activeMatches.map((match, mIdx) => {
                const leftInfo = getNodeInfo("R32", mIdx, "left");
                const rightInfo = getNodeInfo("R32", mIdx, "right");
                return (
                  <g key={`r32-nodes-${mIdx}`}>
                    {renderBadge(match.left, leftInfo.coord.x, leftInfo.coord.y, 14.5, "R32", mIdx, "left")}
                    {renderBadge(match.right, rightInfo.coord.x, rightInfo.coord.y, 14.5, "R32", mIdx, "right")}
                  </g>
                );
              })}

              {/* Round of 16 nodes */}
              {Array.from({ length: 8 }).map((_, mIdx) => {
                const valids = getValidTeamsForMatch("R16", mIdx, predictions);
                const leftInfo = getNodeInfo("R16", mIdx, "left");
                const rightInfo = getNodeInfo("R16", mIdx, "right");
                return (
                  <g key={`r16-nodes-${mIdx}`}>
                    {renderBadge(valids.left, leftInfo.coord.x, leftInfo.coord.y, 16.5, "R16", mIdx, "left")}
                    {renderBadge(valids.right, rightInfo.coord.x, rightInfo.coord.y, 16.5, "R16", mIdx, "right")}
                  </g>
                );
              })}

              {/* Quarter-Final nodes */}
              {Array.from({ length: 4 }).map((_, mIdx) => {
                const valids = getValidTeamsForMatch("QF", mIdx, predictions);
                const leftInfo = getNodeInfo("QF", mIdx, "left");
                const rightInfo = getNodeInfo("QF", mIdx, "right");
                return (
                  <g key={`qf-nodes-${mIdx}`}>
                    {renderBadge(valids.left, leftInfo.coord.x, leftInfo.coord.y, 18.5, "QF", mIdx, "left")}
                    {renderBadge(valids.right, rightInfo.coord.x, rightInfo.coord.y, 18.5, "QF", mIdx, "right")}
                  </g>
                );
              })}

              {/* Semi-Final nodes */}
              {Array.from({ length: 2 }).map((_, mIdx) => {
                const valids = getValidTeamsForMatch("SF", mIdx, predictions);
                const leftInfo = getNodeInfo("SF", mIdx, "left");
                const rightInfo = getNodeInfo("SF", mIdx, "right");
                return (
                  <g key={`sf-nodes-${mIdx}`}>
                    {renderBadge(valids.left, leftInfo.coord.x, leftInfo.coord.y, 20.5, "SF", mIdx, "left")}
                    {renderBadge(valids.right, rightInfo.coord.x, rightInfo.coord.y, 20.5, "SF", mIdx, "right")}
                  </g>
                );
              })}

              {/* Final nodes */}
              {Array.from({ length: 1 }).map((_, mIdx) => {
                const valids = getValidTeamsForMatch("Final", mIdx, predictions);
                const leftInfo = getNodeInfo("Final", mIdx, "left");
                const rightInfo = getNodeInfo("Final", mIdx, "right");
                return (
                  <g key={`final-nodes-${mIdx}`}>
                    {renderBadge(valids.left, leftInfo.coord.x, leftInfo.coord.y, 22.5, "Final", mIdx, "left")}
                    {renderBadge(valids.right, rightInfo.coord.x, rightInfo.coord.y, 22.5, "Final", mIdx, "right")}
                  </g>
                );
              })}
            </g>

            {/* 4. Central Trophy & Winner Node */}
            <g className="bracket-champion-center">
              {/* Pulsing circular outer border ring */}
              {/* Pulsing slanted outer border ring */}
              <polygon
                points="435,465 535,465 565,535 465,535"
                fill="rgba(255, 215, 0, 0.02)"
                stroke={champion ? "#FFD700" : "rgba(255,255,255,0.08)"}
                strokeWidth={3}
                strokeDasharray={champion ? "none" : "3, 3"}
                style={{
                  filter: champion ? "drop-shadow(0 0 12px rgba(255, 215, 0, 0.4))" : "none"
                }}
              />
              
              {champion && champFlag ? (
                <g
                  style={{ cursor: isMatchLocked("Final", 0) ? "default" : "pointer" }}
                  onClick={() => {
                    if (!isMatchLocked("Final", 0)) {
                      updatePrediction("Winner_1", "");
                      updatePrediction("Final_1", "");
                    }
                  }}
                  onMouseEnter={(e) => handleMouseEnter(e, "Winner", 0, champion, "left")}
                  onMouseMove={(e) => handleMouseMove(e)}
                  onMouseLeave={handleMouseLeave}
                >
                  <foreignObject x={450} y={465} width={100} height={70}>
                    <div style={{
                      width: "100%",
                      height: "100%",
                      clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "none",
                      position: "relative"
                    }}>
                      <img
                        src={champFlag}
                        alt="Champion"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          opacity: 0.8
                        }}
                      />
                      <div style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.3)"
                      }} />
                    </div>
                  </foreignObject>
                  <g transform="translate(485, 483)">
                    <Trophy size={30} color="#FFD700" style={{ animation: "pulse 2s infinite" }} />
                  </g>
                </g>
              ) : (
                <g transform="translate(485, 483)">
                  <Trophy size={30} color="rgba(255,255,255,0.15)" />
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", width: "100%", justifyContent: "flex-end", maxWidth: "920px" }}>
          <button type="submit" className="btn-primary" disabled={isPending} style={{ minWidth: "180px" }}>
            <Save size={16} />
            {isPending ? "Saving..." : "Lock Predictions"}
          </button>
        </div>
      </form>
    </div>
  );
}
