"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ArrowLeft, Play, Pause, RotateCcw, HelpCircle, Activity, Award } from "lucide-react";
import type { 
  VisualEvent, 
  MomentumPoint, 
  MatchStats 
} from "@/services/visualizer-synthesizer";
import PlayerCard from "@/components/ui/PlayerCard";

const TEAM_FLAGS: Record<string, string> = {
  France: "fr",
  Senegal: "sn",
  Germany: "de",
  Paraguay: "py",
  Brazil: "br",
  Japan: "jp",
  "Ivory Coast": "ci",
  Norway: "no",
  Mexico: "mx",
  Ecuador: "ec",
  England: "gb",
  "Congo DR": "cd",
  Spain: "es",
  Belgium: "be",
  Portugal: "pt",
  Switzerland: "ch",
  Vietnam: "vn"
};

interface MatchDataPortraitClientProps {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
}

function arWeight(a: number, atk: number, rel: number): number {
  if (a < 0) return 0;
  const rise = atk > 0.02 ? (1 - Math.exp(-a / atk)) : 1;
  return rise * Math.exp(-a / rel);
}

const TEAM_COLORS: Record<string, string> = {
  France: "#387ef0",
  Senegal: "#0c954e",
  Germany: "#eeeeee",
  Paraguay: "#d00c0c",
  Brazil: "#e9c30c",
  Japan: "#08339c",
  "Ivory Coast": "#e87a0b",
  Norway: "#d00c0c",
  Mexico: "#0c704e",
  Ecuador: "#e9c30c",
  England: "#eeeeee",
  "Congo DR": "#0872e8",
  Portugal: "#d00c0c",
  Croatia: "#eeeeee",
  Spain: "#d00c0c",
  Austria: "#d00c0c",
  USA: "#0a26eb",
  "United States": "#0a26eb",
  "Bosnia & Herzegovina": "#055eb8",
  Belgium: "#d00c0c",
  Argentina: "#5eb8eb",
  "Cape Verde": "#0533eb",
  Switzerland: "#d00c0c",
  Algeria: "#0c954e",
  Colombia: "#e9c30c",
  Ghana: "#e9c30c",
  Sweden: "#e9c30c",
  Netherlands: "#e87a0b",
  Morocco: "#d00c0c",
  Canada: "#d00c0c",
  "South Africa": "#0c954e",
  Vietnam: "#d00c0c",
  Myanmar: "#d00c0c",
  Australia: "#e9c30c",
};

const SECONDARY_COLORS: Record<string, string> = {
  Belgium: "#85c8e2", // Light blue away kit (as seen in original design)
  Norway: "#08339c", // Dark blue (part of flag)
  Switzerland: "#ffffff", // White away kit
  Portugal: "#0c704e", // Green (part of flag)
  Canada: "#ffffff", // White
  Morocco: "#0c704e", // Green (part of flag)
  Austria: "#ffffff", // White
  Vietnam: "#e9c30c", // Yellow
  Myanmar: "#ffffff", // White
  Spain: "#ffffff", // White
};

function parseHexToRgb(hex: string) {
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return { r, g, b };
}

function getColorDistance(c1: string, c2: string): number {
  try {
    const rgb1 = parseHexToRgb(c1);
    const rgb2 = parseHexToRgb(c2);
    return Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );
  } catch (e) {
    return 0;
  }
}

// --- Value Noise and FBM functions for procedural terrain deformation ---
function hash2d(x: number, z: number) {
  const sinVal = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
  return sinVal - Math.floor(sinVal);
}

function valueNoise2d(x: number, z: number) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;

  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uz = fz * fz * (3.0 - 2.0 * fz);

  const a = hash2d(ix, iz);
  const b = hash2d(ix + 1, iz);
  const c = hash2d(ix, iz + 1);
  const d = hash2d(ix + 1, iz + 1);

  return (
    a * (1 - ux) * (1 - uz) +
    b * ux * (1 - uz) +
    c * (1 - ux) * uz +
    d * ux * uz
  );
}

function fbm2d(x: number, z: number, octaves = 3) {
  let value = 0.0;
  let amplitude = 0.5;
  let frequency = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise2d(x * frequency, z * frequency);
    x = x * 2.03 + 11.3;
    z = z * 2.03 + 7.7;
    amplitude *= 0.5;
  }
  return value;
}

function dangerFingerEnv(wsec: number): number {
  if (!(wsec >= 0)) return 0;
  if (wsec < 0.4) {
    const f = wsec / 0.4;
    return f * f * (3.0 - 2.0 * f);
  }
  const f = (wsec - 0.4) / 0.9;
  return f >= 1.0 ? 0.0 : (1.0 - f * f * (3.0 - 2.0 * f));
}

export default function MatchDataPortraitClient({
  fixtureId,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status
}: MatchDataPortraitClientProps) {
  const router = useRouter();
  
  // DOM element refs
  const mountRef = useRef<HTMLDivElement>(null);
  const seismographRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  
  // Three.js instances
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  // Visualizer meshes
  const homeGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const awayGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const homeWallGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const awayWallGeomRef = useRef<THREE.BufferGeometry | null>(null);
  
  // Lightning bolt refs
  const lightningLinesRef = useRef<THREE.LineSegments | null>(null);
  const lightningFlashRef = useRef<number>(0);
  
  // Particle system refs
  const particlesRef = useRef<THREE.Points | null>(null);
  const particlesGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const particleMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  
  // Visualizer states
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(60); // multiplier (1s = 1 minute)
  const [currentTime, setCurrentTime] = useState(0); 
  const [duration, setDuration] = useState(5400); // 90 mins in seconds
  const [momentumData, setMomentumData] = useState<MomentumPoint[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [activeXgLabel, setActiveXgLabel] = useState<{ text: string; x: number; y: number } | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [visualStyle, setVisualStyle] = useState<'cyber' | 'tactical' | 'glass'>('cyber');
  const visualStyleRef = useRef<'cyber' | 'tactical' | 'glass'>('cyber');
  useEffect(() => {
    visualStyleRef.current = visualStyle;
  }, [visualStyle]);
  
  interface GoalCardState {
    playerName: string;
    team: string;
    position: string;
    x: number;
    y: number;
    xg: number;
    isGoal: boolean;
    shirtNumber: number;
    teamColor: string;
    fotmobId?: number;
    minute: number;
  }
  const [activeGoalCard, setActiveGoalCard] = useState<GoalCardState | null>(null);

  // Dynamic telemetry states
  const [currentHomeScore, setCurrentHomeScore] = useState(0);
  const [currentAwayScore, setCurrentAwayScore] = useState(0);
  const [scoringTimeline, setScoringTimeline] = useState<VisualEvent[]>([]);
  
  // Dynamic stats
  const [dynamicStats, setDynamicStats] = useState({
    home: { shots: 0, corners: 0, xg: 0 },
    away: { shots: 0, corners: 0, xg: 0 }
  });

  // Playback control refs
  const isPlayingRef = useRef(true);
  const timeRef = useRef(0);
  const playbackSpeedRef = useRef(15);
  const visualEventsRef = useRef<VisualEvent[]>([]);
  const ballLocusRef = useRef<any[]>([]);
  const frontRef = useRef<Float32Array>(new Float32Array(48).fill(0.5));
  const smoothBallRef = useRef({ u: 0.5, v: 0.5 });
  const skyLeanEasedRef = useRef(0);
  
  const momentumDataRef = useRef<MomentumPoint[]>([]);
  const durationRef = useRef(5400);

  const visualTimeRef = useRef(0);
  const mouseRef = useRef(new THREE.Vector2(-9999, -9999));
  const hoveredEventRef = useRef<VisualEvent | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<VisualEvent | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    playerName: string;
    minute: number;
    xg: number;
    team: string;
    outcome: string;
    fotmobId?: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    momentumDataRef.current = momentumData;
  }, [momentumData]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const homePressRef = useRef(0);
  const awayPressRef = useRef(0);
  
  let homeColor = TEAM_COLORS[homeTeam] || "#387ef0";
  let awayColor = TEAM_COLORS[awayTeam] || "#f96";

  // Check color collision (same color or too close)
  if (homeColor === awayColor || getColorDistance(homeColor, awayColor) < 60.0) {
    // Override away team color with secondary if defined, otherwise fallback to light blue or white
    const altAway = SECONDARY_COLORS[awayTeam];
    if (altAway && getColorDistance(homeColor, altAway) >= 60.0) {
      awayColor = altAway;
    } else {
      // If we don't have a configured secondary color or it also collides, fallback based on home color brightness
      const homeRgb = parseHexToRgb(homeColor);
      const isHomeRedOrDark = homeRgb.r > 160 && homeRgb.g < 100;
      awayColor = isHomeRedOrDark ? "#85c8e2" : "#d00c0c"; // light blue or red fallback
    }
  }

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch match details and timeline
  useEffect(() => {
    setLoading(true);
    timeRef.current = 0;
    setCurrentTime(0);

    async function loadData() {
      try {
        const response = await fetch(`/api/scores/${fixtureId}?t=${Date.now()}`);
        const result = await response.json();
        
        if (result.success && result.timeline) {
          visualEventsRef.current = result.timeline;
          setMomentumData(result.momentum || []);
          setMatchStats(result.stats || null);
          
          // Build authentic ball path locus anchors
          const ONBALL_TYPES = new Set([
            'Pass', 'BallTouch', 'TakeOn', 'BallRecovery', 'Clearance', 'Dispossessed',
            'KeeperPickup', 'Save', 'CornerAwarded', 'ShieldBallOpp', 'Goal',
          ]);
          const onball = result.timeline.filter((it: any) => ONBALL_TYPES.has(it.type) || it.isTouch || it.kind === 'pass' || it.kind === 'shot');
          const anchors: any[] = [];
          for (let i = 0; i < onball.length; i++) {
            const p = onball[i];
            const next = onball[i + 1];
            const gap = next ? Math.max(0.1, next.t - p.t) : 1.2;
            anchors.push({ t: p.t, u: p.u, v: p.v, team: p.team });
            if (Number.isFinite(p.eu) && Number.isFinite(p.ev)) {
              anchors.push({ t: p.t + gap * 0.6, u: p.eu, v: p.ev, team: p.team });
            }
          }
          anchors.sort((a, b) => a.t - b.t);
          ballLocusRef.current = anchors;

          const maxSec = result.timeline.reduce((acc: number, e: VisualEvent) => Math.max(acc, e.t), 5400);
          setDuration(maxSec);
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load match visualization data:", err);
        setLoading(false);
      }
    }
    loadData();
  }, [fixtureId]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // Seismograph Timeline drawing logic with team-colored lobes and event markers
  useEffect(() => {
    if (loading || !seismographRef.current || momentumData.length === 0) return;
    
    const canvas = seismographRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const midY = height / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background guide lines (the horizontal middle baseline split)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
    
    // Half time separator
    const halfTimeX = (45 / 90) * width;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(halfTimeX, 0);
    ctx.lineTo(halfTimeX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    const hexToRgba = (hex: string, alpha: number) => {
      let c = hex.substring(1);
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // 1. Draw Home (Positive/Top) filled area
    ctx.beginPath();
    ctx.moveTo(0, midY);
    momentumData.forEach((pt) => {
      const x = (pt.minute / 90) * width;
      const yVal = midY - (pt.v * (height / 2 - 8));
      const y = Math.min(midY, yVal); // sit on baseline if Away leading
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width, midY);
    ctx.closePath();
    
    const homeGrad = ctx.createLinearGradient(0, 0, 0, midY);
    homeGrad.addColorStop(0, hexToRgba(homeColor, 0.24));
    homeGrad.addColorStop(1, hexToRgba(homeColor, 0.01));
    ctx.fillStyle = homeGrad;
    ctx.fill();

    // 2. Draw Away (Negative/Bottom) filled area
    ctx.beginPath();
    ctx.moveTo(0, midY);
    momentumData.forEach((pt) => {
      const x = (pt.minute / 90) * width;
      const yVal = midY - (pt.v * (height / 2 - 8));
      const y = Math.max(midY, yVal); // sit on baseline if Home leading
      ctx.lineTo(x, y);
    });
    ctx.lineTo(width, midY);
    ctx.closePath();
    
    const awayGrad = ctx.createLinearGradient(0, midY, 0, height);
    awayGrad.addColorStop(0, hexToRgba(awayColor, 0.01));
    awayGrad.addColorStop(1, hexToRgba(awayColor, 0.24));
    ctx.fillStyle = awayGrad;
    ctx.fill();

    // 3. Stroke the momentum curve segment-by-segment with dynamic team colors
    momentumData.forEach((pt, idx) => {
      if (idx === 0) return;
      const prevPt = momentumData[idx - 1];
      
      const x1 = (prevPt.minute / 90) * width;
      const y1 = midY - (prevPt.v * (height / 2 - 8));
      const x2 = (pt.minute / 90) * width;
      const y2 = midY - (pt.v * (height / 2 - 8));
      
      // Determine color based on average height of this segment relative to baseline
      const avgY = (y1 + y2) / 2;
      ctx.strokeStyle = avgY <= midY ? homeColor : awayColor;
      ctx.lineWidth = 2.5;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // 5. Render Event Markers (Goals, Cards, Shots)
    visualEventsRef.current.forEach(ev => {
      const min = ev.t / 60;
      const x = (min / 90) * width;
      
      const ptIdx = Math.max(0, Math.min(momentumData.length - 1, Math.floor(min)));
      const pt = momentumData[ptIdx];
      const yVal = pt ? midY - (pt.v * (height / 2 - 8)) : midY;

      if (ev.isGoal) {
        ctx.fillStyle = "#ffd166";
        ctx.beginPath();
        ctx.arc(x, yVal, 5.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (ev.kind === "shot" || ev.type === "shot") {
        ctx.fillStyle = ev.team === "home" ? hexToRgba(homeColor, 0.8) : hexToRgba(awayColor, 0.8);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(x, yVal, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (ev.type === "Card") {
        ctx.fillStyle = ev.outcome === "Red" ? "#ef4444" : "#ffd166";
        ctx.fillRect(x - 2, yVal - 4, 4, 8);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - 2, yVal - 4, 4, 8);
      }
    });
  }, [loading, momentumData, homeColor, awayColor]);

  // Seismograph drag scrubbing helper
  const handleScrub = (clientX: number) => {
    if (!seismographRef.current) return;
    const rect = seismographRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const progress = clickX / rect.width;
    const targetSeconds = Math.max(0, Math.min(durationRef.current, progress * durationRef.current));
    timeRef.current = targetSeconds;
    setCurrentTime(targetSeconds);
  };

  const handleSeismographMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    handleScrub(e.clientX);
  };

  const handleSeismographMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      handleScrub(e.clientX);
    }
  };

  const handleSeismographMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleSeismographTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    if (e.touches[0]) handleScrub(e.touches[0].clientX);
  };

  const handleSeismographTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current && e.touches[0]) {
      handleScrub(e.touches[0].clientX);
    }
  };

  // 3D Scene Setup
  useEffect(() => {
    if (loading || !mountRef.current) return;

    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 520;

    // WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err: any) {
      console.error("WebGL context creation failed:", err);
      setWebglError(err.message || "WebGL context creation failed");
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const handleCanvasMouseMove = (e: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleCanvasMouseLeave = () => {
      mouseRef.current.set(-9999, -9999);
    };

    const handleCanvasClick = () => {
      if (hoveredEventRef.current) {
        const ev = hoveredEventRef.current;
        timeRef.current = ev.t;
        setCurrentTime(ev.t);
        setIsPlaying(true);
      }
    };

    const canvasDom = renderer.domElement;
    canvasDom.addEventListener("mousemove", handleCanvasMouseMove);
    canvasDom.addEventListener("mouseleave", handleCanvasMouseLeave);
    canvasDom.addEventListener("click", handleCanvasClick);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060814, 0.010); // neutral background fog
    sceneRef.current = scene;

    // Dynamic gradient score-tinted sky (ambient leader lean)
    let skyCanvas: HTMLCanvasElement | null = null;
    let skyCtx: CanvasRenderingContext2D | null = null;
    let skyTex: THREE.CanvasTexture | null = null;

    skyCanvas = document.createElement("canvas");
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    skyCtx = skyCanvas.getContext("2d");
    skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    skyTex.wrapS = THREE.ClampToEdgeWrapping;
    skyTex.wrapT = THREE.ClampToEdgeWrapping;
    scene.background = skyTex;

    // Perspective Camera (original visual signature)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(-18, 12, 18);
    camera.lookAt(0, -0.4, 0);
    cameraRef.current = camera;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controls.maxPolarAngle = Math.PI * 0.48; // keep viewing angle above ground
    controls.target.set(0, -0.4, 0);
    controlsRef.current = controls;

    // Premium Lighting Design
    const ambientLight = new THREE.AmbientLight(0x768ad1, 0.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x485fa6, 0x1b1c30, 0.7);
    scene.add(hemiLight);

    // Dynamic key light casting soft shadow maps
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.8);
    dirLight.position.set(-12, 18, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 45;
    const sCam = dirLight.shadow.camera;
    sCam.left = -12; sCam.right = 12; sCam.top = 8; sCam.bottom = -8;
    sCam.updateProjectionMatrix();
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    // Spires light source (a subtle spot light focusing on the pitch center)
    const centerSpot = new THREE.SpotLight(0xabc4ff, 1.5, 30, Math.PI * 0.25, 0.5, 1);
    centerSpot.position.set(0, 15, 0);
    scene.add(centerSpot);

    // Dynamic Cyber Particle System (Data Dust Stadium Canopy)
    const particleCount = 600;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let p = 0; p < particleCount; p++) {
      // Cylindrical coordinates to form a stadium dome shell
      const radius = 13 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const y = -1 + Math.random() * 15;
      
      positions[p * 3] = radius * Math.cos(theta);
      positions[p * 3 + 1] = y;
      positions[p * 3 + 2] = radius * Math.sin(theta);
      
      // Default color: subtle muted blue data glow
      colors[p * 3] = 0.18;
      colors[p * 3 + 1] = 0.25;
      colors[p * 3 + 2] = 0.45;
    }
    
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.40,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
    
    particlesRef.current = particleSystem;
    particlesGeomRef.current = particleGeometry;
    particleMaterialRef.current = particleMaterial;

    // --- Ground Grid (The Solid Slab) ---
    const WORLD_X = 16;
    const WORLD_Z = 9.6;
    const SLAB_THICK = 0.15; // premium thin slab
    
    const GX = 120;
    const GY = 72;
    const VX = GX + 1;
    const VY = GY + 1;
    const NV = VX * VY;

    // Smoothed possession top-sheet tracker closure variable
    let seamTopHomeVal = 1.0;

    // DataTextures and low-res grid arrays
    const hDataHome = new Float32Array(NV);
    const aDataHome = new Float32Array(NV);
    const cDataHome = new Float32Array(NV);
    const hTexHome = new THREE.DataTexture(hDataHome, VX, VY, THREE.RedFormat, THREE.FloatType);
    hTexHome.magFilter = THREE.LinearFilter; hTexHome.minFilter = THREE.LinearFilter; hTexHome.needsUpdate = true;
    const aTexHome = new THREE.DataTexture(aDataHome, VX, VY, THREE.RedFormat, THREE.FloatType);
    aTexHome.magFilter = THREE.LinearFilter; aTexHome.minFilter = THREE.LinearFilter; aTexHome.needsUpdate = true;
    const cTexHome = new THREE.DataTexture(cDataHome, VX, VY, THREE.RedFormat, THREE.FloatType);
    cTexHome.magFilter = THREE.LinearFilter; cTexHome.minFilter = THREE.LinearFilter; cTexHome.needsUpdate = true;

    const hDataAway = new Float32Array(NV);
    const aDataAway = new Float32Array(NV);
    const cDataAway = new Float32Array(NV);
    const hTexAway = new THREE.DataTexture(hDataAway, VX, VY, THREE.RedFormat, THREE.FloatType);
    hTexAway.magFilter = THREE.LinearFilter; hTexAway.minFilter = THREE.LinearFilter; hTexAway.needsUpdate = true;
    const aTexAway = new THREE.DataTexture(aDataAway, VX, VY, THREE.RedFormat, THREE.FloatType);
    aTexAway.magFilter = THREE.LinearFilter; aTexAway.minFilter = THREE.LinearFilter; aTexAway.needsUpdate = true;
    const cTexAway = new THREE.DataTexture(cDataAway, VX, VY, THREE.RedFormat, THREE.FloatType);
    cTexAway.magFilter = THREE.LinearFilter; cTexAway.minFilter = THREE.LinearFilter; cTexAway.needsUpdate = true;

    // Geometries
    const homeGeom = new THREE.PlaneGeometry(WORLD_X, WORLD_Z, GX, GY);
    homeGeom.rotateX(-Math.PI / 2);
    homeGeomRef.current = homeGeom;

    const awayGeom = new THREE.PlaneGeometry(WORLD_X, WORLD_Z, GX, GY);
    awayGeom.rotateX(-Math.PI / 2);
    awayGeomRef.current = awayGeom;

    // Create static procedural pitch markings ShaderMaterial (original SDF style)
    const pitchMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      uniforms: {
        uLines: { value: 0.65 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float uLines;
        varying vec2 vUv;
        const float PL = 105.0;
        const float PW = 68.0;
        
        float seg7(vec2 puv, vec2 a, vec2 b, float halfW){
          vec2 P = vec2(puv.x*PL, puv.y*PW);
          vec2 ab = b-a, ap = P-a;
          float t = clamp(dot(ap,ab)/max(dot(ab,ab),1e-5),0.0,1.0);
          float d = length(P-(a+t*ab));
          float aa = (fwidth(P.x)+fwidth(P.y))*0.5+1e-4;
          return 1.0 - smoothstep(halfW, halfW+aa, d);
        }
        
        float rect7(vec2 puv, vec2 lo, vec2 hi, float halfW){
          float c=0.0;
          c=max(c,seg7(puv,vec2(lo.x,lo.y),vec2(hi.x,lo.y),halfW));
          c=max(c,seg7(puv,vec2(hi.x,lo.y),vec2(hi.x,hi.y),halfW));
          c=max(c,seg7(puv,vec2(hi.x,hi.y),vec2(lo.x,hi.y),halfW));
          c=max(c,seg7(puv,vec2(lo.x,hi.y),vec2(lo.x,lo.y),halfW));
          return c;
        }
        
        float ring7(vec2 puv, vec2 cen, float r, float halfW){
          vec2 P = vec2(puv.x*PL, puv.y*PW);
          float d = abs(length(P-cen)-r);
          float aa = (fwidth(P.x)+fwidth(P.y))*0.5+1e-4;
          return 1.0 - smoothstep(halfW, halfW+aa, d);
        }
        
        float dot7(vec2 puv, vec2 cen, float r){
          vec2 P = vec2(puv.x*PL, puv.y*PW);
          float d = length(P-cen);
          float aa = (fwidth(P.x)+fwidth(P.y))*0.5+1e-4;
          return 1.0 - smoothstep(r, r+aa, d);
        }
        
        float pitchLines7(vec2 uv){
          float hw=0.10;
          float inset=1.6;
          vec2 lo=vec2(inset,inset);
          vec2 hi=vec2(PL-inset,PW-inset);
          float c=0.0;
          c=max(c,rect7(uv,lo,hi,hw));
          c=max(c,seg7(uv,vec2(PL*0.5,lo.y),vec2(PL*0.5,hi.y),hw));
          c=max(c,ring7(uv,vec2(PL*0.5,PW*0.5),9.15,hw));
          c=max(c,dot7(uv,vec2(PL*0.5,PW*0.5),0.35));
          for(int s=0;s<2;s++){
            float dir=(s==0)?1.0:-1.0;
            float gx=(s==0)?inset:PL-inset;
            float pax=gx+dir*16.5;
            c=max(c,rect7(uv,vec2(min(gx,pax),PW*0.5-20.16),vec2(max(gx,pax),PW*0.5+20.16),hw));
            float gax=gx+dir*5.5;
            c=max(c,rect7(uv,vec2(min(gx,gax),PW*0.5-9.16),vec2(max(gx,gax),PW*0.5+9.16),hw));
            vec2 pSpot=vec2(gx+dir*11.0,PW*0.5);
            c=max(c,dot7(uv,pSpot,0.35));
            float arc=ring7(uv,pSpot,9.15,hw);
            vec2 P=vec2(uv.x*PL,uv.y*PW);
            float outside=(dir>0.0)?step(pax,P.x):step(P.x,pax);
            c=max(c,arc*outside);
          }
          return clamp(c,0.0,1.0);
        }
        
        void main(){
          float lines = pitchLines7(vUv) * clamp(uLines,0.0,1.0);
          if (lines < 0.02) discard;
          vec3 lineCol = vec3(0.92,0.94,0.97);
          gl_FragColor = vec4(lineCol, lines);
        }
      `
    });



    // Extract all shots to populate uniforms
    const shotsList = visualEventsRef.current.filter(ev => ev.kind === "shot" || ev.type === "shot" || ev.isGoal);
    const count = Math.min(40, shotsList.length);

    const uniformShotsPos = Array.from({ length: 40 }, (_, idx) => {
      const ev = shotsList[idx];
      return ev ? new THREE.Vector2(ev.u, ev.v) : new THREE.Vector2();
    });

    const uniformShotsData = Array.from({ length: 40 }, (_, idx) => {
      const ev = shotsList[idx];
      return ev ? new THREE.Vector3(ev.xg || 0.1, ev.isGoal ? 1.0 : 0.0, ev.team === "home" ? 1.0 : 2.0) : new THREE.Vector3();
    });

    const uniformShotsTime = new Float32Array(40);
    for (let k = 0; k < count; k++) {
      uniformShotsTime[k] = shotsList[k].t;
    }

    // Uniform objects for Home and Away blankets
    const homeUniforms = {
      uHeight: { value: hTexHome },
      uCov: { value: aTexHome },
      uTexel: { value: new THREE.Vector2(1 / VX, 1 / VY) },
      uBaseline: { value: 0.18 },
      uWorld: { value: new THREE.Vector2(WORLD_X, WORLD_Z) },
      uLap: { value: 0.06 },
      uLipH: { value: 0.10 },
      uTop: { value: 1.0 },
      uAway: { value: 0.0 },
      uTeam: { value: new THREE.Color(homeColor) },
      uClay: { value: new THREE.Color('#6a6560') },
      uSat: { value: 0.86 },
      uTint: { value: 1.0 },
      uTex: { value: 0.15 }, // smooth, subtle marble texture
      uGlowCol: { value: new THREE.Color('#f0d8c1') },
      uEmber: { value: 1.0 },
      uIntensity: { value: 0 },
      uDetail: { value: 0.58 }, // high-contrast procedural carbon dot-mesh grid
      uDetailScale: { value: 2.58 },
      uPattern: { value: 4.0 },
      uTime: { value: 0 },
      uGlow: { value: 1.0 },
      uFlood: { value: 0.0 },
      uFloodTeam: { value: new THREE.Color(homeColor) },
      uFloodFade: { value: 0.0 },
      uCorner: { value: cTexHome },
      uCornerCol: { value: new THREE.Color(homeColor) },

      // Persistent shot markers uniforms
      uShotsPos: { value: uniformShotsPos },
      uShotsData: { value: uniformShotsData },
      uShotsTime: { value: uniformShotsTime },
      uShotsCount: { value: count },
      uCurrentTime: { value: 0 },
      uHomeColor: { value: new THREE.Color(homeColor) },
      uAwayColor: { value: new THREE.Color(awayColor) },
      uHoveredShotIdx: { value: -1 },
      uStyleMode: { value: 0.0 }
    };

    const awayUniforms = {
      uHeight: { value: hTexAway },
      uCov: { value: aTexAway },
      uTexel: { value: new THREE.Vector2(1 / VX, 1 / VY) },
      uBaseline: { value: 0.18 },
      uWorld: { value: new THREE.Vector2(WORLD_X, WORLD_Z) },
      uLap: { value: 0.06 },
      uLipH: { value: 0.10 },
      uTop: { value: 0.0 },
      uAway: { value: 1.0 },
      uTeam: { value: new THREE.Color(awayColor) },
      uClay: { value: new THREE.Color('#6a6560') },
      uSat: { value: 0.86 },
      uTint: { value: 1.0 },
      uTex: { value: 0.15 }, // smooth, subtle marble texture
      uGlowCol: { value: new THREE.Color('#f0d8c1') },
      uEmber: { value: 1.0 },
      uIntensity: { value: 0 },
      uDetail: { value: 0.58 }, // high-contrast procedural carbon dot-mesh grid
      uDetailScale: { value: 2.58 },
      uPattern: { value: 4.0 },
      uTime: { value: 0 },
      uGlow: { value: 1.0 },
      uFlood: { value: 0.0 },
      uFloodTeam: { value: new THREE.Color(awayColor) },
      uFloodFade: { value: 0.0 },
      uCorner: { value: cTexAway },
      uCornerCol: { value: new THREE.Color(awayColor) },

      // Persistent shot markers uniforms
      uShotsPos: { value: uniformShotsPos },
      uShotsData: { value: uniformShotsData },
      uShotsTime: { value: uniformShotsTime },
      uShotsCount: { value: count },
      uCurrentTime: { value: 0 },
      uHomeColor: { value: new THREE.Color(homeColor) },
      uAwayColor: { value: new THREE.Color(awayColor) },
      uHoveredShotIdx: { value: -1 },
      uStyleMode: { value: 0.0 }
    };

    // Custom material compile for blankets
    const customMatCompile = (uniformsObject: any) => (shader: any) => {
      Object.assign(shader.uniforms, uniformsObject);

      shader.vertexShader = `
        uniform sampler2D uHeight; uniform sampler2D uCov; uniform vec2 uTexel;
        uniform float uBaseline; uniform vec2 uWorld;
        uniform float uLap; uniform float uLipH; uniform float uTop; uniform float uAway;
        varying float vHd; varying vec2 vUvN; varying float vDu; varying float vFold;
        
        float HB(vec2 uv){ float h = texture2D(uHeight, uv).r; if (!(h==h)) h=0.0; return h; }
        float FRONT(vec2 uv){ float f = texture2D(uCov, uv).r; if (!(f==f)) f=0.5; return f; }
        
        float FOLD(float du){
          float s = mix(-du, du, uAway);
          float fw = max(uLap * 0.6, 0.001);
          float ow = max(uLap * 0.4, 0.001);
          float own = 1.0 - smoothstep(0.0, fw, s);
          float opp = smoothstep(-ow, 0.0, s);
          return clamp(min(own, opp + step(0.0, s)), 0.0, 1.0);
        }
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
          vUvN = uv;
          float hl = HB(uv - vec2(uTexel.x,0.0)); float hr = HB(uv + vec2(uTexel.x,0.0));
          float hd = HB(uv - vec2(0.0,uTexel.y)); float hu = HB(uv + vec2(0.0,uTexel.y));
          float dx = (uWorld.x*uTexel.x)*2.0; float dz = (uWorld.y*uTexel.y)*2.0;
          objectNormal = normalize(vec3(-(hr-hl)/max(dx,1e-4), 1.0, -(hu-hd)/max(dz,1e-4)));`);

      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
          vUvN = uv;
          float hb = HB(uv);
          float frnt = FRONT(uv);
          vDu = uv.x - frnt;
          vHd = hb;
          vFold = uTop * FOLD(vDu);
          transformed.y += (hb - uBaseline) + uLipH * vFold;`);

      shader.fragmentShader = `
        uniform sampler2D uHeight; uniform sampler2D uCov; uniform vec2 uTexel;
        uniform vec3 uTeam; uniform float uGlow;
        uniform float uFlood; uniform vec3 uFloodTeam;
        uniform float uFloodFade;
        uniform float uLap; uniform float uAway; uniform float uTop;
        uniform vec3 uClay; uniform float uSat; uniform float uTint; uniform float uTex;
        uniform vec3 uGlowCol; uniform float uEmber; uniform float uIntensity;
        uniform float uDetail; uniform float uDetailScale; uniform float uPattern;
        uniform float uTime;
        uniform sampler2D uCorner; uniform vec3 uCornerCol;
        
        uniform vec2 uWorld;
        uniform vec2 uShotsPos[40];
        uniform vec3 uShotsData[40];
        uniform float uShotsTime[40];
        uniform int uShotsCount;
        uniform float uCurrentTime;
        uniform vec3 uHomeColor;
        uniform vec3 uAwayColor;
        uniform int uHoveredShotIdx;
        uniform float uStyleMode;
        
        varying float vHd; varying vec2 vUvN; varying float vDu; varying float vFold;

        float h21_s10(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float vn_s10(vec2 p){
          vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          float a=h21_s10(i), b=h21_s10(i+vec2(1,0)), c=h21_s10(i+vec2(0,1)), d=h21_s10(i+vec2(1,1));
          return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
        }
        float fbm_s10(vec2 p){
          float s=0.0, a=0.5;
          for (int k=0;k<4;k++){ s += a*vn_s10(p); p = p*2.03 + vec2(11.3,7.7); a *= 0.5; }
          return s;
        }

        float pat_s10(vec2 p){
          float a = sin(p.x*6.2831853);
          float b = sin((p.x*0.5 + p.y*0.8660254)*6.2831853);
          float c = sin((p.x*0.5 - p.y*0.8660254)*6.2831853);
          return clamp(0.5 + 0.22*(a+b+c), 0.0, 1.0);
        }

        const float PL = 105.0;
        const float PW = 68.0;

        float seg7(vec2 puv, vec2 a, vec2 b, float halfW){
          vec2 P = vec2(puv.x*PL, puv.y*PW);
          vec2 ab = b-a, ap = P-a;
          float t = clamp(dot(ap,ab)/max(dot(ab,ab),1e-5),0.0,1.0);
          float d = length(P-(a+t*ab));
          float aa = (fwidth(P.x)+fwidth(P.y))*0.5+1e-4;
          return 1.0 - smoothstep(halfW, halfW+aa, d);
        }

        float rect7(vec2 puv, vec2 lo, vec2 hi, float halfW){
          float c=0.0;
          c=max(c,seg7(puv,vec2(lo.x,lo.y),vec2(hi.x,lo.y),halfW));
          c=max(c,seg7(puv,vec2(hi.x,lo.y),vec2(hi.x,hi.y),halfW));
          c=max(c,seg7(puv,vec2(hi.x,hi.y),vec2(lo.x,hi.y),halfW));
          c=max(c,seg7(puv,vec2(lo.x,hi.y),vec2(lo.x,lo.y),halfW));
          return c;
        }

        float ring7(vec2 puv, vec2 cen, float r, float halfW){
          vec2 P = vec2(puv.x*PL, puv.y*PW);
          float d = abs(length(P-cen)-r);
          float aa = (fwidth(P.x)+fwidth(P.y))*0.5+1e-4;
          return 1.0 - smoothstep(halfW, halfW+aa, d);
        }

        float dot7(vec2 puv, vec2 cen, float r){
          vec2 P = vec2(puv.x*PL, puv.y*PW);
          float d = length(P-cen);
          float aa = (fwidth(P.x)+fwidth(P.y))*0.5+1e-4;
          return 1.0 - smoothstep(r, r+aa, d);
        }

        float pitchLines7(vec2 uv){
          float hw=0.12;
          float inset=1.6;
          vec2 lo=vec2(inset,inset);
          vec2 hi=vec2(PL-inset,PW-inset);
          float c=0.0;
          c=max(c,rect7(uv,lo,hi,hw));
          c=max(c,seg7(uv,vec2(PL*0.5,lo.y),vec2(PL*0.5,hi.y),hw));
          c=max(c,ring7(uv,vec2(PL*0.5,PW*0.5),9.15,hw));
          c=max(c,dot7(uv,vec2(PL*0.5,PW*0.5),0.35));
          for(int s=0;s<2;s++){
            float dir=(s==0)?1.0:-1.0;
            float gx=(s==0)?inset:PL-inset;
            float pax=gx+dir*16.5;
            c=max(c,rect7(uv,vec2(min(gx,pax),PW*0.5-20.16),vec2(max(gx,pax),PW*0.5+20.16),hw));
            float gax=gx+dir*5.5;
            c=max(c,rect7(uv,vec2(min(gx,gax),PW*0.5-9.16),vec2(max(gx,gax),PW*0.5+9.16),hw));
            vec2 pSpot=vec2(gx+dir*11.0,PW*0.5);
            c=max(c,dot7(uv,pSpot,0.35));
            float arc=ring7(uv,pSpot,9.15,hw);
            vec2 P=vec2(uv.x*PL,uv.y*PW);
            float outside=(dir>0.0)?step(pax,P.x):step(P.x,pax);
            c=max(c,arc*outside);
          }
          return clamp(c,0.0,1.0);
        }

        float covAt(){
          float lap = uLap * (1.0 - clamp(uFloodFade, 0.0, 1.0));
          float d = mix(lap - vDu, vDu + lap, uAway);
          float aa = clamp(fwidth(vDu), 1e-4, 0.01);
          return clamp(smoothstep(-aa, aa, d), 0.0, 1.0);
        }
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
        `#include <color_fragment>
        {
          vec3 team = uTeam;
          float lum = dot(team, vec3(0.299, 0.587, 0.114));
          team = max(mix(vec3(lum), team, uSat), 0.0);
          float tintAmt = clamp(uTint, 0.0, 1.0);
          vec3 col = mix(uClay, team, tintAmt);
          
          float marble = fbm_s10(vUvN * 22.0 + vec2(0.0, uTime * 0.05));
          col *= (1.0 - 0.5 * uTex) + uTex * marble;
          
          float pc = pat_s10(vUvN * (46.0 * uDetailScale));
          float cavity = 1.0 - uDetail * 0.5 * (1.0 - pc);
          col *= clamp(cavity, 0.3, 1.0);
          
          float dist = abs(vDu);
          float band = 1.0 - smoothstep(0.0, max(uLap*1.6, 0.04), dist);
          float shadow = (1.0 - uTop) * band;
          col *= mix(1.0, 0.40, shadow);
                    // Draw the pitch white lines directly on the blankets' surface
          float linesVal = pitchLines7(vUvN) * 0.70;
          col = mix(col, vec3(0.92, 0.94, 0.97), linesVal);

          col = mix(col, uFloodTeam, clamp(uFlood, 0.0, 1.0));
          
          float cw = clamp(texture2D(uCorner, vUvN).r, 0.0, 1.0);
          if (cw > 0.001) col = mix(col, uCornerCol, cw);
          // 1. Spire color bleeding:
          // Blend the base blanket color towards the shooting team's color near active spires
          for (int k = 0; k < 40; k++) {
            if (k >= uShotsCount) break;
            
            float shotTime = uShotsTime[k];
            float age = uCurrentTime - shotTime;
            if (age >= 0.0) {
              float isGoalVal = uShotsData[k].y;
              float rel = (isGoalVal > 0.5) ? 45.0 : 15.0;
              float pFactor = (isGoalVal > 0.5) ? 0.45 : 0.30;
              float envelope = (1.0 - exp(-age / 6.0)) * (pFactor + (1.0 - pFactor) * exp(-age / rel));
              
              if (envelope > 0.005) {
                vec2 shotW = uShotsPos[k] * uWorld;
                vec2 pixelW = vUvN * uWorld;
                float dWorld = distance(pixelW, shotW);
                
                float xg = uShotsData[k].x;
                float radiusSq = (isGoalVal > 0.5) ? 8.5 : (3.2 + xg * 5.0);
                
                // Color influence blends out from the center of the spire
                float colorInfluence = envelope * exp(-dWorld * dWorld / (radiusSq * 1.5));
                if (colorInfluence > 0.01) {
                  float shotTeam = uShotsData[k].z;
                  vec3 shotColor = (shotTeam < 1.5) ? uHomeColor : uAwayColor;
                  
                  // Blend the team color into the current color
                  col = mix(col, shotColor, clamp(colorInfluence, 0.0, 1.0));
                }
              }
            }
          }

          // 2. Draw persistent shot markers
          vec3 markerCol = vec3(0.0);
          float markerAlpha = 0.0;
          
          for (int k = 0; k < 40; k++) {
            if (k >= uShotsCount) break;
            
            vec2 shotW = uShotsPos[k] * uWorld;
            vec2 pixelW = vUvN * uWorld;
            float dWorld = distance(pixelW, shotW);
            
            float xg = uShotsData[k].x;
            bool isGoal = uShotsData[k].y > 0.5;
            float shotTeam = uShotsData[k].z;
            float shotTime = uShotsTime[k];
            float age = uCurrentTime - shotTime;
            
            // Substantially larger radii for visibility
            float rOuter = 0.38 + clamp(xg * 0.25, 0.0, 0.35);
            float rInner = 0.12 + clamp(xg * 0.10, 0.0, 0.12);
            
            bool isHovered = (k == uHoveredShotIdx);
            if (isHovered) {
              rOuter *= 1.4;
              rInner *= 1.2;
            }
            
            if (dWorld < rOuter) {
              float opacity = 0.90;
              vec3 colMark = vec3(0.9);
              if (uStyleMode > 0.5 && uStyleMode < 1.5) {
                // Tactical mode: very subtle dark ink stamps
                opacity = 0.25;
                colMark = vec3(0.08, 0.10, 0.15);
              } else {
                if (shotTeam < 1.5) {
                  // Home (blue)
                  colMark = mix(vec3(0.15, 0.55, 1.0), vec3(1.0), 0.2);
                } else {
                  // Away (red)
                  colMark = mix(vec3(1.0, 0.2, 0.2), vec3(1.0), 0.2);
                }
                if (isGoal) {
                  colMark = vec3(1.0, 0.82, 0.10); // gold
                }
              }
              
              if (isHovered) {
                colMark = mix(colMark, vec3(1.0), 0.5);
              }
              
              if (age < 0.0) {
                // Future shot: faint ring
                opacity = 0.35;
                float ringWidth = 0.04;
                float dRing = abs(dWorld - rOuter + ringWidth);
                if (dRing < ringWidth) {
                  markerCol = colMark;
                  markerAlpha = max(markerAlpha, opacity * (1.0 - dRing/ringWidth));
                }
              } else {
                // Past/current shot
                if (age < 6.0) {
                  // Active/Pulsing highlight
                  float pulse = 1.0 + 0.35 * sin(uTime * 12.0);
                  opacity = 1.0;
                  if (dWorld < rOuter * pulse) {
                    float edge = smoothstep(rOuter * pulse, rOuter * pulse - 0.05, dWorld);
                    markerCol = mix(colMark, vec3(1.0), 0.45);
                    markerAlpha = max(markerAlpha, opacity * edge);
                  }
                } else {
                  if (isHovered) {
                    // Solid center dot
                    if (dWorld < rInner) {
                      markerCol = colMark;
                      markerAlpha = max(markerAlpha, 1.0);
                    } else {
                      // Wide glowing halo
                      float glowAmt = 1.0 - smoothstep(rInner, rOuter, dWorld);
                      markerCol = mix(colMark, vec3(1.0), 0.5 * glowAmt);
                      markerAlpha = max(markerAlpha, 0.85 * glowAmt);
                    }
                  } else {
                    // Solid center dot + outer ring
                    if (dWorld < rInner) {
                      markerCol = colMark;
                      markerAlpha = max(markerAlpha, opacity);
                    } else {
                      float ringWidth = 0.03;
                      float dRing = abs(dWorld - rOuter + ringWidth);
                      if (dRing < ringWidth) {
                        markerCol = colMark;
                        markerAlpha = max(markerAlpha, opacity * 0.75 * (1.0 - dRing/ringWidth));
                      }
                    }
                  }
                }
              }
            }
          }
          
          if (markerAlpha > 0.001) {
            col = mix(col, markerCol, markerAlpha);
          }

          diffuseColor.rgb = col;
          float covEff = covAt();
          covEff = max(covEff, clamp(uFlood, 0.0, 1.0));
          diffuseColor.a *= covEff;
        }`);

      shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>',
        `if (diffuseColor.a < 0.5) discard;
         #include <alphatest_fragment>`);

      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         {
           float pr = pat_s10(vUvN * (46.0 * uDetailScale));
           roughnessFactor = clamp(roughnessFactor + uDetail * 0.22 * (0.5 - pr), 0.16, 1.0);
         }`);

      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         {
           float amp = uDetail * 0.3;
           if (amp > 0.0001) {
             vec2 mp = vUvN * (46.0 * uDetailScale);
             float hC = pat_s10(mp);
             vec3 dpdx = dFdx(-vViewPosition);
             vec3 dpdy = dFdy(-vViewPosition);
             float dhx = dFdx(hC);
             float dhy = dFdy(hC);
             vec3 r1 = cross(dpdy, normal);
             vec3 r2 = cross(normal, dpdx);
             float det = dot(dpdx, r1);
             vec3 surfGrad = (abs(det) > 1e-8) ? (dhx * r1 + dhy * r2) / det : vec3(0.0);
             surfGrad = clamp(surfGrad, vec3(-4.0), vec3(4.0));
             normal = normalize(normal - amp * surfGrad);
           }
         }`);

      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         {
           float dist = abs(vDu);
           float band = 1.0 - smoothstep(0.0, max(uLap*1.6, 0.04), dist);
           float shadow = (1.0 - uTop) * band;
           float litMul = mix(1.0, 0.40, shadow);
           
           vec3 glowTeam = mix(uTeam, uFloodTeam, clamp(uFlood, 0.0, 1.0));
           vec3 emit = glowTeam * (0.34 * uGlow) * litMul;
           
           vec3 Nw = normalize(vNormal);
           float steep = 1.0 - clamp(Nw.y, 0.0, 1.0);
           float hot = smoothstep(1.2, 3.0, vHd) * smoothstep(0.14, 0.6, steep);
           float flick = 0.82 + 0.18 * vn_s10(vUvN * 40.0 + uTime * 0.7);
           float ember = uEmber * mix(0.18, 1.0, clamp(uIntensity, 0.0, 1.0));
           vec3 hi = uGlowCol * (1.0 + smoothstep(2.0, 3.6, vHd) * 0.5);
           emit += hi * hot * ember * 0.9 * flick * litMul;
           
           float cwE = clamp(texture2D(uCorner, vUvN).r, 0.0, 1.0);
           emit += uCornerCol * cwE * 0.55 * litMul;

           totalEmissiveRadiance += emit;
         }`);
    };

    const homeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.65, metalness: 0.5, envMapIntensity: 1.24,
      transparent: false, alphaTest: 0.5, depthWrite: true, depthTest: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -0.5,
      polygonOffsetUnits: -0.5
    });
    homeMat.onBeforeCompile = customMatCompile(homeUniforms);
    (homeMat as any).customProgramCacheKey = () => "home_blanket";
    const homeMesh = new THREE.Mesh(homeGeom, homeMat);
    homeMesh.castShadow = true;
    homeMesh.receiveShadow = true;
    scene.add(homeMesh);

    const awayMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.65, metalness: 0.5, envMapIntensity: 1.24,
      transparent: false, alphaTest: 0.5, depthWrite: true, depthTest: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 0.5,
      polygonOffsetUnits: 0.5
    });
    awayMat.onBeforeCompile = customMatCompile(awayUniforms);
    (awayMat as any).customProgramCacheKey = () => "away_blanket";
    const awayMesh = new THREE.Mesh(awayGeom, awayMat);
    awayMesh.castShadow = true;
    awayMesh.receiveShadow = true;
    scene.add(awayMesh);

    // --- Vertical Walls (The Torec Skirt) ---
    function makeBlanketSkirtGeometry() {
      const positions: number[] = [];
      const uvsTop: number[] = [];
      const side: number[] = [];
      const edgeDir: number[] = [];
      
      function pushQuad(u0: number, v0: number, u1: number, v1: number, kind: number) {
        const verts = [
          [u0, v0, 0], [u1, v1, 0], [u1, v1, 1],
          [u0, v0, 0], [u1, v1, 1], [u0, v0, 1],
        ];
        for (const [uu, vv, sd] of verts) {
          positions.push((uu - 0.5) * WORLD_X, 0, (0.5 - vv) * WORLD_Z);
          uvsTop.push(uu, vv);
          side.push(sd);
          edgeDir.push(kind, 0);
        }
      }

      for (let i = 0; i < GX; i++) {
        const u0 = i / GX, u1 = (i + 1) / GX;
        pushQuad(u0, 0, u1, 0, 0);          // v=0 border
        pushQuad(u0, 1, u1, 1, 0);          // v=1 border
      }
      for (let j = 0; j < GY; j++) {
        const v0 = j / GY, v1 = (j + 1) / GY;
        pushQuad(0, v0, 0, v1, 0);          // u=0 border
        pushQuad(1, v0, 1, v1, 0);          // u=1 border
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uvTop', new THREE.Float32BufferAttribute(uvsTop, 2));
      geo.setAttribute('sideT', new THREE.Float32BufferAttribute(side, 1));
      geo.setAttribute('edgeKind', new THREE.Float32BufferAttribute(edgeDir, 2));
      return geo;
    }

    const homeWallGeom = makeBlanketSkirtGeometry();
    homeWallGeomRef.current = homeWallGeom;
    const awayWallGeom = makeBlanketSkirtGeometry();
    awayWallGeomRef.current = awayWallGeom;

    // Wall (skirt) uniforms
    const homeWallUniforms = {
      ...homeUniforms,
      uThick: { value: SLAB_THICK },
      uRimCol: { value: new THREE.Color('#0b0d13') },
    };

    const awayWallUniforms = {
      ...awayUniforms,
      uThick: { value: SLAB_THICK },
      uRimCol: { value: new THREE.Color('#0b0d13') },
    };

    // Wall Material compile
    const wallMatCompile = (uniformsObject: any) => (shader: any) => {
      Object.assign(shader.uniforms, uniformsObject);

      shader.vertexShader = `
        uniform sampler2D uHeight; uniform sampler2D uCov; uniform vec2 uTexel;
        uniform float uBaseline; uniform float uThick;
        uniform float uLap; uniform float uLipH; uniform float uTop; uniform float uAway;
        attribute vec2 uvTop; attribute float sideT; attribute vec2 edgeKind;
        varying float vSideT; varying vec2 vUvTop; varying float vKind;
        varying float vDuS; varying float vSurfY;
        varying float vGraze;
        
        float SB(vec2 uv){ float h = texture2D(uHeight, uv).r; if(!(h==h)) h=0.0; return h; }
        float SF(vec2 uv){ float f = texture2D(uCov, uv).r; if(!(f==f)) f=0.5; return f; }
        float SFOLD(float du){
          float s = mix(-du, du, uAway);
          float fw = max(uLap * 0.6, 0.001);
          float ow = max(uLap * 0.4, 0.001);
          float own = 1.0 - smoothstep(0.0, fw, s);
          float opp = smoothstep(-ow, 0.0, s);
          return clamp(min(own, opp + step(0.0, s)), 0.0, 1.0);
        }
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
          float _hl = SB(uvTop - vec2(uTexel.x,0.0)); float _hr = SB(uvTop + vec2(uTexel.x,0.0));
          float _hd = SB(uvTop - vec2(0.0,uTexel.y)); float _hu = SB(uvTop + vec2(0.0,uTexel.y));
          vec3 _wn = normalize(vec3(-(_hr-_hl), 0.0, -(_hu-_hd)) + vec3(0.0001,0.0,0.0));
          objectNormal = _wn;`);

      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
          vUvTop = uvTop; vSideT = sideT; vKind = edgeKind.x;
          float _frnt = SF(uvTop);
          float _isSeam = step(0.5, edgeKind.x);
          vec2 _sampUv = mix(uvTop, vec2(_frnt, uvTop.y), _isSeam);
          float _hb = SB(_sampUv);
          vDuS = uvTop.x - _frnt;
          float _fold = uTop * SFOLD(vDuS);
          float _surfY = (_hb - uBaseline) + uLipH * _fold;
          vSurfY = _surfY;
          transformed.x = mix(transformed.x, (_frnt - 0.5) * WORLD_X, _isSeam);
          transformed.y = _surfY - sideT * uThick;
          vec3 _nv = normalize(normalMatrix * objectNormal);
          vec3 _pv = (modelViewMatrix * vec4(transformed.x, _surfY - sideT * uThick, transformed.z, 1.0)).xyz;
          vec3 _vd = normalize(-_pv);
          vGraze = 1.0 - clamp(abs(dot(_nv, _vd)), 0.0, 1.0);`);

      shader.fragmentShader = `
        uniform vec3 uTeam; uniform float uGlow; uniform float uFlood; uniform vec3 uFloodTeam;
        uniform vec3 uClay; uniform float uSat; uniform float uTint; uniform float uTime;
        uniform float uLap; uniform float uAway; uniform float uThick; uniform vec3 uRimCol;
        uniform float uTop;
        uniform vec2 uTexel;
        uniform float uFloodFade;
        varying float vSideT; varying vec2 vUvTop; varying float vKind;
        varying float vDuS; varying float vSurfY;
        varying float vGraze;
        
        float h21_w(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float vn_w(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          float a=h21_w(i), b=h21_w(i+vec2(1,0)), c=h21_w(i+vec2(0,1)), d=h21_w(i+vec2(1,1));
          return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
        float fbm_w(vec2 p){ float s=0.0,a=0.5; for(int k=0;k<3;k++){ s+=a*vn_w(p); p=p*2.03+vec2(11.3,7.7); a*=0.5; } return s; }
        
        float wallCov(){
          float lap = uLap * (1.0 - clamp(uFloodFade, 0.0, 1.0));
          float d = mix(lap - vDuS, vDuS + lap, uAway);
          return step(0.0, d);
        }
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>',
        `#include <color_fragment>
        {
          float cov = wallCov();
          float seamW = max(uTexel.x * 1.6, 0.010);
          float seamKeep = 1.0 - smoothstep(seamW*0.6, seamW, abs(vDuS));
          float onTop = smoothstep(0.35, 0.65, uTop);
          float keep = (vKind > 0.5) ? (cov * seamKeep * onTop) : cov;
          keep *= (1.0 - clamp(uFloodFade, 0.0, 1.0));
          if (keep < 0.5) discard;
          vec3 team = uTeam;
          float lum = dot(team, vec3(0.299,0.587,0.114));
          team = max(mix(vec3(lum), team, uSat), 0.0);
          vec3 col = mix(uClay, team, clamp(uTint,0.0,1.0));
          col = mix(col, uFloodTeam, clamp(uFlood,0.0,1.0));
          float wlum = dot(col, vec3(0.299,0.587,0.114));
          col = mix(vec3(wlum), col, 0.82);
          float streakCoord = vUvTop.x*13.0 + vUvTop.y*13.0;
          float grain = fbm_w(vec2(streakCoord, vSideT*3.0)) - 0.5;
          float streakLod = fwidth(streakCoord);
          float lodFade = 1.0 - smoothstep(0.08, 0.28, streakLod);
          float grazeFade = 1.0 - smoothstep(0.55, 0.9, vGraze);
          col *= 1.0 + grain * 0.05 * lodFade * grazeFade;
          float down = clamp(vSideT, 0.0, 1.0);
          vec3 baseTone = uRimCol * vec3(0.85, 0.9, 1.15);
          col = mix(col, baseTone, down*down*0.82);
          diffuseColor.rgb = col;
          diffuseColor.a = 1.0;
        }`);

      shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>',
        `if (diffuseColor.a < 0.5) discard;
         #include <alphatest_fragment>`);

      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         {
           vec3 glowTeam = mix(uTeam, uFloodTeam, clamp(uFlood,0.0,1.0));
           float rim = smoothstep(0.14, 0.0, vSideT);
           vec3 emit = glowTeam * (0.11 * uGlow) * (1.0 - vSideT) * (1.0 - vSideT);
           emit += glowTeam * rim * 0.55;
           totalEmissiveRadiance += emit;
         }`);
    };

    const homeWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.94, metalness: 0.55, envMapIntensity: 1.1,
      transparent: false, alphaTest: 0.5, depthWrite: true, depthTest: true,
      side: THREE.DoubleSide
    });
    homeWallMat.onBeforeCompile = wallMatCompile(homeWallUniforms);
    (homeWallMat as any).customProgramCacheKey = () => "home_wall";
    const homeWallMesh = new THREE.Mesh(homeWallGeom, homeWallMat);
    homeWallMesh.castShadow = true;
    homeWallMesh.receiveShadow = true;
    homeWallMesh.frustumCulled = false;
    homeWallMesh.renderOrder = 0;
    scene.add(homeWallMesh);

    const awayWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.94, metalness: 0.55, envMapIntensity: 1.1,
      transparent: false, alphaTest: 0.5, depthWrite: true, depthTest: true,
      side: THREE.DoubleSide
    });
    awayWallMat.onBeforeCompile = wallMatCompile(awayWallUniforms);
    (awayWallMat as any).customProgramCacheKey = () => "away_wall";
    const awayWallMesh = new THREE.Mesh(awayWallGeom, awayWallMat);
    awayWallMesh.castShadow = true;
    awayWallMesh.receiveShadow = true;
    awayWallMesh.frustumCulled = false;
    awayWallMesh.renderOrder = 0;
    scene.add(awayWallMesh);

    // --- Cylinder 3D Goals ---
    function buildGoalPosts(isLeft: boolean) {
      const goalGroup = new THREE.Group();
      const posX = isLeft ? -WORLD_X / 2 : WORLD_X / 2;
      const rotation = isLeft ? 0 : Math.PI;

      const postMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.25, metalness: 0.6 });
      const netMat = new THREE.MeshBasicMaterial({ color: 0x787fa1, wireframe: true, transparent: true, opacity: 0.16 });
      
      const width = 2.4;
      const height = 0.9;
      const depth = 0.55;
      const thick = 0.04;

      const lp = new THREE.Mesh(new THREE.CylinderGeometry(thick, thick, height, 8), postMat);
      lp.position.set(0, height/2, -width/2);
      goalGroup.add(lp);

      const rp = new THREE.Mesh(new THREE.CylinderGeometry(thick, thick, height, 8), postMat);
      rp.position.set(0, height/2, width/2);
      goalGroup.add(rp);

      const cb = new THREE.Mesh(new THREE.CylinderGeometry(thick, thick, width, 8), postMat);
      cb.rotation.x = Math.PI / 2;
      cb.position.set(0, height, 0);
      goalGroup.add(cb);

      // Back frame
      const netBox = new THREE.Mesh(new THREE.BoxGeometry(depth, height, width), netMat);
      netBox.position.set(isLeft ? -depth/2 : depth/2, height/2, 0);
      goalGroup.add(netBox);

      goalGroup.position.set(posX, 0, 0);
      scene.add(goalGroup);
    }
    buildGoalPosts(true);
    buildGoalPosts(false);

    // --- 3D Holographic Wireframe Materials (for blueprint mode) ---
    const homeHoloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(homeColor),
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    const awayHoloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(awayColor),
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide
    });
    const homeWallHoloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(homeColor),
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const awayWallHoloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(awayColor),
      wireframe: true,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });

    // --- 3D Shot Markers for Chances (Dots on pitch) ---
    const shotMarkersGroup = new THREE.Group();
    scene.add(shotMarkersGroup);

    // Analytical Geometries (Hexagonal Cylinder, Torus O, Box bars for X, Cone for Holo)
    const hexColumnGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 6);
    const torusGeom = new THREE.TorusGeometry(0.12, 0.03, 8, 24);
    const crossBarGeom = new THREE.BoxGeometry(0.04, 0.28, 0.04);
    const pyramidGeom = new THREE.ConeGeometry(0.15, 0.4, 4, 1);
    const ringGeom = new THREE.RingGeometry(0.24, 0.30, 32);

    const shotsListFor3D = visualEventsRef.current.filter(
      ev => ev.kind === "shot" || ev.type === "shot" || ev.isGoal
    );

    const shotMarkers: Array<{
      ev: any;
      meshCyber: THREE.Mesh;
      meshTactical: THREE.Object3D;
      meshHolo: THREE.Mesh;
      ring: THREE.Mesh;
      u: number;
      v: number;
    }> = [];

    shotsListFor3D.forEach(ev => {
      const wX = (ev.u - 0.5) * WORLD_X;
      const wZ = (0.5 - ev.v) * WORLD_Z;

      // 1. Data Analyst Marker (Hexagonal Prism)
      const cyberMat = new THREE.MeshStandardMaterial({
        roughness: 0.15,
        metalness: 0.85,
        transparent: true,
        opacity: 0.95
      });
      const cyberMesh = new THREE.Mesh(hexColumnGeom, cyberMat);
      cyberMesh.castShadow = true;
      cyberMesh.receiveShadow = false;
      cyberMesh.position.set(wX, 0, wZ);
      shotMarkersGroup.add(cyberMesh);

      // 2. Tactical Coaches Chalkboard Marker (X or O)
      let tacticalMesh: THREE.Object3D;
      const chalkMat = new THREE.MeshStandardMaterial({
        roughness: 0.95,
        metalness: 0.0,
        transparent: false
      });
      if (ev.isGoal) {
        // Torus O (Goal)
        const torusMesh = new THREE.Mesh(torusGeom, chalkMat);
        torusMesh.rotation.x = -Math.PI / 2;
        torusMesh.position.set(wX, 0.04, wZ);
        shotMarkersGroup.add(torusMesh);
        tacticalMesh = torusMesh;
      } else {
        // Crossed X (Shot missed)
        const xGroup = new THREE.Group();
        const bar1 = new THREE.Mesh(crossBarGeom, chalkMat);
        bar1.rotation.y = Math.PI / 4;
        bar1.rotation.x = -Math.PI / 2; // lie flat but crossed
        
        const bar2 = new THREE.Mesh(crossBarGeom, chalkMat);
        bar2.rotation.y = -Math.PI / 4;
        bar2.rotation.x = -Math.PI / 2;
        
        xGroup.add(bar1, bar2);
        xGroup.position.set(wX, 0.04, wZ);
        shotMarkersGroup.add(xGroup);
        tacticalMesh = xGroup;
      }

      // 3. Holographic Blueprint Marker (Wireframe Pyramid)
      const holoMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(ev.team === "home" ? 0x00ffff : 0xff00ff),
        wireframe: true,
        transparent: true,
        opacity: 0.85
      });
      const holoMesh = new THREE.Mesh(pyramidGeom, holoMat);
      holoMesh.position.set(wX, 0, wZ);
      shotMarkersGroup.add(holoMesh);

      // 4. Anchor Ring
      const ringMat = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(wX, 0.02, wZ);
      shotMarkersGroup.add(ringMesh);

      shotMarkers.push({
        ev,
        meshCyber: cyberMesh,
        meshTactical: tacticalMesh,
        meshHolo: holoMesh,
        ring: ringMesh,
        u: ev.u,
        v: ev.v
      });
    });

    // --- Dynamic Style Swapper Helper ---
    const applyStyleChanges = (style: 'cyber' | 'tactical' | 'glass') => {
      // 1. Fog
      if (style === 'cyber') {
        scene.fog = new THREE.FogExp2(0x060814, 0.010);
      } else if (style === 'tactical') {
        scene.fog = new THREE.FogExp2(0x0d1510, 0.008); // chalk green fog
      } else if (style === 'glass') {
        scene.fog = new THREE.FogExp2(0x0a0714, 0.015);
      }

      // 2. Lights
      if (style === 'cyber') {
        ambientLight.color.setHex(0x768ad1);
        ambientLight.intensity = 0.6;
        hemiLight.color.setHex(0x485fa6);
        hemiLight.groundColor.setHex(0x1b1c30);
        hemiLight.intensity = 0.7;
        dirLight.color.setHex(0xffffff);
        dirLight.intensity = 2.8;
      } else if (style === 'tactical') {
        // flat tactics board daylight
        ambientLight.color.setHex(0xd1d5db);
        ambientLight.intensity = 1.2;
        hemiLight.color.setHex(0x94a3b8);
        hemiLight.groundColor.setHex(0x334155);
        hemiLight.intensity = 0.5;
        dirLight.color.setHex(0xffffff);
        dirLight.intensity = 1.4;
      } else if (style === 'glass') {
        // Holographic modes use virtually self-illuminated wireframes, so standard lights are dimmed
        ambientLight.color.setHex(0x312e81);
        ambientLight.intensity = 0.2;
        hemiLight.color.setHex(0x4c1d95);
        hemiLight.groundColor.setHex(0x1e1b4b);
        hemiLight.intensity = 0.1;
        dirLight.color.setHex(0xffffff);
        dirLight.intensity = 0.3;
      }

      // 3. Blanket & Skirt Materials Hot Swapping
      if (style === 'glass') {
        // Hot-swap to wireframe BasicMaterials
        (homeMesh as any).material = homeHoloMat;
        (awayMesh as any).material = awayHoloMat;
        (homeWallMesh as any).material = homeWallHoloMat;
        (awayWallMesh as any).material = awayWallHoloMat;
      } else {
        // Restore compiled StandardMaterials
        (homeMesh as any).material = homeMat;
        (awayMesh as any).material = awayMat;
        (homeWallMesh as any).material = homeWallMat;
        (awayWallMesh as any).material = awayWallMat;

        if (style === 'cyber') {
          homeMat.wireframe = false;
          homeMat.transparent = false;
          homeMat.opacity = 1.0;
          homeMat.roughness = 0.65;
          homeMat.metalness = 0.5;

          awayMat.wireframe = false;
          awayMat.transparent = false;
          awayMat.opacity = 1.0;
          awayMat.roughness = 0.65;
          awayMat.metalness = 0.5;

          homeWallMat.wireframe = false;
          homeWallMat.transparent = false;
          homeWallMat.opacity = 1.0;

          awayWallMat.wireframe = false;
          awayWallMat.transparent = false;
          awayWallMat.opacity = 1.0;
        } else if (style === 'tactical') {
          // chalkboard matte textures
          homeMat.wireframe = false;
          homeMat.transparent = false;
          homeMat.opacity = 1.0;
          homeMat.roughness = 0.95;
          homeMat.metalness = 0.05;

          awayMat.wireframe = false;
          awayMat.transparent = false;
          awayMat.opacity = 1.0;
          awayMat.roughness = 0.95;
          awayMat.metalness = 0.05;

          homeWallMat.wireframe = false;
          homeWallMat.transparent = false;
          homeWallMat.opacity = 1.0;

          awayWallMat.wireframe = false;
          awayWallMat.transparent = false;
          awayWallMat.opacity = 1.0;
        }
      }

      // 4. Uniforms
      const styleModeVal = style === 'cyber' ? 0.0 : (style === 'tactical' ? 1.0 : 2.0);
      homeUniforms.uStyleMode.value = styleModeVal;
      awayUniforms.uStyleMode.value = styleModeVal;

      if (style === 'cyber') {
        homeUniforms.uSat.value = 0.86;
        homeUniforms.uTint.value = 1.0;
        homeUniforms.uDetail.value = 0.58;
        homeUniforms.uClay.value.set('#6a6560');

        awayUniforms.uSat.value = 0.86;
        awayUniforms.uTint.value = 1.0;
        awayUniforms.uDetail.value = 0.58;
        awayUniforms.uClay.value.set('#6a6560');
      } else if (style === 'tactical') {
        // chalkboard forest green background
        homeUniforms.uSat.value = 0.15;
        homeUniforms.uTint.value = 0.08;
        homeUniforms.uDetail.value = 0.05;
        homeUniforms.uClay.value.set('#163520');

        awayUniforms.uSat.value = 0.15;
        awayUniforms.uTint.value = 0.08;
        awayUniforms.uDetail.value = 0.05;
        awayUniforms.uClay.value.set('#163520');
      } else if (style === 'glass') {
        homeUniforms.uSat.value = 1.0;
        homeUniforms.uTint.value = 1.0;
        homeUniforms.uDetail.value = 0.9;
        homeUniforms.uClay.value.set('#00ffff');

        awayUniforms.uSat.value = 1.0;
        awayUniforms.uTint.value = 1.0;
        awayUniforms.uDetail.value = 0.9;
        awayUniforms.uClay.value.set('#00ffff');
      }

      // 5. Particles
      if (particlesRef.current) {
        particlesRef.current.visible = (style === 'cyber'); // only cyber has stardust particles
      }
    };

    // --- Procedural Lightning Storms ---
    const lightningMaterial = new THREE.LineBasicMaterial({
      color: 0xeef5ff,
      linewidth: 3, // only affects non-WebGL, but standard fallback
      transparent: true,
      opacity: 0
    });
    
    // Line segments can host multiple branching lines
    const lightningGeom = new THREE.BufferGeometry();
    const lightningLines = new THREE.LineSegments(lightningGeom, lightningMaterial);
    scene.add(lightningLines);
    lightningLinesRef.current = lightningLines;

    // Handle Resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    // Animation variables
    let animationFrameId: number;
    const clock = new THREE.Clock();

    // Trigger procedural lightning bolts (15-segment zig-zag)
    const triggerLightningBolt = (strikeX: number, strikeZ: number, strikeY: number) => {
      const positions: number[] = [];
      
      function addBranch(start: THREE.Vector3, end: THREE.Vector3, segments = 10, offsetFactor = 0.4) {
        let prev = start.clone();
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          const target = new THREE.Vector3().lerpVectors(start, end, t);
          
          if (i < segments) {
            // add random offset perpendicular to path
            target.add(new THREE.Vector3(
              (Math.random() - 0.5) * offsetFactor,
              (Math.random() - 0.5) * offsetFactor * 0.5,
              (Math.random() - 0.5) * offsetFactor
            ));
          }
          positions.push(prev.x, prev.y, prev.z, target.x, target.y, target.z);
          prev.copy(target);

          // Random branch splitting (33% chance)
          if (Math.random() < 0.33 && i < segments - 2) {
            const branchEnd = target.clone().add(new THREE.Vector3(
              (Math.random() - 0.5) * 1.5,
              -Math.random() * 1.2,
              (Math.random() - 0.5) * 1.5
            ));
            addBranch(target, branchEnd, 4, offsetFactor * 0.5);
          }
        }
      }

      const boltStart = new THREE.Vector3(strikeX + (Math.random() - 0.5) * 2, 7.5, strikeZ + (Math.random() - 0.5) * 2);
      const boltEnd = new THREE.Vector3(strikeX, strikeY, strikeZ);
      addBranch(boltStart, boltEnd, 12, 0.45);

      lightningGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      lightningFlashRef.current = 1.0; // max flash opacity
      if (lightningMaterial) {
        lightningMaterial.opacity = 1.0;
      }
    };

    // Expose lightning trigger to window for access
    (window as any)._triggerLightning = triggerLightningBolt;

    // Loop
    const tick = () => {
      animationFrameId = requestAnimationFrame(tick);
      
      const delta = clock.getDelta();
      if (isPlayingRef.current) {
        visualTimeRef.current += delta;
      }
      const visualTime = visualTimeRef.current;

      // Controls update
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Gently orbit camera automatically if playing (adds visual interest)
      if (isPlayingRef.current && cameraRef.current) {
        const orbitAngle = visualTime * 0.04;
        const targetX = Math.cos(orbitAngle) * 19;
        const targetZ = Math.sin(orbitAngle) * 19;
        cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, targetX, 0.02);
        cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetZ, 0.02);
      }

      // Update timing
      if (isPlayingRef.current) {
        let nextT = timeRef.current + delta * playbackSpeedRef.current;
        if (nextT >= durationRef.current) {
          nextT = durationRef.current;
          isPlayingRef.current = false;
          setIsPlaying(false);
        }
        timeRef.current = nextT;
        setCurrentTime(nextT);
      }

      const activeT = timeRef.current;
      const activeMin = Math.floor(activeT / 60);

      // Filter events up to activeT
      const completedEvents = visualEventsRef.current.filter(ev => ev.t <= activeT);
      const lastGoalEvent = completedEvents.filter(ev => ev.isGoal).pop();

      // Goal flood state
      let floodIntensity = 0;
      let floodKitCol = new THREE.Color();
      if (lastGoalEvent) {
        const age = activeT - lastGoalEvent.t;
        if (age < 160) {
          // flood color
          floodKitCol.set(lastGoalEvent.team === "home" ? homeColor : awayColor);
          
          if (age < 35) {
            floodIntensity = age / 35; // rise
          } else {
            floodIntensity = Math.max(0, 1 - (age - 35) / 125); // slow fall
          }
        }
      }

      // Momentum index
      let momIdx = 0;
      const momentumPoint = momentumDataRef.current.find(pt => pt.minute === activeMin);
      if (momentumPoint) {
        momIdx = momentumPoint.v;
      }

      // Dynamic stats accumulators
      let dynamicShotsH = 0;
      let dynamicShotsA = 0;
      let dynamicCornersH = 0;
      let dynamicCornersA = 0;
      let dynamicXgH = 0;
      let dynamicXgA = 0;
      let dynamicGoalsH = 0;
      let dynamicGoalsA = 0;

      // Drive dominance domes from eased live momentum (swing pressure)
      const targetHomePress = momIdx > 0 ? momIdx * 15.0 : 0.0;
      const targetAwayPress = momIdx < 0 ? -momIdx * 15.0 : 0.0;
      
      homePressRef.current += (targetHomePress - homePressRef.current) * 0.04;
      awayPressRef.current += (targetAwayPress - awayPressRef.current) * 0.04;

      let homePress = homePressRef.current;
      let awayPress = awayPressRef.current;

      // Spire displacement lists
      interface SpireDeformation {
        x: number;
        z: number;
        radiusSq: number;
        height: number;
        color?: string;
      }
      const allSpires: SpireDeformation[] = [];

      interface LungeActive {
        home: boolean;
        su: number;
        jc: number;
        sig: number;
        env: number;
      }
      const activeLunges: LungeActive[] = [];

      let currentXgLabelPos: { text: string; x: number; y: number } | null = null;
      let currentGoalCard: GoalCardState | null = null;

      visualEventsRef.current.forEach((ev, idx) => {
        if (ev.t <= activeT) {
          const wX = (ev.u - 0.5) * WORLD_X;
          const wZ = (0.5 - ev.v) * WORLD_Z;

          if (ev.kind === "shot" || ev.type === "shot" || ev.isGoal) {
            // Stats
            if (ev.team === "home") {
              dynamicShotsH++;
              dynamicXgH += ev.xg || 0.1;
              if (ev.isGoal) dynamicGoalsH++;
            } else {
              dynamicShotsA++;
              dynamicXgA += ev.xg || 0.1;
              if (ev.isGoal) dynamicGoalsA++;
            }

            // Spike peak (rises in 6s, goals decay in 45s, shots decay in 15s)
            const age = activeT - ev.t;
            if (age >= 0) {
              const isGoal = ev.isGoal;
              const atk = 6.0;
              const rel = isGoal ? 45.0 : 15.0; // 45s for goal, 15s for shot
              const rise = 1.0 - Math.exp(-age / atk);
              const decay = Math.exp(-age / rel);
              const envelope = rise * decay;

              if (envelope > 0.005) {
                const xg = ev.xg || 0.15;
                // Towering spires! Goals reach up to 9 units, shots scale with xG up to 6 units
                const maxH = ev.isGoal ? 9.0 : 6.0;
                const baseHeight = ev.isGoal ? 3.5 : 0.8;
                
                // Beautiful wide volcanic conical mountain shapes
                const radiusSq = ev.isGoal ? 8.5 : (3.2 + xg * 5.0);
                
                const spire = {
                  x: wX,
                  z: wZ,
                  radiusSq,
                  height: (baseHeight + xg * maxH) * envelope,
                  color: ev.team === "home" ? homeColor : awayColor
                };

                allSpires.push(spire);

                // Add active lunge for shot!
                const wallAge = age / playbackSpeed; // match seconds to wall seconds
                const lungeEnvVal = dangerFingerEnv(wallAge);
                if (lungeEnvVal > 0.01) {
                  activeLunges.push({
                    home: ev.team === "home",
                    su: ev.u,
                    jc: ev.v * GY,
                    sig: 0.085 * GY,
                    env: lungeEnvVal
                  });
                }

                // Update overlays (floating Scorer Player Card or simple xG label) for shot in last 120s
                if (age < 120) {
                  const labelAlpha = Math.max(0, 1 - age / 120);
                  if (labelAlpha > 0.3) {
                    const labelH = (baseHeight + xg * maxH) * envelope;
                    const projVec = new THREE.Vector3(wX, labelH + 0.45, wZ);
                    projVec.project(camera);
                    
                    const sX = (projVec.x * 0.5 + 0.5) * width;
                    const sY = (-(projVec.y * 0.5) + 0.5) * height;

                    const clampedGoalX = Math.max(60, Math.min(width - 60, sX));
                    const clampedGoalY = Math.max(180, Math.min(height - 15, sY));

                    const clampedXgX = Math.max(70, Math.min(width - 70, sX));
                    const clampedXgY = Math.max(25, Math.min(height - 15, sY));

                    if (ev.isGoal) {
                      // Generate deterministic shirt number between 2 and 22 based on name char codes
                      const charCodeSum = (ev.surname || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
                      const shirtNumber = 2 + (charCodeSum % 21);
                      
                      currentGoalCard = {
                        playerName: `${ev.name || ""} ${ev.surname || "Player"}`.trim(),
                        team: ev.team === "home" ? homeTeam : awayTeam,
                        position: ev.position || "FWD",
                        x: clampedGoalX,
                        y: clampedGoalY,
                        xg,
                        isGoal: true,
                        shirtNumber,
                        teamColor: ev.team === "home" ? homeColor : awayColor,
                        fotmobId: ev.fotmobId,
                        minute: ev.dispMin || Math.floor(ev.t / 60)
                      };
                    } else if (!currentXgLabelPos || ev.xg! > 0.15) {
                      currentXgLabelPos = {
                        text: `SHOT • ${ev.surname || "Player"} (${xg.toFixed(2)} xG)`,
                        x: clampedXgX,
                        y: clampedXgY
                      };
                    }
                  }
                }
              }
            }
          } else if (ev.type === "danger_possession" || ev.type === "high_danger_possession") {
            // Fading terrain wave
            const age = activeT - ev.t;
            let growth = 0;
            if (age >= 0 && age <= 90) {
              if (age < 12) growth = age / 12;
              else if (age < 35) growth = 1.0;
              else growth = Math.max(0, 1 - (age - 35) / 55);
            }
            if (growth > 0) {
              const maxWaveH = ev.type === "high_danger_possession" ? 1.75 : 0.90;
              const radSq = ev.type === "high_danger_possession" ? 14.0 : 10.0;
              const wave = {
                x: wX,
                z: wZ,
                radiusSq: radSq,
                height: maxWaveH * growth,
                color: ev.team === "home" ? homeColor : awayColor
              };
              allSpires.push(wave);

              // Add active lunge for possession attack too!
              activeLunges.push({
                home: ev.team === "home",
                su: ev.u,
                jc: ev.v * GY,
                sig: 0.12 * GY,
                env: growth * 0.8
              });
            }
          } else if (ev.corner) {
            if (ev.team === "home") dynamicCornersH++;
            else dynamicCornersA++;
          }

          // Trigger lightning bolts on goal or red card events
          if (ev.type === "Card" && ev.outcome === "Red" && Math.abs(activeT - ev.t) < 0.8) {
            if (Math.random() < 0.2) {
              triggerLightningBolt(wX, wZ, 0.1);
            }
          }
          if (ev.isGoal && Math.abs(activeT - ev.t) < 0.8) {
            if (Math.random() < 0.2) {
              triggerLightningBolt(wX, wZ, 0.1);
            }
          }
        }
      });

      // Update dynamic states
      setDynamicStats({
        home: { shots: dynamicShotsH, corners: dynamicCornersH, xg: dynamicXgH },
        away: { shots: dynamicShotsA, corners: dynamicCornersA, xg: dynamicXgA }
      });
      setCurrentHomeScore(dynamicGoalsH);
      setCurrentAwayScore(dynamicGoalsA);
      setActiveXgLabel(currentXgLabelPos);
      setActiveGoalCard(currentGoalCard);

      // --- DYNAMIC gradient score-tinted sky (hybrid score + momentum pressure lean) ---
      const scoreLead = dynamicGoalsH - dynamicGoalsA;
      let targetLean = 0;
      if (scoreLead !== 0) {
        // Goals lead shapes base color balance
        const skyMag = Math.max(0, Math.min(1, Math.abs(scoreLead) / 2));
        const baseLean = Math.sign(scoreLead) * (0.32 + 0.48 * skyMag);
        // Momentum index shapes immediate shifting pressure (+/- 0.22)
        targetLean = baseLean + momIdx * 0.22;
      } else {
        // If tied (0-0, 1-1, etc.), sky drift represents 100% live attacking pressure
        targetLean = momIdx * 0.55;
      }
      targetLean = Math.max(-1.0, Math.min(1.0, targetLean));

      skyLeanEasedRef.current += (targetLean - skyLeanEasedRef.current) * 0.08;
      
      const lean = skyLeanEasedRef.current;
      const strength = Math.abs(lean);
      const tintCol = lean >= 0 ? new THREE.Color(homeColor) : new THREE.Color(awayColor);
      
      // Calculate top, mid, bot colors
      const _sc0 = new THREE.Color('#0d0e1c').lerp(tintCol, 0.06 * strength);
      const _sc1 = new THREE.Color('#0a0812').lerp(tintCol, 0.09 * strength);
      const _sc2 = new THREE.Color('#06040a').lerp(tintCol, 0.15 * strength);
      
      const hx0 = '#' + _sc0.getHexString();
      const hx1 = '#' + _sc1.getHexString();
      const hx2 = '#' + _sc2.getHexString();
      
      if (skyCtx && skyTex) {
        // Base diagonal gradient
        const base = skyCtx.createLinearGradient(512 * 0.12, 0, 512 * 0.9, 512);
        base.addColorStop(0.0, hx0);
        base.addColorStop(0.52, hx1);
        base.addColorStop(1.0, hx2);
        skyCtx.fillStyle = base;
        skyCtx.fillRect(0, 0, 512, 512);
        
        // Neutral atmosphere floor pools (cool/warm gallery ambient lighting)
        const prevComp = skyCtx.globalCompositeOperation;
        skyCtx.globalCompositeOperation = 'lighter';
        const floorFade = (1 - Math.min(1, strength));
        const floorPools = [
          [0.32, 0.28, 0.85, 0.30, 78, 104, 168],
          [0.74, 0.82, 0.78, 0.22, 168, 100, 86],
          [0.86, 0.26, 0.48, 0.13, 96, 116, 172],
          [0.14, 0.66, 0.46, 0.10, 120, 92, 150]
        ];
        for (const [cx, cy, rad, a, r, g, bl] of floorPools) {
          const aa = a * floorFade;
          const gr = skyCtx.createRadialGradient(cx * 512, cy * 512, 0, cx * 512, cy * 512, rad * 512);
          gr.addColorStop(0.0, `rgba(${r},${g},${bl},${aa})`);
          gr.addColorStop(0.5, `rgba(${r},${g},${bl},${aa * 0.35})`);
          gr.addColorStop(1.0, `rgba(${r},${g},${bl},0)`);
          skyCtx.fillStyle = gr;
          skyCtx.fillRect(0, 0, 512, 512);
        }
        
        // Layered off-centre leader-tinted pools
        const tintR = Math.round(tintCol.r * 255);
        const tintG = Math.round(tintCol.g * 255);
        const tintB = Math.round(tintCol.b * 255);
        const pools = [
          [0.30, 0.30, 0.72, 0.30, 0.38],
          [0.78, 0.24, 0.48, 0.16, 0.34],
          [0.62, 0.82, 0.66, 0.20, 0.40],
          [0.14, 0.74, 0.40, 0.12, 0.36]
        ];
        const poolLift = 0.24 + 0.40 * strength;
        for (const [cx, cy, rad, ia, ms] of pools) {
          const a0 = ia * poolLift;
          const gr = skyCtx.createRadialGradient(cx * 512, cy * 512, 0, cx * 512, cy * 512, rad * 512);
          gr.addColorStop(0.0, `rgba(${tintR},${tintG},${tintB},${a0})`);
          gr.addColorStop(ms, `rgba(${tintR},${tintG},${tintB},${a0 * 0.4})`);
          gr.addColorStop(1.0, `rgba(${tintR},${tintG},${tintB},0)`);
          skyCtx.fillStyle = gr;
          skyCtx.fillRect(0, 0, 512, 512);
        }
        skyCtx.globalCompositeOperation = prevComp;
        skyTex.needsUpdate = true;

        // Gently match the scene fog color to sky floor color for premium atmosphere
        if (sceneRef.current && sceneRef.current.fog) {
          (sceneRef.current.fog as THREE.FogExp2).color.copy(_sc2);
        }
      }

      // Animate and color-lerp the stadium canopy stardust particle system
      if (particlesRef.current && particlesGeomRef.current) {
        // Swirl particles around Y-axis; rotate faster during goals (floodIntensity > 0)
        particlesRef.current.rotation.y += 0.0003 + 0.0012 * floodIntensity;
        
        const colorsAttr = particlesGeomRef.current.attributes.color as THREE.BufferAttribute;
        const colorsArr = colorsAttr.array as Float32Array;
        
        // Base dark blue stardust color
        const baseColor = new THREE.Color(0x28325a);
        
        // Target color: if there is an active goal flood, pulse with scoring team color.
        // Otherwise, blend based on active momentum (lean / strength).
        const targetColor = floodIntensity > 0 
          ? floodKitCol 
          : (lean >= 0 ? new THREE.Color(homeColor) : new THREE.Color(awayColor));
        
        const blendFactor = floodIntensity > 0 
          ? floodIntensity * 0.95 
          : strength * 0.55;
          
        const activeColor = baseColor.clone().lerp(targetColor, blendFactor);
        
        for (let p = 0; p < 600; p++) {
          // Dynamic light twinkle / noise fluctuation over active time
          const twinkle = 0.82 + 0.25 * Math.sin(activeT * 2.5 + p);
          colorsArr[p * 3] = activeColor.r * twinkle;
          colorsArr[p * 3 + 1] = activeColor.g * twinkle;
          colorsArr[p * 3 + 2] = activeColor.b * twinkle;
        }
        colorsAttr.needsUpdate = true;
      }

      // Possession front tide base value from momentum
      const mom = momIdx; // -1..+1
      const momFront = 0.5 + 0.5 * Math.sign(mom) * Math.pow(Math.abs(mom), 0.65);

      // Find the ball position at the current playback time from authentic locus path
      let ballU = 0.5;
      let ballV = 0.5;
      const A_locus = ballLocusRef.current;
      let ballFound = false;
      if (A_locus && A_locus.length > 0) {
        if (activeT <= A_locus[0].t) {
          ballU = A_locus[0].u;
          ballV = A_locus[0].v;
          ballFound = true;
        } else if (activeT >= A_locus[A_locus.length - 1].t) {
          ballU = A_locus[A_locus.length - 1].u;
          ballV = A_locus[A_locus.length - 1].v;
          ballFound = true;
        } else {
          let idx = 0;
          while (idx < A_locus.length - 2 && A_locus[idx + 1].t <= activeT) {
            idx++;
          }
          const a = A_locus[idx];
          const b = A_locus[idx + 1];
          const span = Math.max(1e-4, b.t - a.t);
          const f = Math.max(0, Math.min(1, (activeT - a.t) / span));
          const e = f * f * (3 - 2 * f);
          ballU = THREE.MathUtils.lerp(a.u, b.u, e);
          ballV = THREE.MathUtils.lerp(a.v, b.v, e);
          ballFound = true;
        }
      }

      if (!ballFound) {
        // Fallback to passing orbit if no locus is present
        const orbitRadiusU = 0.14;
        const orbitRadiusV = 0.32;
        const timeScale = visualTime * 0.72;
        ballU = momFront + orbitRadiusU * Math.sin(timeScale * 0.65);
        ballV = 0.5 + orbitRadiusV * Math.cos(timeScale * 0.42) * (0.8 + 0.25 * Math.sin(timeScale * 1.3));
      }

      // Smooth the ball coordinate
      smoothBallRef.current.u += (ballU - smoothBallRef.current.u) * 0.10;
      smoothBallRef.current.v += (ballV - smoothBallRef.current.v) * 0.10;

      // Slices/channels variables for Thrust Fingers and Attack Reach
      const A_thrustH = new Float32Array(48);
      const A_thrustA = new Float32Array(48);
      const A_thrustWH = new Float32Array(48);
      const A_thrustWA = new Float32Array(48);

      const A_reachH = new Float32Array(48);
      const A_reachA = new Float32Array(48);
      const A_reachWH = new Float32Array(48);
      const A_reachWA = new Float32Array(48);

      for (const e of visualEventsRef.current) {
        if (e.t > activeT) break;
        const age = activeT - e.t;
        if (age < 0) continue;

        // 1. Thrust Fingers (fast attack, fast decay: window of last 20 seconds)
        if (age < 20.0) {
          const isShot = e.kind === 'shot' || e.type === 'Goal' || e.isGoal;
          const isPass = e.kind === 'pass' && e.eu !== undefined && Number.isFinite(e.eu);
          if (isShot || isPass) {
            const env = arWeight(age, 0.25, 4.33); // 3.0s half-life -> rel = 4.33s
            if (env >= 0.03) {
              const evVal = e.ev ?? 0.5;
              const vVal = e.v ?? 0.5;
              let fv = (e.ev !== undefined && Number.isFinite(e.ev)) ? evVal : ((e.v !== undefined && Number.isFinite(e.v)) ? vVal : 0.5);
              let endU = 0.5;
              let w = 0;
              if (isShot) {
                fv = (e.v !== undefined && Number.isFinite(e.v)) ? vVal : 0.5;
                const su = Number.isFinite(e.u) ? e.u : (e.team === 'home' ? 0.94 : 0.06);
                endU = e.team === 'home' ? Math.min(1.0, Math.max(0.94, su) + 0.05) : Math.max(0.0, Math.min(0.06, su) - 0.05);
                const xg = e.xg || 0.15;
                w = (1.3 + 5.2 * xg) * env;
              } else {
                const euVal = e.eu ?? 0.5;
                const fwd = e.team === 'home' ? (euVal - e.u) : (e.u - euVal);
                if (fwd >= 0.06) {
                  const deep = e.team === 'home' ? (euVal >= 0.60) : (euVal <= 0.40);
                  if (deep || e.through || (fwd > 0.12)) {
                    const fastBoost = 1.0;
                    const thruBoost = e.through ? 1.8 : 1.0;
                    const longBoost = e.long ? 1.4 : 1.0;
                    w = Math.min(1.2, fwd * 3.0) * fastBoost * thruBoost * longBoost * env;
                    fv = evVal;
                    endU = Math.max(0.06, Math.min(0.94, euVal));
                  }
                }
              }

              if (w >= 0.02) {
                const sigma = 0.11;
                const reachDist = sigma * 3.0;
                const inv2sig2 = 1.0 / (2.0 * sigma * sigma);
                const jLo = Math.max(0, Math.floor((1.0 - (fv + reachDist)) * 47));
                const jHi = Math.min(47, Math.ceil((1.0 - (fv - reachDist)) * 47));
                for (let j = jLo; j <= jHi; j++) {
                  const vv = 1.0 - j / 47;
                  const dv = vv - fv;
                  const lw = Math.exp(-dv * dv * inv2sig2) * w;
                  if (lw < 0.02) continue;
                  if (e.team === 'home') {
                    A_thrustH[j] += endU * lw;
                    A_thrustWH[j] += lw;
                  } else {
                    A_thrustA[j] += endU * lw;
                    A_thrustWA[j] += lw;
                  }
                }
              }
            }
          }
        }

        // 2. Attack Reach (medium decay: window of last 40 seconds)
        if (age < 40.0) {
          const isShot = e.kind === 'shot' || e.type === 'Goal' || e.isGoal;
          const isCorner = e.corner || e.type === 'CornerAwarded';
          const isPass = e.kind === 'pass' && e.eu !== undefined && Number.isFinite(e.eu);
          if (isShot || isCorner || isPass) {
            const env = arWeight(age, 0.6, 5.77); // 4.0s half-life -> rel = 5.77s
            if (env >= 0.03) {
              const evVal = e.ev ?? 0.5;
              const vVal = e.v ?? 0.5;
              let fv = (e.ev !== undefined && Number.isFinite(e.ev)) ? evVal : ((e.v !== undefined && Number.isFinite(e.v)) ? vVal : 0.5);
              let endU = 0.5;
              let w = 0;
              if (isShot) {
                endU = e.team === 'home' ? 0.94 : 0.06;
                const xg = e.xg || 0.15;
                w = (0.7 + 3.4 * xg) * env;
                fv = (e.v !== undefined && Number.isFinite(e.v)) ? vVal : fv;
              } else if (isCorner) {
                endU = e.team === 'home' ? 0.94 : 0.06;
                fv = vVal < 0.5 ? 0.06 : 0.94;
                w = 1.15 * env;
              } else if (isPass) {
                const euVal = e.eu ?? 0.5;
                const deepEnd = e.team === 'home' ? euVal : (1.0 - euVal);
                const isCross = !!e.cross;
                if (isCross || deepEnd >= 0.66) {
                  endU = Math.max(0.06, Math.min(0.94, euVal));
                  w = (isCross ? 1.0 : 0.75) * Math.max(0, Math.min(1, (deepEnd - 0.5) / 0.5)) * env;
                }
              }

              if (w >= 0.03) {
                const sigma = 0.13;
                const reachDist = sigma * 3.0;
                const inv2sig2 = 1.0 / (2.0 * sigma * sigma);
                const jLo = Math.max(0, Math.floor((1.0 - (fv + reachDist)) * 47));
                const jHi = Math.min(47, Math.ceil((1.0 - (fv - reachDist)) * 47));
                for (let j = jLo; j <= jHi; j++) {
                  const vv = 1.0 - j / 47;
                  const dv = vv - fv;
                  const lw = Math.exp(-dv * dv * inv2sig2) * w;
                  if (lw < 0.02) continue;
                  if (e.team === 'home') {
                    A_reachH[j] += endU * lw;
                    A_reachWH[j] += lw;
                  } else {
                    A_reachA[j] += endU * lw;
                    A_reachWA[j] += lw;
                  }
                }
              }
            }
          }
        }
      }

      const tempFront = new Float32Array(48);
      const lo = 0.06;
      const hi = 0.94;

      for (let j = 0; j < 48; j++) {
        const vv = j / 47;
        const dv = vv - smoothBallRef.current.v;
        const lw = Math.exp(-dv * dv / (2 * 0.16 * 0.16));
        const channelBallFront = THREE.MathUtils.lerp(0.5, smoothBallRef.current.u, lw);
        
        let targetFrontVal = THREE.MathUtils.lerp(channelBallFront, momFront, 0.75); // 75% backbone
        
        // Goal flood integration: push seam all the way
        if (floodIntensity > 0 && lastGoalEvent) {
          const dest = lastGoalEvent.team === "home" ? 0.95 : 0.05;
          targetFrontVal = THREE.MathUtils.lerp(targetFrontVal, dest, floodIntensity);
        }
        
        targetFrontVal = Math.max(lo, Math.min(hi, targetFrontVal));
        let fr = targetFrontVal;

        // Combine Attack Reach
        const wH = A_reachWH[j];
        const wA = A_reachWA[j];
        const iH = wH > 1e-4 ? 1 - Math.exp(-wH) : 0;
        const iA = wA > 1e-4 ? 1 - Math.exp(-wA) : 0;
        const netReach = iH - iA; // >0 Home dominate, <0 Away dominate
        
        const REACH_MAX_PULL = 0.42;
        if (netReach > 0.02 && wH > 1e-4) {
          const target = A_reachH[j] / wH;
          if (target > fr) {
            fr = fr + Math.min(target - fr, REACH_MAX_PULL) * netReach;
          }
        } else if (netReach < -0.02 && wA > 1e-4) {
          const target = A_reachA[j] / wA;
          if (target < fr) {
            fr = fr - Math.min(fr - target, REACH_MAX_PULL) * (-netReach);
          }
        }

        // Combine Thrust Fingers
        const THRUST_MAX_PULL = 0.72;
        if (A_thrustWH[j] > 1e-4) {
          const endU = A_thrustH[j] / A_thrustWH[j];
          const conf = Math.max(0, Math.min(1, A_thrustWH[j]));
          const target = THREE.MathUtils.lerp(fr, endU, conf);
          if (target > fr) {
            fr = Math.min(target, fr + THRUST_MAX_PULL);
          }
        }
        if (A_thrustWA[j] > 1e-4) {
          const endU = A_thrustA[j] / A_thrustWA[j];
          const conf = Math.max(0, Math.min(1, A_thrustWA[j]));
          const target = THREE.MathUtils.lerp(fr, endU, conf);
          if (target < fr) {
            fr = Math.max(target, fr - THRUST_MAX_PULL);
          }
        }

        // Attack Reach Hold (prevent opponent thrust from denting owned territory)
        if (netReach > 0.02 && wH > 1e-4) {
          const rH = A_reachH[j] / wH;
          const hold = THREE.MathUtils.lerp(targetFrontVal, Math.min(rH, hi), netReach);
          if (fr < hold) fr = hold;
        } else if (netReach < -0.02 && wA > 1e-4) {
          const rA = A_reachA[j] / wA;
          const hold = THREE.MathUtils.lerp(targetFrontVal, Math.max(rA, lo), -netReach);
          if (fr > hold) fr = hold;
        }

        fr = Math.max(lo, Math.min(hi, fr));
        frontRef.current[j] += (fr - frontRef.current[j]) * 0.12;
        tempFront[j] = frontRef.current[j];
      }
      
      // Lateral smoothing
      for (let r = 0; r < 2; r++) {
        const temp = new Float32Array(tempFront);
        for (let j = 0; j < 48; j++) {
          let sum = temp[j];
          let count = 1;
          if (j > 0) { sum += temp[j - 1]; count++; }
          if (j < 47) { sum += temp[j + 1]; count++; }
          tempFront[j] = sum / count;
        }
      }
      
      // Write back to ref
      for (let j = 0; j < 48; j++) {
        frontRef.current[j] = tempFront[j];
      }

      // Calculate the morphed front
      const activeFront = new Float32Array(VY);
      for (let j = 0; j < VY; j++) {
        const v = j / GY; // ranges 0..1
        const zIdx = Math.max(0, Math.min(47, Math.floor(v * 48)));
        activeFront[j] = frontRef.current[zIdx];
      }

      // Easing possession top-sheet choice
      const centerFrontU = activeFront[Math.floor(VY / 2)];
      const topTargetHome = centerFrontU >= 0.5 ? 1.0 : 0.0;
      seamTopHomeVal += (topTargetHome - seamTopHomeVal) * 0.08;
      const seamTopHome = seamTopHomeVal;

      // Dynamic seam fold height based on attacking pressure
      const homeLipHVal = 0.08 + (homePress / 15.0) * 0.22;
      const awayLipHVal = 0.08 + (awayPress / 15.0) * 0.22;

      // Update uniforms
      const intensity = Math.min(1.0, (homePress + awayPress) / 20.0 + allSpires.length * 0.15);

      homeUniforms.uTime.value = visualTime;
      homeUniforms.uCurrentTime.value = activeT;
      homeUniforms.uIntensity.value = intensity;
      homeUniforms.uTop.value = seamTopHome;
      homeUniforms.uLipH.value = homeLipHVal;
      homeUniforms.uFlood.value = floodIntensity;
      if (lastGoalEvent) {
        homeUniforms.uFloodTeam.value.set(lastGoalEvent.team === "home" ? homeColor : awayColor);
      }
      homeUniforms.uFloodFade.value = (lastGoalEvent && lastGoalEvent.team !== "home") ? floodIntensity : 0.0;

      awayUniforms.uTime.value = visualTime;
      awayUniforms.uCurrentTime.value = activeT;
      awayUniforms.uIntensity.value = intensity;
      awayUniforms.uTop.value = 1.0 - seamTopHome;
      awayUniforms.uLipH.value = awayLipHVal;
      awayUniforms.uFlood.value = floodIntensity;
      if (lastGoalEvent) {
        awayUniforms.uFloodTeam.value.set(lastGoalEvent.team === "home" ? homeColor : awayColor);
      }
      awayUniforms.uFloodFade.value = (lastGoalEvent && lastGoalEvent.team === "home") ? floodIntensity : 0.0;

      homeWallUniforms.uTime.value = visualTime;
      homeWallUniforms.uCurrentTime.value = activeT;
      homeWallUniforms.uIntensity.value = intensity;
      homeWallUniforms.uTop.value = seamTopHome;
      homeWallUniforms.uLipH.value = homeLipHVal;
      homeWallUniforms.uFlood.value = floodIntensity;
      if (lastGoalEvent) {
        homeWallUniforms.uFloodTeam.value.set(lastGoalEvent.team === "home" ? homeColor : awayColor);
      }
      homeWallUniforms.uFloodFade.value = (lastGoalEvent && lastGoalEvent.team !== "home") ? floodIntensity : 0.0;

      awayWallUniforms.uTime.value = visualTime;
      awayWallUniforms.uCurrentTime.value = activeT;
      awayWallUniforms.uIntensity.value = intensity;
      awayWallUniforms.uTop.value = 1.0 - seamTopHome;
      awayWallUniforms.uLipH.value = awayLipHVal;
      awayWallUniforms.uFlood.value = floodIntensity;
      if (lastGoalEvent) {
        awayWallUniforms.uFloodTeam.value.set(lastGoalEvent.team === "home" ? homeColor : awayColor);
      }
      awayWallUniforms.uFloodFade.value = (lastGoalEvent && lastGoalEvent.team === "home") ? floodIntensity : 0.0;

      // Populate grid data texture buffers on CPU
      const seamWidthVal = Math.max(0.06 * 2.2, 0.09); // uLap = 0.06

      hDataHome.fill(0);
      aDataHome.fill(0.5);
      cDataHome.fill(0);

      hDataAway.fill(0);
      aDataAway.fill(0.5);
      cDataAway.fill(0);

      for (let j = 0; j < VY; j++) {
        const v = j / GY;
        const z = (0.5 - v) * WORLD_Z;
        const frontU = activeFront[j];
        const frontierX = (frontU - 0.5) * WORLD_X;

        for (let i = 0; i < VX; i++) {
          const u = i / GX;
          const x = (u - 0.5) * WORLD_X;
          const idx = j * VX + i;

          // Base low-frequency organic cloth folds (wrinkles)
          // As momentum changes, waves travel along the pitch representing compression
          const momentumDiff = homePress - awayPress;
          const compressionOffset = visualTime * 0.12 - momentumDiff * 0.08;
          
          // Large fabric folds along the Z/depth axis (making folds run across the width of the field)
          const fabricFold1 = Math.sin(x * 0.42 + compressionOffset) * 0.16;
          const fabricFold2 = Math.cos(z * 0.32 + visualTime * 0.08) * 0.08;
          
          // Medium-frequency organic noise for fabric irregularity
          const fabricNoise = fbm2d(x * 0.35 + visualTime * 0.08, z * 0.35, 2) * 0.12;
          
          const baseNoise = fabricFold1 + fabricFold2 + fabricNoise;

          // Seam lift
          let seamLift = 0;
          const distSeam = Math.abs(x - frontierX);
          if (distSeam < 1.2) {
            const f = distSeam / 1.2;
            seamLift = 0.15 * f * (1.0 - f);
          }
          // Spire deformations (shared and max-combined to prevent height stacking and cliffs)
          let spiresSum = 0;
          allSpires.forEach(spire => {
            const dSq = (x - spire.x) ** 2 + (z - spire.z) ** 2;
            const val = spire.height * Math.exp(-dSq / spire.radiusSq);
            spiresSum = Math.max(spiresSum, val);
          });
          // Dominance Ridges
          const hx = 2.0 + Math.min(3.8, homePress * 0.08);
          const hRadSq = 14.0 + homePress * 0.8;
          const hHVal = Math.min(2.8, homePress * 0.16);
          const hDistXSq = (x - hx) ** 2;
          const homeRidge = hHVal * Math.exp(-hDistXSq / hRadSq) * (0.85 + 0.15 * Math.sin(z * 0.4));

          const ax = -2.0 - Math.min(3.8, awayPress * 0.08);
          const aRadSq = 14.0 + awayPress * 0.8;
          const aHVal = Math.min(2.8, awayPress * 0.16);
          const aDistXSq = (x - ax) ** 2;
          const awayRidge = aHVal * Math.exp(-aDistXSq / aRadSq) * (0.85 + 0.15 * Math.sin(z * 0.4));

          const tapX = Math.max(0, Math.min(1.0, (WORLD_X / 2 - Math.abs(x)) / 0.8));
          const tapZ = Math.max(0, Math.min(1.0, (WORLD_Z / 2 - Math.abs(z)) / 0.8));
          const taper = (tapX * tapX * (3.0 - 2.0 * tapX)) * (tapZ * tapZ * (3.0 - 2.0 * tapZ));
          // Calculate separate team-colored pressure domes representing dominance (high baseline, breathing, horizontal skew)
          let homeDome = 0;
          if (u < frontU && frontU > 0.05) {
            const breathe = 0.04 * Math.sin(visualTime * 1.15 + x * 0.12);
            const homeHFactor = momIdx >= 0 
              ? (0.28 + breathe) + momIdx * 0.55 
              : Math.max(0.04, (0.28 + breathe) * (1.0 + momIdx * 0.85));
            // Skew Home wave horizontally towards seam when Home has positive momentum
            const homeSkew = momIdx >= 0 ? 1.0 - momIdx * 0.45 : 1.0 - momIdx * 0.25;
            homeDome = homeHFactor * Math.sin(Math.pow(u / frontU, homeSkew) * Math.PI) * Math.sin(v * Math.PI);
          }

          let awayDome = 0;
          if (u > frontU && frontU < 0.95) {
            const breathe = 0.04 * Math.sin(visualTime * 1.15 + x * 0.12);
            const awayHFactor = momIdx <= 0 
              ? (0.28 + breathe) - momIdx * 0.55 
              : Math.max(0.04, (0.28 + breathe) * (1.0 - momIdx * 0.85));
            // Skew Away wave horizontally towards seam when Away has negative momentum
            const awaySkew = momIdx <= 0 ? 1.0 + momIdx * 0.45 : 1.0 + momIdx * 0.25;
            const uNormAway = (1.0 - u) / (1.0 - frontU);
            awayDome = awayHFactor * Math.sin(Math.pow(uNormAway, awaySkew) * Math.PI) * Math.sin(v * Math.PI);
          }

          // Calculate team heights (sharing spiresSum outside taper to let goal line spires rise fully)
          let hH = (baseNoise + seamLift + homeDome) * taper + spiresSum;
          let hA = (baseNoise + seamLift + awayDome) * taper + spiresSum;

          let fVal = frontU;

          // Seam-band under-sheet clamp
          const du = u - fVal;
          const nearSeam = Math.max(0, Math.min(1, 1 - Math.abs(du) / seamWidthVal));
          if (nearSeam > 0) {
            const margin = 0.05;
            if (seamTopHome >= 0.5) {
              const cap = hH - margin;
              if (hA > cap) hA = THREE.MathUtils.lerp(hA, cap, nearSeam);
            } else {
              const cap = hA - margin;
              if (hH > cap) hH = THREE.MathUtils.lerp(hH, cap, nearSeam);
            }
          }

          hDataHome[idx] = hH;
          hDataAway[idx] = hA;
          aDataHome[idx] = fVal;
          aDataAway[idx] = fVal;
          cDataHome[idx] = 0;
          cDataAway[idx] = 0;
        }
      }

      hTexHome.needsUpdate = true;
      aTexHome.needsUpdate = true;
      cTexHome.needsUpdate = true;
      hTexAway.needsUpdate = true;
      aTexAway.needsUpdate = true;
      cTexAway.needsUpdate = true;

      // Fading lightning bolt
      if (lightningFlashRef.current > 0) {
        lightningFlashRef.current -= delta * 3.0; // rapid decay
        if (lightningFlashRef.current < 0) lightningFlashRef.current = 0;
        lightningMaterial.opacity = lightningFlashRef.current;
      }

      // Apply dynamic visual style switches inside animation frame
      const currentStyle = visualStyleRef.current;
      if ((tick as any)._lastAppliedStyle !== currentStyle) {
        (tick as any)._lastAppliedStyle = currentStyle;
        applyStyleChanges(currentStyle);
      }

      // Raycasting to find hovered events (shots/goals)
      let closestEv: VisualEvent | null = null;
      if (mouseRef.current.x > -100 && cameraRef.current) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouseRef.current, cameraRef.current);
        const pitchPlaneHelper = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        
        if (raycaster.ray.intersectPlane(pitchPlaneHelper, intersectPoint)) {
          let minDist = 0.45;
          const shots = visualEventsRef.current.filter(ev => ev.kind === "shot" || ev.type === "shot" || ev.isGoal);
          
          for (const ev of shots) {
            const wX = (ev.u - 0.5) * WORLD_X;
            const wZ = (0.5 - ev.v) * WORLD_Z;
            const dist = Math.sqrt((intersectPoint.x - wX)**2 + (intersectPoint.z - wZ)**2);
            if (dist < minDist) {
              minDist = dist;
              closestEv = ev;
            }
          }
        }
      }

      const hoveredIdx = closestEv ? shotsList.indexOf(closestEv) : -1;
      homeUniforms.uHoveredShotIdx.value = hoveredIdx;
      awayUniforms.uHoveredShotIdx.value = hoveredIdx;

      // Update 3D event markers for chances
      shotMarkers.forEach(({ ev, meshCyber, meshTactical, meshHolo, ring, u, v }, idx) => {
        const age = activeT - ev.t;
        const xg = ev.xg || 0.15;
        const isGoal = ev.isGoal;
        const isHovered = (idx === hoveredIdx);

        // Find Y position corresponding to heightmap coordinate
        const gridI = Math.min(GX, Math.max(0, Math.round(u * GX)));
        const gridJ = Math.min(GY, Math.max(0, Math.round(v * GY)));
        const hIdx = gridJ * (GX + 1) + gridI;
        const terrainY = (ev.team === "home") 
          ? hDataHome[hIdx] 
          : hDataAway[hIdx];

        if (age < 0) {
          meshCyber.visible = false;
          meshTactical.visible = false;
          meshHolo.visible = false;
          ring.visible = false;
          return;
        }

        ring.visible = (currentStyle !== 'glass'); // Hide rings in holographic mode

        // Set visibility based on active style
        meshCyber.visible = (currentStyle === 'cyber');
        meshTactical.visible = (currentStyle === 'tactical');
        meshHolo.visible = (currentStyle === 'glass');

        // Custom hex colors (Home is Blue, Away is Red/Coral, Goal is Golden yellow)
        const homeColorHex = 0x2563eb;
        const awayColorHex = 0xef4444;
        const goalColorHex = 0xffd166;
        const evTeamColor = (ev.team === "home") 
          ? homeColorHex 
          : awayColorHex;

        if (currentStyle === 'cyber') {
          // Analyst Mode: Hexagonal Columns (Data Pillars)
          const targetColor = isGoal ? goalColorHex : evTeamColor;
          const mat = meshCyber.material as THREE.MeshStandardMaterial;
          mat.color.setHex(targetColor);
          mat.emissive.setHex(targetColor);
          mat.emissiveIntensity = isHovered ? 2.5 : 1.0;
          mat.roughness = 0.15;
          mat.metalness = 0.85;
          mat.opacity = 0.95;
          
          const baseH = 0.35 + xg * 0.55;
          const currentScale = isHovered ? 1.4 : 1.0;
          meshCyber.scale.set(currentScale, currentScale * baseH * 2.5, currentScale);
          meshCyber.position.y = terrainY + (baseH * currentScale) / 2.0;

          // Rotate Hex column slowly for visual interest
          meshCyber.rotation.y = visualTime * 0.8 + idx;
          meshCyber.rotation.x = 0;
          meshCyber.rotation.z = 0;

          ring.position.y = terrainY + 0.02;
          (ring.material as THREE.MeshBasicMaterial).color.setHex(targetColor);
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.6 * (age < 6.0 ? (1.0 - (age % 1.0)) : 0.4);
          const ringScale = (isGoal ? 1.8 : 1.2) * (age < 6.0 ? (1.0 + 0.5 * Math.sin(visualTime * 8.0)) : 1.0) * (isHovered ? 1.3 : 1.0);
          ring.scale.set(ringScale, ringScale, 1.0);
          
        } else if (currentStyle === 'tactical') {
          // Tactical Chalkboard Mode: 3D Chalk "X" and "O"
          const targetColor = isGoal 
            ? 0xffd166 // goal gold
            : (ev.team === "home" ? 0x60a5fa : 0xf87171); // chalk red/blue

          const currentScale = isHovered ? 1.4 : 1.0;
          const baseScale = isGoal ? 1.1 : (0.8 + xg * 0.4);
          
          if (isGoal) {
            meshTactical.scale.set(baseScale * currentScale, baseScale * currentScale, 1.0);
            meshTactical.position.y = terrainY + 0.04;
            const mat = (meshTactical as THREE.Mesh).material as THREE.MeshStandardMaterial;
            mat.color.setHex(targetColor);
          } else {
            meshTactical.scale.set(baseScale * currentScale, baseScale * currentScale, baseScale * currentScale);
            meshTactical.position.y = terrainY + 0.04;
            meshTactical.children.forEach(child => {
              const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
              mat.color.setHex(targetColor);
            });
          }

          meshTactical.rotation.y = 0;
          meshTactical.rotation.x = 0;
          meshTactical.rotation.z = 0;

          // Subtle chalk outline footprint
          ring.position.y = terrainY + 0.01;
          (ring.material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.25;
          const ringScale = (isGoal ? 1.4 : 0.95) * (isHovered ? 1.3 : 1.0);
          ring.scale.set(ringScale, ringScale, 1.0);
          
        } else if (currentStyle === 'glass') {
          // Holographic Mode: Spinning Wireframe Pyramids
          const targetColor = (ev.team === "home" || ev.team === "home_defense" || ev.team === "home_attack") 
            ? 0x00ffff // neon cyan
            : 0xff00ff; // neon magenta

          const mat = meshHolo.material as THREE.MeshBasicMaterial;
          mat.color.setHex(targetColor);
          
          const floatOffset = 0.4 + 0.08 * Math.sin(visualTime * 2.5 + idx);
          meshHolo.position.y = terrainY + floatOffset;
          meshHolo.rotation.y = visualTime * 1.5 + idx;
          meshHolo.rotation.x = visualTime * 0.6;
          meshHolo.rotation.z = 0;
          
          const baseScale = isGoal ? 1.5 : (0.9 + xg * 0.8);
          const currentScale = baseScale * (isHovered ? 1.4 : 1.0);
          meshHolo.scale.set(currentScale, currentScale, currentScale);
        }
      });

      if (closestEv !== hoveredEventRef.current) {
        hoveredEventRef.current = closestEv;
        setHoveredEvent(closestEv);
        if (mountRef.current) {
          mountRef.current.style.cursor = closestEv ? "pointer" : "default";
        }
      }

      if (closestEv && cameraRef.current) {
        const ev = closestEv;
        const wX = (ev.u - 0.5) * WORLD_X;
        const wZ = (0.5 - ev.v) * WORLD_Z;
        
        const projVec = new THREE.Vector3(wX, 0.15, wZ);
        projVec.project(cameraRef.current);
        
        const sX = (projVec.x * 0.5 + 0.5) * width;
        const sY = (-(projVec.y * 0.5) + 0.5) * height;
        
        const tx = Math.max(130, Math.min(width - 130, sX));
        const ty = Math.max(120, Math.min(height - 15, sY));
        
        currentXgLabelPos = null;
        
        setHoveredTooltip({
          playerName: `${ev.name || ""} ${ev.surname || "Player"}`.trim(),
          minute: ev.dispMin || Math.floor(ev.t / 60),
          xg: ev.xg || 0.0,
          team: ev.team,
          outcome: ev.outcome,
          fotmobId: ev.fotmobId,
          x: tx,
          y: ty
        });
      } else {
        setHoveredTooltip(null);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    tick();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      
      // Dispose meshes and geometries
      if (homeGeom) homeGeom.dispose();
      if (awayGeom) awayGeom.dispose();
      if (homeWallGeom) homeWallGeom.dispose();
      if (awayWallGeom) awayWallGeom.dispose();
      if (pitchMat) pitchMat.dispose();
      if (skyTex) skyTex.dispose();

      if (hexColumnGeom) hexColumnGeom.dispose();
      if (torusGeom) torusGeom.dispose();
      if (crossBarGeom) crossBarGeom.dispose();
      if (pyramidGeom) pyramidGeom.dispose();
      if (ringGeom) ringGeom.dispose();
      
      if (homeHoloMat) homeHoloMat.dispose();
      if (awayHoloMat) awayHoloMat.dispose();
      if (homeWallHoloMat) homeWallHoloMat.dispose();
      if (awayWallHoloMat) awayWallHoloMat.dispose();
      
      scene.remove(shotMarkersGroup);
      
      // Dispose stardust particle system resources
      if (particlesGeomRef.current) particlesGeomRef.current.dispose();
      if (particleMaterialRef.current) particleMaterialRef.current.dispose();

      // Dispose DataTextures
      if (hTexHome) hTexHome.dispose();
      if (aTexHome) aTexHome.dispose();
      if (cTexHome) cTexHome.dispose();
      if (hTexAway) hTexAway.dispose();
      if (aTexAway) aTexAway.dispose();
      if (cTexAway) cTexAway.dispose();
      
      if (rendererRef.current && rendererRef.current.domElement) {
        const domEl = rendererRef.current.domElement;
        domEl.removeEventListener("mousemove", handleCanvasMouseMove);
        domEl.removeEventListener("mouseleave", handleCanvasMouseLeave);
        domEl.removeEventListener("click", handleCanvasClick);
        domEl.remove();
      }
    };
  }, [loading]);

  // Formatted match time string helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "#f1eff8", minHeight: "calc(100vh - 120px)", fontFamily: "var(--font-outfit)" }}>
      {/* 1. Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button 
            onClick={() => router.push("/dashboard")}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "0px",
              width: "42px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transform: "skewX(-12deg)",
              transition: "all 0.2s"
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = "rgba(34, 197, 94, 0.15)";
              e.currentTarget.style.borderColor = "var(--color-accent)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            }}
          >
            <span style={{ display: "flex", transform: "skewX(12deg)" }}>
              <ArrowLeft size={18} />
            </span>
          </button>
          <div>
            <div style={{ fontSize: "11px", fontFamily: "monospace", letterSpacing: "2.5px", color: "var(--color-accent)", textTransform: "uppercase" }}>
              <span style={{ color: "var(--color-accent)", marginRight: "4px", fontWeight: 900 }}>/</span> 3D Terrain Data Portrait
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 900, margin: "2px 0 0", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ textTransform: "uppercase" }}>{homeTeam}</span>
              <span style={{ 
                background: "rgba(34, 197, 94, 0.1)", 
                border: "1px solid var(--color-accent)", 
                padding: "2px 10px", 
                color: homeColor,
                fontFamily: "monospace",
                fontWeight: 800,
                transform: "skewX(-12deg)",
                display: "inline-flex"
              }}>
                <span style={{ transform: "skewX(12deg)" }}>{currentHomeScore}</span>
              </span>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>vs</span>
              <span style={{ 
                background: "rgba(34, 197, 94, 0.1)", 
                border: "1px solid var(--color-accent)", 
                padding: "2px 10px", 
                color: awayColor,
                fontFamily: "monospace",
                fontWeight: 800,
                transform: "skewX(-12deg)",
                display: "inline-flex"
              }}>
                <span style={{ transform: "skewX(12deg)" }}>{currentAwayScore}</span>
              </span>
              <span style={{ textTransform: "uppercase" }}>{awayTeam}</span>
            </h2>
          </div>
        </div>

        <button 
          onClick={() => setShowExplainer(!showExplainer)}
          style={{
            background: "transparent",
            border: "1px solid var(--color-accent)",
            color: "var(--color-accent)",
            padding: "8px 18px",
            borderRadius: "0px",
            fontSize: "12px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transform: "skewX(-12deg)",
            transition: "all 0.2s"
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = "var(--color-accent-dim)";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(34, 197, 94, 0.2)";
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px", transform: "skewX(12deg)" }}>
            <HelpCircle size={15} />
            How to Read It
          </span>
        </button>
      </div>

      {/* 2. Unified Immersive WebGL Sandbox Container */}
      <div style={{ 
        position: "relative", 
        width: "100%", 
        height: "calc(100vh - 220px)", 
        minHeight: "680px", 
        background: "radial-gradient(circle at center, #100f24 0%, #06050b 100%)", 
        border: "1px solid rgba(255,255,255,0.06)", 
        borderTop: "3px solid var(--color-accent)",
        borderRadius: "0px", 
        overflow: "hidden" 
      }}>
        {/* Style Switcher Floating Panel */}
        <div style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          background: "rgba(6, 5, 11, 0.8)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "10px",
          borderRadius: "0px",
          fontFamily: "var(--font-outfit)"
        }}>
          <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px", fontWeight: 700 }}>
            VISUAL STYLE MODE
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { id: 'cyber', label: 'NEON CYBER' },
              { id: 'tactical', label: 'TACTICAL SLATE' },
              { id: 'glass', label: 'HOLO GLASS' }
            ].map(styleOpt => {
              const active = visualStyle === styleOpt.id;
              return (
                <button
                  key={styleOpt.id}
                  onClick={() => setVisualStyle(styleOpt.id as any)}
                  style={{
                    background: active ? "var(--color-accent)" : "rgba(255,255,255,0.04)",
                    border: "1px solid",
                    borderColor: active ? "var(--color-accent)" : "rgba(255,255,255,0.15)",
                    color: active ? "#06050b" : "rgba(255,255,255,0.8)",
                    padding: "6px 12px",
                    fontSize: "10px",
                    fontWeight: 900,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "monospace",
                    letterSpacing: "0.5px"
                  }}
                  onMouseOver={e => {
                    if (!active) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  onMouseOut={e => {
                    if (!active) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                    }
                  }}
                >
                  {styleOpt.label}
                </button>
              );
            })}
          </div>
        </div>
        {webglError ? (
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            background: "#06050b", 
            zIndex: 10,
            padding: "24px",
            textAlign: "center"
          }}>
            <span style={{ fontSize: "28px", marginBottom: "16px" }}>⚠️</span>
            <span style={{ fontSize: "14px", color: "#f87171", fontWeight: 800, textTransform: "uppercase", fontFamily: "monospace", letterSpacing: "1px" }}>
              WebGL Initialization Failed
            </span>
            <p style={{ marginTop: "12px", fontSize: "12px", color: "rgba(255,255,255,0.6)", maxWidth: "420px", lineHeight: "1.6", margin: "12px 0 0 0" }}>
              Could not create a WebGL context. Please make sure WebGL is enabled in your browser settings and hardware acceleration is active.
            </p>
          </div>
        ) : loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#06050b", zIndex: 10 }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid rgba(34, 197, 94, 0.15)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <span style={{ marginTop: "14px", fontSize: "11px", color: "var(--color-accent)", fontFamily: "monospace", letterSpacing: "1px", textTransform: "uppercase" }}>Retrieving Match Coordinates...</span>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Floating xG labels projection overlay */}
        {activeXgLabel && (
          <div className="glass-panel" style={{
            position: "absolute",
            left: `${activeXgLabel.x}px`,
            top: `${activeXgLabel.y}px`,
            transform: "translate(-50%, -100%)",
            background: "#080712",
            border: "1px solid rgba(255, 209, 102, 0.3)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            padding: "4px 8px",
            borderRadius: "0px",
            fontSize: "10px",
            fontFamily: "monospace",
            color: "#ffd166",
            pointerEvents: "none",
            zIndex: 2,
            whiteSpace: "nowrap"
          }}>
            {activeXgLabel.text}
          </div>
        )}

        {/* Scorers Player Card Overlay */}
        {activeGoalCard && (
          <div style={{
            position: "absolute",
            left: `${activeGoalCard.x}px`,
            top: `${activeGoalCard.y}px`,
            transform: "translate(-50%, -105%)",
            zIndex: 10,
            pointerEvents: "auto", 
            animation: "cardEntrance 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards"
          }}>
            <style>{`
              @keyframes cardEntrance {
                from { opacity: 0; transform: translate(-50%, -90%) scale(0.85); }
                to { opacity: 1; transform: translate(-50%, -105%) scale(1.0); }
              }
            `}</style>
            
            <PlayerCard
              name={activeGoalCard.playerName}
              position={activeGoalCard.position}
              flag={`https://flagcdn.com/w80/${TEAM_FLAGS[activeGoalCard.team] || "un"}.png`}
              fotmobId={activeGoalCard.fotmobId || 0}
              fps={`${activeGoalCard.xg.toFixed(2)} xG`}
              yieldVal={`${activeGoalCard.minute}' GOAL`}
              accentColor={activeGoalCard.teamColor}
            />
          </div>
        )}

        {/* Interactive Hover Tooltip */}
        {hoveredTooltip && (
          <div className="glass-panel" style={{
            position: "absolute",
            left: `${hoveredTooltip.x}px`,
            top: `${hoveredTooltip.y}px`,
            transform: "translate(-50%, -105%)",
            background: "rgba(10, 15, 30, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--color-accent)",
            borderTop: "3px solid var(--color-accent)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 15px rgba(34, 197, 94, 0.15)",
            borderRadius: "0px",
            padding: "10px 14px",
            color: "#fff",
            zIndex: 15,
            pointerEvents: "none", 
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            width: "220px",
            animation: "tooltipEntrance 0.15s ease-out forwards"
          }}>
            <style>{`
              @keyframes tooltipEntrance {
                from { opacity: 0; transform: translate(-50%, -98%) scale(0.95); }
                to { opacity: 1; transform: translate(-50%, -105%) scale(1.0); }
              }
            `}</style>
            
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {hoveredTooltip.fotmobId ? (
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${hoveredTooltip.team === "home" ? homeColor : awayColor}`,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <img 
                    src={`https://images.fotmob.com/image_resources/playerimages/${hoveredTooltip.fotmobId}.png`} 
                    alt={hoveredTooltip.playerName} 
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
              ) : null}
              
              <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                <span style={{ fontSize: "12px", fontWeight: 800 }}>{hoveredTooltip.playerName}</span>
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
                  {hoveredTooltip.team === "home" ? homeTeam : awayTeam} • {hoveredTooltip.minute}'
                </span>
              </div>
            </div>

            <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "2px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>Outcome:</span>
              <span style={{ 
                fontWeight: 700, 
                color: hoveredTooltip.outcome === "Goal" ? "#facc15" : "#fff",
                textTransform: "capitalize"
              }}>
                {hoveredTooltip.outcome === "Goal" ? "⚽ GOAL" : hoveredTooltip.outcome}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>Expected Goals (xG):</span>
              <span style={{ fontWeight: 800, color: "#ffd166", fontFamily: "monospace" }}>
                {hoveredTooltip.xg.toFixed(2)}
              </span>
            </div>

            <div style={{ 
              fontSize: "8px", 
              color: "#a9b8ff", 
              fontFamily: "monospace", 
              letterSpacing: "0.5px", 
              textAlign: "center", 
              marginTop: "4px",
              textTransform: "uppercase" 
            }}>
              🖱️ Click to jump to this play
            </div>
          </div>
        )}

        {/* 3D WebGL render mount */}
        <div ref={mountRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />

        {/* A. FLOATING GLASS STATS PANEL (Top-Left) */}
        <div className="glass-panel" style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          width: "240px",
          background: "rgba(10, 15, 30, 0.85)",
          border: "1px solid rgba(34, 197, 94, 0.25)",
          borderRadius: "0px",
          padding: "16px",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
        }}>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            transform: "skewX(-12deg)", 
            background: "var(--color-accent-dim)", 
            padding: "4px 10px", 
            borderLeft: "3px solid var(--color-accent)",
            alignSelf: "flex-start",
            marginBottom: "4px"
          }}>
            <span style={{ 
              transform: "skewX(12deg)", 
              fontSize: "9px", 
              letterSpacing: "1.5px", 
              textTransform: "uppercase", 
              color: "#fff", 
              fontWeight: 900 
            }}>
              Stats • Min {Math.floor(currentTime/60)}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
            {/* Shots */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: homeColor, fontFamily: "monospace" }}>{dynamicStats.home.shots}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Shots</span>
                <span style={{ fontWeight: 800, color: awayColor, fontFamily: "monospace" }}>{dynamicStats.away.shots}</span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${dynamicStats.home.shots + dynamicStats.away.shots > 0 ? (dynamicStats.home.shots / (dynamicStats.home.shots + dynamicStats.away.shots)) * 100 : 50}%`, background: homeColor }} />
                <div style={{ width: `${dynamicStats.home.shots + dynamicStats.away.shots > 0 ? (dynamicStats.away.shots / (dynamicStats.home.shots + dynamicStats.away.shots)) * 100 : 50}%`, background: awayColor }} />
              </div>
            </div>

            {/* xG */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: homeColor, fontFamily: "monospace" }}>{dynamicStats.home.xg.toFixed(2)}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>xG</span>
                <span style={{ fontWeight: 800, color: awayColor, fontFamily: "monospace" }}>{dynamicStats.away.xg.toFixed(2)}</span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${dynamicStats.home.xg + dynamicStats.away.xg > 0 ? (dynamicStats.home.xg / (dynamicStats.home.xg + dynamicStats.away.xg)) * 100 : 50}%`, background: homeColor }} />
                <div style={{ width: `${dynamicStats.home.xg + dynamicStats.away.xg > 0 ? (dynamicStats.away.xg / (dynamicStats.home.xg + dynamicStats.away.xg)) * 100 : 50}%`, background: awayColor }} />
              </div>
            </div>

            {/* Corners */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: homeColor, fontFamily: "monospace" }}>{dynamicStats.home.corners}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Corners</span>
                <span style={{ fontWeight: 800, color: awayColor, fontFamily: "monospace" }}>{dynamicStats.away.corners}</span>
              </div>
              <div style={{ height: "6px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${dynamicStats.home.corners + dynamicStats.away.corners > 0 ? (dynamicStats.home.corners / (dynamicStats.home.corners + dynamicStats.away.corners)) * 100 : 50}%`, background: homeColor }} />
                <div style={{ width: `${dynamicStats.home.corners + dynamicStats.away.corners > 0 ? (dynamicStats.away.corners / (dynamicStats.home.corners + dynamicStats.away.corners)) * 100 : 50}%`, background: awayColor }} />
              </div>
            </div>
          </div>
        </div>

        {/* B. FLOATING GLASS MILESTONES FEED (Top-Right) */}
        <div className="glass-panel" style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          width: "250px",
          maxHeight: "260px",
          background: "rgba(10, 15, 30, 0.85)",
          border: "1px solid rgba(111, 140, 255, 0.25)",
          borderRadius: "0px",
          padding: "14px",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)"
        }}>
          <div style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            transform: "skewX(-12deg)", 
            background: "rgba(111, 140, 255, 0.15)", 
            padding: "4px 10px", 
            borderLeft: "3px solid #6f8cff",
            alignSelf: "flex-start",
            marginBottom: "4px"
          }}>
            <span style={{ 
              transform: "skewX(12deg)", 
              fontSize: "9px", 
              letterSpacing: "1.5px", 
              textTransform: "uppercase", 
              color: "#fff", 
              fontWeight: 900 
            }}>
              Milestones Feed
            </span>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", flexGrow: 1, paddingRight: "4px" }}>
            {visualEventsRef.current.filter(e => e.isGoal || e.type === "Card").map((ev, idx) => {
              const isPast = ev.t <= currentTime;
              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    timeRef.current = ev.t;
                    setCurrentTime(ev.t);
                  }}
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    padding: "6px 10px", 
                    borderRadius: "0px", 
                    background: isPast ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                    borderLeft: isPast ? `3px solid ${ev.team === "home" ? homeColor : awayColor}` : "3px solid rgba(255,255,255,0.1)",
                    opacity: isPast ? 1 : 0.4,
                    cursor: "pointer",
                    fontSize: "11px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderLeftColor = "var(--color-accent)";
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = isPast ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)";
                    e.currentTarget.style.borderLeftColor = isPast ? (ev.team === "home" ? homeColor : awayColor) : "rgba(255,255,255,0.1)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {ev.isGoal ? (
                      <span style={{ color: "#ffd166", fontWeight: 800 }}>⚽</span>
                    ) : (
                      <div style={{ width: "8px", height: "12px", background: ev.outcome === "Red" ? "var(--color-danger)" : "var(--color-warning)", border: "1px solid rgba(0,0,0,0.3)" }} />
                    )}
                    <span style={{ fontWeight: ev.isGoal ? 800 : 600, color: isPast ? "#fff" : "rgba(255,255,255,0.4)" }}>
                      {ev.surname || "Player"} <span style={{ opacity: 0.6, fontSize: "10px", fontFamily: "monospace" }}>{ev.label}'</span>
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: "9px", 
                    color: ev.team === "home" ? homeColor : awayColor, 
                    textTransform: "uppercase", 
                    fontWeight: 900,
                    fontFamily: "monospace",
                    background: "rgba(255,255,255,0.03)",
                    padding: "2px 6px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    transform: "skewX(-12deg)",
                    display: "inline-block"
                  }}>
                    <span style={{ display: "block", transform: "skewX(12deg)" }}>
                      {ev.team === "home" ? homeTeam.substring(0, 3) : awayTeam.substring(0, 3)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* C. SIMPLIFIED FLOATING CONTROLS (Bottom) */}
        <div style={{
          position: "absolute",
          bottom: "30px",
          left: "30px",
          right: "30px",
          zIndex: 4,
          display: "flex",
          alignItems: "center",
          gap: "24px"
        }}>
          {/* Circular Play/Pause Button */}
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: "#ffffff",
              border: "none",
              borderRadius: "50%",
              width: "48px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              transition: "transform 0.2s",
              flexShrink: 0
            }}
            onMouseOver={e => e.currentTarget.style.transform = "scale(1.08)"}
            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {isPlaying ? (
              <Pause size={18} fill="#06050b" stroke="#06050b" />
            ) : (
              <Play size={18} fill="#06050b" stroke="#06050b" style={{ marginLeft: "3px" }} />
            )}
          </button>

          {/* Transparent Seismograph Scrubber */}
          <div style={{ position: "relative", flexGrow: 1, height: "48px" }}>
            <canvas 
              ref={seismographRef} 
              onMouseDown={handleSeismographMouseDown}
              onMouseMove={handleSeismographMouseMove}
              onMouseUp={handleSeismographMouseUp}
              onMouseLeave={handleSeismographMouseUp}
              onTouchStart={handleSeismographTouchStart}
              onTouchMove={handleSeismographTouchMove}
              onTouchEnd={handleSeismographMouseUp}
              style={{ width: "100%", height: "100%", display: "block", cursor: "ew-resize" }} 
            />
            {/* Playhead vertical marker */}
            <div style={{
              position: "absolute",
              left: `${(currentTime / duration) * 100}%`,
              top: 0,
              bottom: 0,
              width: "1.5px",
              background: "#ffffff",
              pointerEvents: "none",
              zIndex: 3
            }} />
          </div>
        </div>

        {/* Manual/Interpretation explainer sheet overlay */}
        {showExplainer && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(6, 5, 11, 0.96)",
            padding: "36px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            overflowY: "auto",
            zIndex: 10,
            animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: 0, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                <span style={{ color: "var(--color-accent)", marginRight: "8px" }}>/</span> Interpretation Manual
              </h3>
              <button 
                onClick={() => setShowExplainer(false)}
                style={{
                  background: "none",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#f1eff8",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transform: "skewX(-12deg)",
                  transition: "all 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = "var(--color-danger)"}
                onMouseOut={e => e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)"}
              >
                <span style={{ transform: "skewX(12deg)", fontWeight: 800 }}>✕</span>
              </button>
            </div>

            <div style={{ height: "1px", background: "linear-gradient(90deg, var(--color-accent) 0%, rgba(255,255,255,0.06) 100%)", margin: "4px 0 16px" }}></div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", fontSize: "13.5px", lineHeight: "1.6", color: "rgba(255,255,255,0.7)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ 
                    background: "rgba(34, 197, 94, 0.15)", 
                    color: "var(--color-accent)", 
                    width: "24px", 
                    height: "24px", 
                    transform: "skewX(-12deg)", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: "11px", 
                    fontWeight: 900 
                  }}>
                    <span style={{ transform: "skewX(12deg)" }}>1</span>
                  </span>
                  <strong style={{ color: "#fff", fontSize: "14px" }}>The Territory Blankets</strong>
                </div>
                <p style={{ color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  The pitch is covered by two colored sheets representing each team (Blue for Home, Red/Orange for Away). 
                  The shifting dividing seam (the frontier boundary) shows the flow of play: 
                  who is dominating possession and pressing deeper into the opponent half at any given minute.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ 
                    background: "rgba(34, 197, 94, 0.15)", 
                    color: "var(--color-accent)", 
                    width: "24px", 
                    height: "24px", 
                    transform: "skewX(-12deg)", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: "11px", 
                    fontWeight: 900 
                  }}>
                    <span style={{ transform: "skewX(12deg)" }}>2</span>
                  </span>
                  <strong style={{ color: "#fff", fontSize: "14px" }}>Expected Goals (xG) Spires</strong>
                </div>
                <p style={{ color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  Every shot is mapped as a sharp, pointed needle spire rising directly from the coordinate of the shot. 
                  The height of the spire is determined by its **Expected Goals (xG)** value. 
                  Goals form tall spires with glowing white rings around their bases.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ 
                    background: "rgba(34, 197, 94, 0.15)", 
                    color: "var(--color-accent)", 
                    width: "24px", 
                    height: "24px", 
                    transform: "skewX(-12deg)", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: "11px", 
                    fontWeight: 900 
                  }}>
                    <span style={{ transform: "skewX(12deg)" }}>3</span>
                  </span>
                  <strong style={{ color: "#fff", fontSize: "14px" }}>Possession Tide Folds</strong>
                </div>
                <p style={{ color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  Sustained pressure or high-danger attacks create soft, billowy wave folds on the respective team's blanket. 
                  The texture utilizes a procedurally generated hexagonal microgrid, giving it the premium feeling of a physical clay model.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ 
                    background: "rgba(34, 197, 94, 0.15)", 
                    color: "var(--color-accent)", 
                    width: "24px", 
                    height: "24px", 
                    transform: "skewX(-12deg)", 
                    display: "inline-flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    fontSize: "11px", 
                    fontWeight: 900 
                  }}>
                    <span style={{ transform: "skewX(12deg)" }}>4</span>
                  </span>
                  <strong style={{ color: "#fff", fontSize: "14px" }}>Goal Floods & Lightning</strong>
                </div>
                <p style={{ color: "rgba(255,255,255,0.6)", margin: 0 }}>
                  When a goal is scored, the entire slab temporarily floods with the kit color of the scoring team, 
                  symbolizing their dominance. Red cards and goals trigger procedural lightning strikes at the coordinate of the event.
                </p>
              </div>
            </div>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}

