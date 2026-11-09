// Single source of design truth. `scripts/gen-tokens.ts` turns this into CSS
// variables for Tailwind; the 3D layer imports it directly.

export const palette = {
  dark: {
    bg: '#0e0d0b',
    surface: '#171512',
    surface2: '#201d19',
    surface3: '#2a2620',
    line: 'rgba(240, 230, 210, 0.10)',
    lineStrong: 'rgba(240, 230, 210, 0.22)',
    text: '#efe8dc',
    textMuted: '#a59d8f',
    textFaint: '#6f685d',
    accent: '#c9a35b',
    accentStrong: '#e2c27f',
    accentInk: '#1a140a',
    danger: '#e0614e',
    success: '#7fb38a',
    focus: '#e2c27f',
  },
  light: {
    bg: '#f4f0e8',
    surface: '#fbf9f4',
    surface2: '#ece6da',
    surface3: '#e2dacb',
    line: 'rgba(30, 24, 16, 0.12)',
    lineStrong: 'rgba(30, 24, 16, 0.24)',
    text: '#1b1813',
    textMuted: '#6b6356',
    textFaint: '#9a9182',
    accent: '#9a7432',
    accentStrong: '#7d5d22',
    accentInk: '#fbf6ea',
    danger: '#b8412f',
    success: '#3e7a4e',
    focus: '#9a7432',
  },
} as const

export type ThemeName = keyof typeof palette
export type ColorToken = keyof (typeof palette)['dark']

// Scene colors are linear-agnostic hex; materials convert. Same in both themes:
// the board is a physical object, only the room around it changes.
export const scene = {
  squareLight: '#e8e2d6',
  squareDark: '#3a342e',
  frame: '#1c1714',
  brass: '#c9a35b',
  pieceLight: '#f1ece2',
  pieceDark: '#26221f',
  legal: '#e2c27f',
  selected: '#e2c27f',
  lastMove: '#c9a35b',
  check: '#e0614e',
  cursor: '#7fb3d9',
  roomDark: '#0e0d0b',
  roomLight: '#d9d2c4',
} as const

export const font = {
  display: "'Fraunces Variable', 'Iowan Old Style', Georgia, serif",
  body: "'Inter Tight Variable', ui-sans-serif, system-ui, sans-serif",
  mono: "'JetBrains Mono Variable', ui-monospace, 'SF Mono', monospace",
} as const

// Major-third scale (1.25), rem.
export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.25rem',
  xl: '1.5625rem',
  '2xl': '1.953rem',
  '3xl': '2.441rem',
  '4xl': '3.052rem',
  '5xl': '3.815rem',
} as const

export const radius = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '20px',
  pill: '999px',
} as const

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,0.18), 0 1px 1px rgba(0,0,0,0.10)',
  md: '0 6px 18px -6px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.12)',
  lg: '0 24px 48px -16px rgba(0,0,0,0.5), 0 6px 16px rgba(0,0,0,0.18)',
  glow: '0 0 0 1px rgba(201,163,91,0.35), 0 0 24px -4px rgba(201,163,91,0.45)',
} as const

// One motion language for 2D and 3D. Durations in ms.
export const duration = {
  instant: 80,
  fast: 160,
  base: 240,
  slow: 420,
  deliberate: 700,
  cinematic: 1200,
} as const

// Cubic-bezier control points. CSS and GSAP (via CustomEase) read the same numbers.
export const ease = {
  standard: [0.2, 0, 0, 1],
  enter: [0.05, 0.7, 0.1, 1],
  exit: [0.3, 0, 0.8, 0.15],
  soft: [0.4, 0, 0.2, 1],
  anticipate: [0.36, 0, 0.66, -0.56],
  overshoot: [0.34, 1.56, 0.64, 1],
} as const

export type DurationToken = keyof typeof duration
export type EaseToken = keyof typeof ease

export const cssBezier = (e: EaseToken) => `cubic-bezier(${ease[e].join(', ')})`
