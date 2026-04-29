import type { GateType } from './gate'

export type ThemeId = 'minimal' | 'realistic' | 'night'

export interface ThemeColors {
  // Sky / Background
  skyTop: string
  skyMid: string
  skyHorizon: string
  skyBottom: string
  skySun: string

  // Fog
  fogColor: string
  fogNear: number
  fogFar: number

  // Lighting
  hemisphereSky: string
  hemisphereGround: string
  hemisphereIntensity: number
  sunColor: string
  sunIntensity: number
  sunPosition: [number, number, number]
  fillColor: string
  fillIntensity: number
  fillPosition: [number, number, number]
  ambientColor: string
  ambientIntensity: number

  // Ground / Grid
  groundGrass: string
  groundEarth: string
  groundBoundary: string
  gridColor: string
  watermarkColor: string

  // Flight path
  flightPath: string

  // Gate colors per gate type
  gates: Record<GateType, { normal: string; selected: string }>

  // Selection highlight
  selectionEmissive: string
  selectionEmissiveIntensity: number
  gateEmissiveIntensity?: number
  gateEmissiveIntensities?: Partial<Record<GateType, number>>

  // Entry/Exit indicators
  indicatorEntryPlane: string
  indicatorExitPlane: string
  indicatorEntryLabel: string
  indicatorExitLabel: string
  indicatorEntryOutline: string
  indicatorExitOutline: string
}

export interface ThemeConfig {
  id: ThemeId
  name: string
  description: string

  // Renderer
  dpr: [number, number]
  antialias: boolean
  toneMappingExposure: number

  // Component flags — which 3D components to render
  useSkyDome: boolean
  useSky: boolean
  useStars: boolean
  useClouds: boolean
  useEnvironment: boolean
  environmentPreset?: string
  environmentIntensity?: number
  useBloom: boolean
  useShadows: boolean

  // Colors
  colors: ThemeColors
}

// ── Minimal ──────────────────────────────────────────────────────
const minimalColors: ThemeColors = {
  skyTop: '#9CCFEA',
  skyMid: '#5FADE0',
  skyHorizon: '#347CC3',
  skyBottom: '#1F4E8F',
  skySun: '#F4DCA8',

  fogColor: '#5AAEF0',
  fogNear: 160,
  fogFar: 380,

  hemisphereSky: '#D8F1FF',
  hemisphereGround: '#4C8B38',
  hemisphereIntensity: 0.72,
  sunColor: '#FFF1D6',
  sunIntensity: 1.4,
  sunPosition: [80, 110, 60],
  fillColor: '#A8C8E6',
  fillIntensity: 0.4,
  fillPosition: [-60, 40, -40],
  ambientColor: '#FFFFFF',
  ambientIntensity: 0.28,

  groundGrass: '#3B7A28',
  groundEarth: '#5A3A22',
  groundBoundary: '#FFFEF0',
  gridColor: '#5A8F44',
  watermarkColor: '#d9ead0',

  flightPath: '#FF8B5A',

  gates: {
    'standard': { normal: '#1F7AEC', selected: '#4A9CFF' },
    'h-gate': { normal: '#E63946', selected: '#F46A75' },
    'double-h': { normal: '#9333EA', selected: '#B560F5' },
    'dive': { normal: '#EC4899', selected: '#F472B6' },
    'double': { normal: '#FACC15', selected: '#FDE047' },
    'ladder': { normal: '#F97316', selected: '#FB923C' },
    'start-finish': { normal: '#F5F5F5', selected: '#F5F5F5' },
    'flag': { normal: '#DC2626', selected: '#EF4444' },
    'octagonal-tunnel': { normal: '#06B6D4', selected: '#22D3EE' },
  },

  selectionEmissive: '#FFD27A',
  selectionEmissiveIntensity: 0.8,

  indicatorEntryPlane: '#16a34a',
  indicatorExitPlane: '#ef4444',
  indicatorEntryLabel: '#86efac',
  indicatorExitLabel: '#fca5a5',
  indicatorEntryOutline: '#4ade80',
  indicatorExitOutline: '#f87171',
}

// ── Realistic Sunset ──────────────────────────────────────────────
const realisticColors: ThemeColors = {
  skyTop: '#9CCFEA',       // not used (replaced by <Sky>), kept for fallback
  skyMid: '#5FADE0',
  skyHorizon: '#347CC3',
  skyBottom: '#1F4E8F',
  skySun: '#FF8C42',

  fogColor: '#E8A87C',
  fogNear: 80,
  fogFar: 350,

  hemisphereSky: '#FFD4A3',
  hemisphereGround: '#5C3A1E',
  hemisphereIntensity: 0.55,
  sunColor: '#FFB347',
  sunIntensity: 2.2,
  sunPosition: [50, 12, -40],
  fillColor: '#D4956B',
  fillIntensity: 0.3,
  fillPosition: [-40, 20, 30],
  ambientColor: '#FFD4A3',
  ambientIntensity: 0.2,

  groundGrass: '#5C7328',
  groundEarth: '#4A2E18',
  groundBoundary: '#FFE8C8',
  gridColor: '#8B6B3E',
  watermarkColor: '#e8d5b0',

  flightPath: '#FF6944',

  gates: {
    'standard': { normal: '#1F7AEC', selected: '#4A9CFF' },
    'h-gate': { normal: '#E63946', selected: '#F46A75' },
    'double-h': { normal: '#9333EA', selected: '#B560F5' },
    'dive': { normal: '#EC4899', selected: '#F472B6' },
    'double': { normal: '#FACC15', selected: '#FDE047' },
    'ladder': { normal: '#F97316', selected: '#FB923C' },
    'start-finish': { normal: '#F5F5F5', selected: '#F5F5F5' },
    'flag': { normal: '#DC2626', selected: '#EF4444' },
    'octagonal-tunnel': { normal: '#06B6D4', selected: '#22D3EE' },
  },

  selectionEmissive: '#FFD27A',
  selectionEmissiveIntensity: 1.0,

  indicatorEntryPlane: '#22c55e',
  indicatorExitPlane: '#ef4444',
  indicatorEntryLabel: '#86efac',
  indicatorExitLabel: '#fca5a5',
  indicatorEntryOutline: '#4ade80',
  indicatorExitOutline: '#f87171',
}

// ── Night / Neon ──────────────────────────────────────────────────
const nightColors: ThemeColors = {
  skyTop: '#050510',
  skyMid: '#060618',
  skyHorizon: '#0A0A20',
  skyBottom: '#020208',
  skySun: '#000000',

  fogColor: '#050510',
  fogNear: 60,
  fogFar: 300,

  hemisphereSky: '#0D0D28',
  hemisphereGround: '#0A0A0A',
  hemisphereIntensity: 0.15,
  sunColor: '#1A1A3A',
  sunIntensity: 0.15,
  sunPosition: [0, 60, 0],
  fillColor: '#0A0A20',
  fillIntensity: 0.1,
  fillPosition: [-30, 30, 30],
  ambientColor: '#1A1A3A',
  ambientIntensity: 0.1,

  groundGrass: '#241044',
  groundEarth: '#090211',
  groundBoundary: '#FF00E5',
  gridColor: '#51258F',
  watermarkColor: '#6D28D9',

  flightPath: '#FF00E5',

  // Neon gate colors — vibrant, high saturation
  gates: {
    'standard': { normal: '#00E5FF', selected: '#80F0FF' },
    'h-gate': { normal: '#FF1744', selected: '#FF616F' },
    'double-h': { normal: '#D500F9', selected: '#EA80FC' },
    'dive': { normal: '#FF4081', selected: '#FF80AB' },
    'double': { normal: '#FFEA00', selected: '#FFFF8D' },
    'ladder': { normal: '#FF9100', selected: '#FFB74D' },
    'start-finish': { normal: '#E0E0E0', selected: '#FFFFFF' },
    'flag': { normal: '#FF3D00', selected: '#FF6E40' },
    'octagonal-tunnel': { normal: '#00E676', selected: '#69F0AE' },
  },

  selectionEmissive: '#FFFFFF',
  selectionEmissiveIntensity: 3.0,
  gateEmissiveIntensity: 2.4,
  gateEmissiveIntensities: {
    'standard': 1.55,
    'h-gate': 3.9,
    'double-h': 4.3,
    'dive': 2.8,
    'double': 1.35,
    'ladder': 1.9,
    'start-finish': 1.4,
    'flag': 3.6,
    'octagonal-tunnel': 1.25,
  },

  indicatorEntryPlane: '#00E676',
  indicatorExitPlane: '#FF1744',
  indicatorEntryLabel: '#69F0AE',
  indicatorExitLabel: '#FF616F',
  indicatorEntryOutline: '#00E676',
  indicatorExitOutline: '#FF1744',
}

// ── Theme Presets ─────────────────────────────────────────────────

export const THEME_PRESETS: Record<ThemeId, ThemeConfig> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Optimiert für schwächere Geräte — reduzierter Detailgrad, kein Schattenwurf.',
    dpr: [1, 1],
    antialias: false,
    toneMappingExposure: 1.05,
    useSkyDome: true,
    useSky: false,
    useStars: false,
    useClouds: false,
    useEnvironment: false,
    useBloom: false,
    useShadows: false,
    colors: minimalColors,
  },

  realistic: {
    id: 'realistic',
    name: 'Realistisch',
    description: 'Sonnenuntergang mit Wolken, Schatten und atmosphärischer Beleuchtung — für leistungsstarke Rechner.',
    dpr: [1, 2],
    antialias: true,
    toneMappingExposure: 1.1,
    useSkyDome: false,
    useSky: true,
    useStars: false,
    useClouds: true,
    useEnvironment: true,
    environmentPreset: 'sunset',
    environmentIntensity: 0.4,
    useBloom: false,
    useShadows: true,
    colors: realisticColors,
  },

  night: {
    id: 'night',
    name: 'Nacht',
    description: 'Neonfarbene Gates mit Bloom-Effekt unter einem funkelnden Sternenhimmel.',
    dpr: [1, 1.5],
    antialias: true,
    toneMappingExposure: 0.9,
    useSkyDome: false,
    useSky: false,
    useStars: true,
    useClouds: false,
    useEnvironment: true,
    environmentPreset: 'night',
    environmentIntensity: 0.15,
    useBloom: true,
    useShadows: false,
    colors: nightColors,
  },
} as const

export const DEFAULT_THEME: ThemeId = 'minimal'
