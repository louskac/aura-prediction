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
  
  // Visualizer states
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(15); // multiplier
  const [currentTime, setCurrentTime] = useState(0); 
  const [duration, setDuration] = useState(5400); // 90 mins in seconds
  const [momentumData, setMomentumData] = useState<MomentumPoint[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [activeXgLabel, setActiveXgLabel] = useState<{ text: string; x: number; y: number } | null>(null);
  
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
  const frontRef = useRef<Float32Array>(new Float32Array(48).fill(0.5));
  const smoothBallRef = useRef({ u: 0.5, v: 0.5 });
  const skyLeanEasedRef = useRef(0);
  
  const momentumDataRef = useRef<MomentumPoint[]>([]);
  const durationRef = useRef(5400);

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
        const response = await fetch(`/api/scores/${fixtureId}`);
        const result = await response.json();
        
        if (result.success && result.timeline) {
          visualEventsRef.current = result.timeline;
          setMomentumData(result.momentum || []);
          setMatchStats(result.stats || null);
          
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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

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

    const pitchPlane = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_X, WORLD_Z, 1, 1), pitchMat);
    pitchPlane.position.y = 0.0;
    pitchPlane.rotation.x = -Math.PI / 2;
    pitchPlane.renderOrder = 0;
    scene.add(pitchPlane);

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
      uTex: { value: 0.86 },
      uGlowCol: { value: new THREE.Color('#f0d8c1') },
      uEmber: { value: 1.0 },
      uIntensity: { value: 0 },
      uDetail: { value: 1.1 },
      uDetailScale: { value: 2.58 },
      uPattern: { value: 4.0 },
      uTime: { value: 0 },
      uGlow: { value: 1.0 },
      uFlood: { value: 0.0 },
      uFloodTeam: { value: new THREE.Color(homeColor) },
      uFloodFade: { value: 0.0 },
      uCorner: { value: cTexHome },
      uCornerCol: { value: new THREE.Color(homeColor) }
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
      uTex: { value: 0.86 },
      uGlowCol: { value: new THREE.Color('#f0d8c1') },
      uEmber: { value: 1.0 },
      uIntensity: { value: 0 },
      uDetail: { value: 1.1 },
      uDetailScale: { value: 2.58 },
      uPattern: { value: 4.0 },
      uTime: { value: 0 },
      uGlow: { value: 1.0 },
      uFlood: { value: 0.0 },
      uFloodTeam: { value: new THREE.Color(awayColor) },
      uFloodFade: { value: 0.0 },
      uCorner: { value: cTexAway },
      uCornerCol: { value: new THREE.Color(awayColor) }
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
          
          col = mix(col, uFloodTeam, clamp(uFlood, 0.0, 1.0));
          
          float cw = clamp(texture2D(uCorner, vUvN).r, 0.0, 1.0);
          if (cw > 0.001) col = mix(col, uCornerCol, cw);

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
      const elapsed = clock.getElapsedTime();

      // Controls update
      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Gently orbit camera automatically if playing (adds visual interest)
      if (isPlayingRef.current && cameraRef.current) {
        const orbitAngle = elapsed * 0.04;
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

            // Spike peak (rises in 6s, goals decay over 15 mins, shots decay over 3 mins)
            const age = activeT - ev.t;
            if (age >= 0) {
              const isGoal = ev.isGoal;
              const atk = 6.0;
              const rel = isGoal ? 900.0 : 180.0; // 15 mins for goal, 3 mins for shot
              const rise = 1.0 - Math.exp(-age / atk);
              const persistentFactor = 0.40;
              const decay = persistentFactor + (1.0 - persistentFactor) * Math.exp(-age / rel);
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

                    if (ev.isGoal) {
                      // Generate deterministic shirt number between 2 and 22 based on name char codes
                      const charCodeSum = (ev.surname || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
                      const shirtNumber = 2 + (charCodeSum % 21);
                      
                      currentGoalCard = {
                        playerName: `${ev.name || ""} ${ev.surname || "Player"}`.trim(),
                        team: ev.team === "home" ? homeTeam : awayTeam,
                        position: ev.position || "FWD",
                        x: sX,
                        y: sY,
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
                        x: sX,
                        y: sY
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
              const maxWaveH = ev.type === "high_danger_possession" ? 0.22 : 0.12;
              const wave = {
                x: wX,
                z: wZ,
                radiusSq: 6.0,
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

      // --- DYNAMIC gradient score-tinted sky (ambient leader lean) ---
      const skyMargin = dynamicGoalsH - dynamicGoalsA;
      const skyMag = Math.max(0, Math.min(1, Math.abs(skyMargin) / 2));
      const targetLean = skyMargin === 0 ? 0 : Math.sign(skyMargin) * (0.4 + 0.6 * skyMag);
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

      // Find the ball position at the current playback time
      let ballU = 0.5;
      let ballV = 0.5;
      let lastEventBeforeT: any = null;
      for (const ev of visualEventsRef.current) {
        if (ev.t <= activeT) {
          if (!lastEventBeforeT || ev.t > lastEventBeforeT.t) {
            lastEventBeforeT = ev;
          }
        }
      }
      if (lastEventBeforeT) {
        ballU = lastEventBeforeT.u;
        ballV = lastEventBeforeT.v;
      }

      // Smooth the ball coordinate
      smoothBallRef.current.u += (ballU - smoothBallRef.current.u) * 0.12;
      smoothBallRef.current.v += (ballV - smoothBallRef.current.v) * 0.12;

      // Possession front tide update
      const mom = momIdx; // -1..+1
      const momFront = 0.5 + 0.5 * Math.sign(mom) * Math.pow(Math.abs(mom), 0.65);
      
      const tempFront = new Float32Array(48);
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
        
        targetFrontVal = Math.max(0.08, Math.min(0.92, targetFrontVal));
        
        // Temporal ease
        frontRef.current[j] += (targetFrontVal - frontRef.current[j]) * 0.10;
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

      // Apply active lunges
      activeLunges.forEach(lunge => {
        for (let j = 0; j < VY; j++) {
          const dj = j - lunge.jc;
          const g = Math.exp(-(dj * dj) / (2 * lunge.sig * lunge.sig)) * lunge.env;
          if (g < 0.05) continue;
          
          const w = Math.min(1.0, g * 2.2);
          const fr = activeFront[j];
          if (lunge.home) {
            // Home stabs toward u -> 1
            const tgt = THREE.MathUtils.lerp(fr, Math.min(0.97, lunge.su + 0.03), w);
            if (tgt > fr) activeFront[j] = tgt;
          } else {
            // Away stabs toward u -> 0
            const tgt = THREE.MathUtils.lerp(fr, Math.max(0.03, lunge.su - 0.03), w);
            if (tgt < fr) activeFront[j] = tgt;
          }
        }
      });

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

      homeUniforms.uTime.value = elapsed;
      homeUniforms.uIntensity.value = intensity;
      homeUniforms.uTop.value = seamTopHome;
      homeUniforms.uLipH.value = homeLipHVal;
      homeUniforms.uFlood.value = floodIntensity;
      if (lastGoalEvent) {
        homeUniforms.uFloodTeam.value.set(lastGoalEvent.team === "home" ? homeColor : awayColor);
      }
      homeUniforms.uFloodFade.value = (lastGoalEvent && lastGoalEvent.team !== "home") ? floodIntensity : 0.0;

      awayUniforms.uTime.value = elapsed;
      awayUniforms.uIntensity.value = intensity;
      awayUniforms.uTop.value = 1.0 - seamTopHome;
      awayUniforms.uLipH.value = awayLipHVal;
      awayUniforms.uFlood.value = floodIntensity;
      if (lastGoalEvent) {
        awayUniforms.uFloodTeam.value.set(lastGoalEvent.team === "home" ? homeColor : awayColor);
      }
      awayUniforms.uFloodFade.value = (lastGoalEvent && lastGoalEvent.team === "home") ? floodIntensity : 0.0;

      homeWallUniforms.uTime.value = elapsed;
      homeWallUniforms.uIntensity.value = intensity;
      homeWallUniforms.uTop.value = seamTopHome;
      homeWallUniforms.uLipH.value = homeLipHVal;
      homeWallUniforms.uFlood.value = floodIntensity;
      if (lastGoalEvent) {
        homeWallUniforms.uFloodTeam.value.set(lastGoalEvent.team === "home" ? homeColor : awayColor);
      }
      homeWallUniforms.uFloodFade.value = (lastGoalEvent && lastGoalEvent.team !== "home") ? floodIntensity : 0.0;

      awayWallUniforms.uTime.value = elapsed;
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
          const compressionOffset = elapsed * 0.12 - momentumDiff * 0.08;
          
          // Large fabric folds along the Z/depth axis (making folds run across the width of the field)
          const fabricFold1 = Math.sin(x * 0.42 + compressionOffset) * 0.16;
          const fabricFold2 = Math.cos(z * 0.32 + elapsed * 0.08) * 0.08;
          
          // Medium-frequency organic noise for fabric irregularity
          const fabricNoise = fbm2d(x * 0.35 + elapsed * 0.08, z * 0.35, 2) * 0.12;
          
          const baseNoise = fabricFold1 + fabricFold2 + fabricNoise;

          // Seam lift
          let seamLift = 0;
          const distSeam = Math.abs(x - frontierX);
          if (distSeam < 1.2) {
            const f = distSeam / 1.2;
            seamLift = 0.15 * f * (1.0 - f);
          }

          // Spire deformations separated by team
          let spiresSumH = 0;
          let spiresSumA = 0;
          allSpires.forEach(spire => {
            const dSq = (x - spire.x) ** 2 + (z - spire.z) ** 2;
            const val = spire.height * Math.exp(-dSq / spire.radiusSq);
            if (spire.color === homeColor) spiresSumH += val;
            else spiresSumA += val;
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

          const sharedSpires = spiresSumH + spiresSumA;
          const sharedRidge = homeRidge + awayRidge;
          const sharedHeight = (baseNoise + seamLift + sharedSpires + sharedRidge) * taper;
          let hH = sharedHeight;
          let hA = sharedHeight;

          let fVal = frontU;
          
          // Warp the possession front around the spires so they retain their scorer's color
          allSpires.forEach(spire => {
            const dx = x - spire.x;
            const dz = z - spire.z;
            const dSq = dx * dx + dz * dz;
            if (dSq > spire.radiusSq * 8.0) return; // optimization
            
            const influence = Math.exp(-dSq / (spire.radiusSq * 1.6));
            if (influence > 0.01) {
              if (spire.color === homeColor) {
                fVal = THREE.MathUtils.lerp(fVal, 0.96, influence);
              } else {
                fVal = THREE.MathUtils.lerp(fVal, 0.04, influence);
              }
            }
          });

          // Seam-band under-sheet clamp
          const du = u - fVal;
          const nearSeam = Math.max(0, Math.min(1, 1 - Math.abs(du) / seamWidthVal));
          if (nearSeam > 0) {
            const margin = 0.1;
            if (seamTopHome >= 0.5) {
              const cap = hH - margin;
              if (hA > cap) hA = THREE.MathUtils.lerp(hA, cap, nearSeam);
            } else {
              const cap = aHVal > 0 ? (hA - margin) : (hA - margin); // safe clamp
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

      // Dispose DataTextures
      if (hTexHome) hTexHome.dispose();
      if (aTexHome) aTexHome.dispose();
      if (cTexHome) cTexHome.dispose();
      if (hTexAway) hTexAway.dispose();
      if (aTexAway) aTexAway.dispose();
      if (cTexAway) cTexAway.dispose();
      
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.domElement.remove();
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
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ fontSize: "11px", fontFamily: "monospace", letterSpacing: "2.5px", color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
              FIFA World Cup 2026 • 3D Terrain Data Portrait
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0" }}>
              {homeTeam} <span style={{ color: homeColor }}>{currentHomeScore}</span> vs <span style={{ color: awayColor }}>{currentAwayScore}</span> {awayTeam}
            </h2>
          </div>
        </div>

        <button 
          onClick={() => setShowExplainer(!showExplainer)}
          style={{
            background: "rgba(111, 140, 255, 0.1)",
            border: "1px solid rgba(111, 140, 255, 0.22)",
            color: "#a9b8ff",
            padding: "8px 16px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = "rgba(111, 140, 255, 0.18)";
            e.currentTarget.style.borderColor = "rgba(111, 140, 255, 0.35)";
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = "rgba(111, 140, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(111, 140, 255, 0.22)";
          }}
        >
          <HelpCircle size={15} />
          How to Read It
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
        borderRadius: "20px", 
        overflow: "hidden" 
      }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#06050b", zIndex: 10 }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid rgba(111,140,255,0.2)", borderTopColor: "#6f8cff", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <span style={{ marginTop: "14px", fontSize: "13px", color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>Retrieving Match Coordinates...</span>
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Floating xG labels projection overlay */}
        {activeXgLabel && (
          <div style={{
            position: "absolute",
            left: `${activeXgLabel.x}px`,
            top: `${activeXgLabel.y}px`,
            transform: "translate(-50%, -100%)",
            background: "#080712",
            border: "1px solid rgba(255, 209, 102, 0.3)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            padding: "4px 8px",
            borderRadius: "4px",
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
            pointerEvents: "auto", // enable mouse interaction to hover/tilt the card!
            animation: "cardEntrance 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards"
          }}>
            <style jsx>{`
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

        {/* 3D WebGL render mount */}
        <div ref={mountRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />

        {/* A. FLOATING GLASS STATS PANEL (Top-Left) */}
        <div style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          width: "240px",
          background: "rgba(10, 12, 22, 0.65)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "16px",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
        }}>
          <span style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
            Accumulated Stats (Min {Math.floor(currentTime/60)})
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "12px" }}>
            {/* Shots */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: 700 }}>{dynamicStats.home.shots}</span>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>Total Shots</span>
                <span style={{ fontWeight: 700 }}>{dynamicStats.away.shots}</span>
              </div>
              <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "1.5px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${dynamicStats.home.shots + dynamicStats.away.shots > 0 ? (dynamicStats.home.shots / (dynamicStats.home.shots + dynamicStats.away.shots)) * 100 : 50}%`, background: homeColor }} />
                <div style={{ width: `${dynamicStats.home.shots + dynamicStats.away.shots > 0 ? (dynamicStats.away.shots / (dynamicStats.home.shots + dynamicStats.away.shots)) * 100 : 50}%`, background: awayColor }} />
              </div>
            </div>

            {/* xG */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: 700 }}>{dynamicStats.home.xg.toFixed(2)}</span>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>Expected Goals (xG)</span>
                <span style={{ fontWeight: 700 }}>{dynamicStats.away.xg.toFixed(2)}</span>
              </div>
              <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "1.5px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${dynamicStats.home.xg + dynamicStats.away.xg > 0 ? (dynamicStats.home.xg / (dynamicStats.home.xg + dynamicStats.away.xg)) * 100 : 50}%`, background: homeColor }} />
                <div style={{ width: `${dynamicStats.home.xg + dynamicStats.away.xg > 0 ? (dynamicStats.away.xg / (dynamicStats.home.xg + dynamicStats.away.xg)) * 100 : 50}%`, background: awayColor }} />
              </div>
            </div>

            {/* Corners */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontWeight: 700 }}>{dynamicStats.home.corners}</span>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>Corners Awarded</span>
                <span style={{ fontWeight: 700 }}>{dynamicStats.away.corners}</span>
              </div>
              <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "1.5px", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${dynamicStats.home.corners + dynamicStats.away.corners > 0 ? (dynamicStats.home.corners / (dynamicStats.home.corners + dynamicStats.away.corners)) * 100 : 50}%`, background: homeColor }} />
                <div style={{ width: `${dynamicStats.home.corners + dynamicStats.away.corners > 0 ? (dynamicStats.away.corners / (dynamicStats.home.corners + dynamicStats.away.corners)) * 100 : 50}%`, background: awayColor }} />
              </div>
            </div>
          </div>
        </div>

        {/* B. FLOATING GLASS MILESTONES FEED (Top-Right) */}
        <div style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          width: "250px",
          maxHeight: "260px",
          background: "rgba(10, 12, 22, 0.65)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "14px",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
        }}>
          <span style={{ fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>
            Milestones Feed
          </span>
          
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
                    padding: "6px 8px", 
                    borderRadius: "6px", 
                    background: isPast ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.01)",
                    border: isPast ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
                    opacity: isPast ? 1 : 0.4,
                    cursor: "pointer",
                    fontSize: "11px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = isPast ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.01)";
                    e.currentTarget.style.borderColor = isPast ? "rgba(255,255,255,0.08)" : "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {ev.isGoal ? (
                      <span style={{ fontSize: "10px" }}>⚽</span>
                    ) : (
                      <div style={{ width: "6px", height: "9px", background: ev.outcome === "Red" ? "#ef4444" : "#facc15", borderRadius: "1px" }} />
                    )}
                    <span style={{ fontWeight: ev.isGoal ? 700 : 500 }}>{ev.surname || "Player"} ({ev.label}')</span>
                  </div>
                  <span style={{ fontSize: "9px", color: ev.team === "home" ? homeColor : awayColor, textTransform: "uppercase", fontWeight: 700 }}>
                    {ev.team === "home" ? homeTeam.substring(0, 3) : awayTeam.substring(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* C. FLOATING GLASS CONTROLS PANEL (Bottom Center) */}
        <div style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          right: "20px",
          background: "rgba(10, 12, 22, 0.65)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "16px",
          zIndex: 4,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)"
        }}>
          {/* Seismograph drag scrubber container */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              <span>{homeTeam} Dominance</span>
              <span>Drag Seismograph to Seek Timeline (0' - 90')</span>
              <span>{awayTeam} Dominance</span>
            </div>
            <div style={{ position: "relative", width: "100%", height: "48px", background: "rgba(0,0,0,0.35)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)", overflow: "hidden" }}>
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
                width: "2px",
                background: "#6f8cff",
                boxShadow: "0 0 8px #6f8cff",
                pointerEvents: "none",
                zIndex: 3
              }} />
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Play/Pause controls */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  background: isPlaying ? "rgba(255,255,255,0.08)" : "#6f8cff",
                  color: isPlaying ? "#fff" : "#0e0d21",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: "2px" }} />}
              </button>

              <button 
                onClick={() => {
                  timeRef.current = 0;
                  setCurrentTime(0);
                  setIsPlaying(true);
                }}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              >
                <RotateCcw size={13} />
              </button>

              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginLeft: "10px", fontSize: "13px", fontFamily: "monospace" }}>
                <span style={{ color: "#6f8cff", fontWeight: 700 }}>{formatTime(currentTime)}</span>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>/</span>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Time Warp speed selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", fontWeight: 700 }}>Time Warp</span>
              <div style={{ display: "flex", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "2px" }}>
                {[
                  { label: "1x", val: 1 },
                  { label: "15x", val: 15 },
                  { label: "30x", val: 30 },
                  { label: "60x", val: 60 }
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setPlaybackSpeed(opt.val)}
                    style={{
                      background: playbackSpeed === opt.val ? "rgba(111, 140, 255, 0.12)" : "none",
                      border: "none",
                      color: playbackSpeed === opt.val ? "#a9b8ff" : "rgba(255,255,255,0.55)",
                      fontSize: "10px",
                      fontWeight: playbackSpeed === opt.val ? 700 : 500,
                      padding: "3px 7px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Manual/Interpretation explainer sheet overlay */}
        {showExplainer && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(6, 5, 11, 0.94)",
            padding: "36px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            overflowY: "auto",
            zIndex: 10,
            animation: "fadeIn 0.2s ease-out"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: 0 }}>Interpretation Manual</h3>
              <button 
                onClick={() => setShowExplainer(false)}
                style={{ background: "none", border: "none", color: "#f1eff8", fontSize: "20px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", fontSize: "13px", lineHeight: "1.6", color: "rgba(255,255,255,0.7)" }}>
              <div>
                <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: "6px" }}>1. The Territory Blankets</h4>
                <p>
                  The pitch is covered by two colored sheets representing each team (Blue for Home, Red/Orange for Away). 
                  The shifting dividing seam (the frontier boundary) shows the flow of play: 
                  who is dominating possession and pressing deeper into the opponent half at any given minute.
                </p>
              </div>
              <div>
                <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: "6px" }}>2. Expected Goals (xG) Spires</h4>
                <p>
                  Every shot is mapped as a sharp, pointed needle spire rising directly from the coordinate of the shot. 
                  The height of the spire is determined by its **Expected Goals (xG)** value. 
                  Goals form tall spires with glowing white rings around their bases.
                </p>
              </div>
              <div>
                <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: "6px" }}>3. Possession Tide Folds</h4>
                <p>
                  Sustained pressure or high-danger attacks create soft, billowy wave folds on the respective team's blanket. 
                  The texture utilizes a procedurally generated hexagonal microgrid, giving it the premium feeling of a physical clay model.
                </p>
              </div>
              <div>
                <h4 style={{ color: "#fff", fontWeight: 700, marginBottom: "6px" }}>4. Goal Floods & Lightning</h4>
                <p>
                  When a goal is scored, the entire slab temporarily floods with the kit color of the scoring team, 
                  symbolizing their dominance. Red cards and goals trigger procedural lightning strikes at the coordinate of the event.
                </p>
              </div>
            </div>
            <style jsx>{`
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

