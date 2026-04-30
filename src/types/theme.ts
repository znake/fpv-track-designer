import type { GateType } from './gate'

export type ThemeId =
  | 'minimal'
  | 'minimal-solarized-light'
  | 'minimal-solarized-dark'
  | 'minimal-catppuccin-mocha'
  | 'realistic'
  | 'night'

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
  skyTop: '#C8E2EE',
  skyMid: '#A8C9DC',
  skyHorizon: '#82ACC8',
  skyBottom: '#5F8BAA',
  skySun: '#F4DCA8',

  fogColor: '#AFCBDC',
  fogNear: 160,
  fogFar: 380,

  hemisphereSky: '#D6E7EE',
  hemisphereGround: '#4C8B38',
  hemisphereIntensity: 0.72,
  sunColor: '#FFF0C8',
  sunIntensity: 1.4,
  sunPosition: [80, 110, 60],
  fillColor: '#B8CBD8',
  fillIntensity: 0.4,
  fillPosition: [-60, 40, -40],
  ambientColor: '#FFFDF6',
  ambientIntensity: 0.28,

  groundGrass: '#6F8732',
  groundEarth: '#4A2E18',
  groundBoundary: '#FFE8C8',
  gridColor: '#8B6B3E',
  watermarkColor: '#e8d5b0',

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

const solarized = {
  base03: '#002b36',
  base02: '#073642',
  base01: '#586e75',
  base00: '#657b83',
  base0: '#839496',
  base1: '#93a1a1',
  base2: '#eee8d5',
  base3: '#fdf6e3',
  yellow: '#b58900',
  orange: '#cb4b16',
  red: '#dc322f',
  magenta: '#d33682',
  violet: '#6c71c4',
  blue: '#268bd2',
  cyan: '#2aa198',
  green: '#859900',
} as const

// ── Minimal / Solarized Light ─────────────────────────────────────
const minimalSolarizedLightColors: ThemeColors = {
  skyTop: solarized.base3,
  skyMid: solarized.base2,
  skyHorizon: solarized.base1,
  skyBottom: solarized.base0,
  skySun: solarized.yellow,

  fogColor: solarized.base2,
  fogNear: 160,
  fogFar: 380,

  hemisphereSky: solarized.base3,
  hemisphereGround: solarized.base01,
  hemisphereIntensity: 0.72,
  sunColor: solarized.base3,
  sunIntensity: 1.35,
  sunPosition: [80, 110, 60],
  fillColor: solarized.base1,
  fillIntensity: 0.38,
  fillPosition: [-60, 40, -40],
  ambientColor: solarized.base3,
  ambientIntensity: 0.3,

  groundGrass: '#5F6F3A',
  groundEarth: solarized.base0,
  groundBoundary: solarized.blue,
  gridColor: solarized.cyan,
  watermarkColor: solarized.base00,

  flightPath: solarized.orange,

  gates: {
    'standard': { normal: '#1E9CF0', selected: '#24C6D8' },
    'h-gate': { normal: '#F0443E', selected: '#F46A28' },
    'double-h': { normal: '#7D80E8', selected: '#EA4A9A' },
    'dive': { normal: '#E64AA0', selected: '#8588F0' },
    'double': { normal: '#D8A400', selected: '#F47A24' },
    'ladder': { normal: '#F46A24', selected: '#F0443E' },
    'start-finish': { normal: '#073642', selected: '#0B4A5A' },
    'flag': { normal: '#9DB800', selected: '#D8A400' },
    'octagonal-tunnel': { normal: '#21B7AA', selected: '#1E9CF0' },
  },

  selectionEmissive: solarized.yellow,
  selectionEmissiveIntensity: 0.75,

  indicatorEntryPlane: solarized.green,
  indicatorExitPlane: solarized.red,
  indicatorEntryLabel: solarized.cyan,
  indicatorExitLabel: solarized.orange,
  indicatorEntryOutline: solarized.green,
  indicatorExitOutline: solarized.red,
}

// ── Minimal / Solarized Dark ──────────────────────────────────────
const minimalSolarizedDarkColors: ThemeColors = {
  skyTop: solarized.base02,
  skyMid: solarized.base01,
  skyHorizon: solarized.base00,
  skyBottom: solarized.base0,
  skySun: solarized.yellow,

  fogColor: solarized.base02,
  fogNear: 160,
  fogFar: 380,

  hemisphereSky: solarized.base1,
  hemisphereGround: solarized.base02,
  hemisphereIntensity: 0.68,
  sunColor: solarized.base2,
  sunIntensity: 1.18,
  sunPosition: [80, 110, 60],
  fillColor: solarized.base0,
  fillIntensity: 0.42,
  fillPosition: [-60, 40, -40],
  ambientColor: solarized.base1,
  ambientIntensity: 0.36,

  groundGrass: '#6F8732',
  groundEarth: solarized.base02,
  groundBoundary: solarized.base2,
  gridColor: solarized.base0,
  watermarkColor: solarized.base1,

  flightPath: solarized.yellow,

  gates: {
    'standard': { normal: '#2EA6FF', selected: '#5FD7FF' },
    'h-gate': { normal: '#FF4A47', selected: '#FF7A3D' },
    'double-h': { normal: '#8A90FF', selected: '#F05AAF' },
    'dive': { normal: '#F05AAF', selected: '#A7ACFF' },
    'double': { normal: '#FFD12A', selected: '#FF9A3D' },
    'ladder': { normal: '#FF7A3D', selected: '#FF5F5C' },
    'start-finish': { normal: solarized.base2, selected: solarized.base3 },
    'flag': { normal: '#A7C700', selected: '#FFD12A' },
    'octagonal-tunnel': { normal: '#36D1C6', selected: '#2EA6FF' },
  },

  selectionEmissive: solarized.base1,
  selectionEmissiveIntensity: 0.9,

  indicatorEntryPlane: solarized.green,
  indicatorExitPlane: solarized.red,
  indicatorEntryLabel: solarized.cyan,
  indicatorExitLabel: solarized.orange,
  indicatorEntryOutline: solarized.green,
  indicatorExitOutline: solarized.red,
}

// ── Minimal / Catppuccin Mocha ─────────────────────────────────────
const minimalCatppuccinMochaColors: ThemeColors = {
  skyTop: '#11111b',
  skyMid: '#181825',
  skyHorizon: '#1e1e2e',
  skyBottom: '#313244',
  skySun: '#fab387',

  fogColor: '#181825',
  fogNear: 160,
  fogFar: 380,

  hemisphereSky: '#1e1e2e',
  hemisphereGround: '#181825',
  hemisphereIntensity: 0.58,
  sunColor: '#f9e2af',
  sunIntensity: 1.28,
  sunPosition: [80, 110, 60],
  fillColor: '#313244',
  fillIntensity: 0.28,
  fillPosition: [-60, 40, -40],
  ambientColor: '#bac2de',
  ambientIntensity: 0.16,

  groundGrass: '#6F8732',
  groundEarth: '#4A2E18',
  groundBoundary: '#FFE8C8',
  gridColor: '#8B6B3E',
  watermarkColor: '#e8d5b0',

  flightPath: '#FF8B5A',

  gates: {
    'standard': { normal: '#5B8CFF', selected: '#39C8FF' },
    'h-gate': { normal: '#FF5C8A', selected: '#FF7A9E' },
    'double-h': { normal: '#A86BFF', selected: '#E86DCE' },
    'dive': { normal: '#FF6FD8', selected: '#FF9AE6' },
    'double': { normal: '#FFD35A', selected: '#FF9D4A' },
    'ladder': { normal: '#FF9D4A', selected: '#FFD35A' },
    'start-finish': { normal: '#E6ECFF', selected: '#74D7FF' },
    'flag': { normal: '#FF5C8A', selected: '#FF6FD8' },
    'octagonal-tunnel': { normal: '#4FE8D8', selected: '#39C8FF' },
  },

  selectionEmissive: '#cba6f7',
  selectionEmissiveIntensity: 1.15,

  indicatorEntryPlane: '#6CEB68',
  indicatorExitPlane: '#FF5C8A',
  indicatorEntryLabel: '#6CEB68',
  indicatorExitLabel: '#FF7A9E',
  indicatorEntryOutline: '#4FE8D8',
  indicatorExitOutline: '#FF7A9E',
}

// ── Realistic ─────────────────────────────────────────────────────
const realisticColors: ThemeColors = {
  skyTop: '#C8E2EE',
  skyMid: '#A8C9DC',
  skyHorizon: '#82ACC8',
  skyBottom: '#5F8BAA',
  skySun: '#F4DCA8',

  fogColor: '#AFCBDC',
  fogNear: 80,
  fogFar: 350,

  hemisphereSky: '#D6E7EE',
  hemisphereGround: '#4C8B38',
  hemisphereIntensity: 0.55,
  sunColor: '#FFF1D6',
  sunIntensity: 2.2,
  sunPosition: [50, 12, -40],
  fillColor: '#B8CBD8',
  fillIntensity: 0.3,
  fillPosition: [-40, 20, 30],
  ambientColor: '#FFFFFF',
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

  groundGrass: '#8B5CF6',
  groundEarth: '#4C1D95',
  groundBoundary: '#FF00E5',
  gridColor: '#C4B5FD',
  watermarkColor: '#6D28D9',

  flightPath: '#FFEA00',

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
    name: 'Minimal Standard',
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

  'minimal-solarized-light': {
    id: 'minimal-solarized-light',
    name: 'Minimal Solarized Light',
    description: 'Solarized Light Palette auf dem reduzierten Minimal-Renderer.',
    dpr: [1, 1],
    antialias: false,
    toneMappingExposure: 1.02,
    useSkyDome: true,
    useSky: false,
    useStars: false,
    useClouds: false,
    useEnvironment: false,
    useBloom: false,
    useShadows: false,
    colors: minimalSolarizedLightColors,
  },

  'minimal-solarized-dark': {
    id: 'minimal-solarized-dark',
    name: 'Minimal Solarized Dark',
    description: 'Solarized Dark Palette auf dem reduzierten Minimal-Renderer.',
    dpr: [1, 1],
    antialias: false,
    toneMappingExposure: 0.92,
    useSkyDome: true,
    useSky: false,
    useStars: false,
    useClouds: false,
    useEnvironment: false,
    useBloom: false,
    useShadows: false,
    colors: minimalSolarizedDarkColors,
  },

  'minimal-catppuccin-mocha': {
    id: 'minimal-catppuccin-mocha',
    name: 'Minimal Catppuccin Mocha',
    description: 'Catppuccin-Mocha-Palette auf dem reduzierten Minimal-Renderer.',
    dpr: [1, 1],
    antialias: false,
    toneMappingExposure: 1.02,
    useSkyDome: true,
    useSky: false,
    useStars: false,
    useClouds: false,
    useEnvironment: false,
    useBloom: false,
    useShadows: false,
    colors: minimalCatppuccinMochaColors,
  },

  realistic: {
    id: 'realistic',
    name: 'Realistisch',
    description: 'Sonne mit Wolken, Schatten und atmosphärischer Beleuchtung — für leistungsstarke Rechner.',
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
