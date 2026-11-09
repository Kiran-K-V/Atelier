// Single source of design truth. `scripts/gen-tokens.ts` turns this into CSS
// variables for Tailwind; the 3D layer imports it directly.

const atelierPalette = {
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


// Glacier: frosted ocean glass on snow. Surfaces are translucent so panels read as frosted glass
// over the 3D board (paired with backdrop blur in ui.css).
const glacierPalette = {
  dark: {
    bg: '#020a12',
    surface: 'rgba(4, 22, 40, 0.74)',
    surface2: 'rgba(6, 30, 52, 0.80)',
    surface3: 'rgba(9, 42, 68, 0.85)',
    line: 'rgba(190, 236, 250, 0.12)',
    lineStrong: 'rgba(190, 236, 250, 0.26)',
    text: '#e8f7fc',
    textMuted: '#93b9c7',
    textFaint: '#5d8392',
    accent: '#4fd2ea',
    accentStrong: '#9ae9f8',
    accentInk: '#02202a',
    danger: '#ff7b6b',
    success: '#6fe0b4',
    focus: '#9ae9f8',
  },
  light: {
    bg: '#edf5f8',
    surface: 'rgba(255, 255, 255, 0.72)',
    surface2: 'rgba(240, 248, 251, 0.82)',
    surface3: 'rgba(222, 238, 245, 0.88)',
    line: 'rgba(8, 48, 64, 0.12)',
    lineStrong: 'rgba(8, 48, 64, 0.24)',
    text: '#05202e',
    textMuted: '#3f6377',
    textFaint: '#7d9aa6',
    accent: '#0a5a7c',
    accentStrong: '#083f5c',
    accentInk: '#f1fbfd',
    danger: '#b83a2b',
    success: '#21785a',
    focus: '#083f5c',
  },
} as const

export const BOARD_SETS = ['glacier', 'atelier'] as const
export type BoardSet = (typeof BOARD_SETS)[number]

export const palette = { atelier: atelierPalette, glacier: glacierPalette } as const

export type ThemeName = keyof typeof atelierPalette
export type ColorToken = keyof (typeof atelierPalette)['dark']

// Scene colors are linear-agnostic hex; materials convert. Same in both themes:
// the board is a physical object, only the room around it changes.
export interface SceneColors {
  readonly squareLight: string
  readonly squareDark: string
  readonly frame: string
  /** Metal trim and the warm/cool accent most effects are tinted with. */
  readonly brass: string
  /** Near-white hot core of light effects (beam heads, flashes), tinted toward the accent. */
  readonly glow: string
  readonly pieceLight: string
  readonly pieceDark: string
  readonly legal: string
  /** Selected square, legal-move dots and capture rings. */
  readonly marker: string
  readonly selected: string
  readonly lastMove: string
  readonly check: string
  readonly cursor: string
  readonly roomDark: string
  readonly roomLight: string
}

export const sceneSets: Record<BoardSet, SceneColors> = {
  atelier: {
    squareLight: '#e8e2d6',
    squareDark: '#3a342e',
    frame: '#1c1714',
    brass: '#c9a35b',
    glow: '#fff1d6',
    pieceLight: '#f1ece2',
    pieceDark: '#26221f',
    legal: '#e2c27f',
    marker: '#d99a1f',
    selected: '#e2c27f',
    lastMove: '#c9a35b',
    check: '#e0614e',
    cursor: '#7fb3d9',
    roomDark: '#0e0d0b',
    roomLight: '#d9d2c4',
  },
  glacier: {
    squareLight: '#eef3f7',
    squareDark: '#0f2f6b',
    frame: '#0c4e70',
    brass: '#8fe3f5',
    glow: '#eafcff',
    pieceLight: '#f7fafc',
    pieceDark: '#0b4f7a',
    legal: '#8be9ff',
    marker: '#1f9dff',
    selected: '#b8f3ff',
    lastMove: '#4fd2ea',
    check: '#ff6b5a',
    cursor: '#ffffff',
    roomDark: '#020a12',
    roomLight: '#b9cfdb',
  },
}

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
} as const
// `shadow-glow` and the shadow tint are per set and theme, so scripts/gen-tokens.ts builds them from
// `--c-glow-rgb` and `--c-shadow-rgb` instead of fixing a colour here.

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
