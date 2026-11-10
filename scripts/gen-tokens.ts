import { writeFileSync } from 'node:fs'
import { BOARD_SETS, cssBezier, duration, ease, font, fontSize, palette, radius, sceneSets, shadow, type BoardSet, type ThemeName } from '../src/design/tokens.ts'

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')

// Frost speckle: sparse bright noise from an SVG turbulence filter. Pure CSS, no asset to fetch.
const noise = (r: number, g: number, b: number, opacity: number) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='11'/%3E%3CfeColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 8 -5.95'/%3E%3C/filter%3E%3Crect width='260' height='260' filter='url(%23n)' opacity='${opacity}'/%3E%3C/svg%3E")`
const snow = (a: number) =>
  `radial-gradient(1.5px 1.5px at 22% 31%, rgba(255,255,255,${a}), transparent) 0 0 / 190px 230px, radial-gradient(1px 1px at 71% 62%, rgba(255,255,255,${a * 0.75}), transparent) 0 0 / 130px 150px`

/** Per-set, per-theme CSS variables that are not palette colours. */
const extras: Record<BoardSet, Record<ThemeName, Record<string, string>>> = {
  // Wood, like atelier, has no page art and no glass: flat warm panels with a honey glow.
  wood: {
    dark: { 'glow-rgb': rgb(sceneSets.wood.brass), 'shadow-rgb': '0, 0, 0' },
    light: { 'glow-rgb': rgb(sceneSets.wood.brass), 'shadow-rgb': '0, 0, 0' },
  },
  // Atelier keeps its brass glow and plain black shadows; it has no page art and no glass.
  atelier: {
    dark: { 'glow-rgb': rgb(sceneSets.atelier.brass), 'shadow-rgb': '0, 0, 0' },
    light: { 'glow-rgb': rgb(sceneSets.atelier.brass), 'shadow-rgb': '0, 0, 0' },
  },
  glacier: {
    dark: {
      'glow-rgb': rgb(palette.glacier.dark.accent),
      'shadow-rgb': '0, 5, 11',
      'glass-edge': 'rgba(200, 238, 255, 0.28)',
      'glass-lift': '0 28px 56px -22px rgba(0, 5, 11, 0.75), 0 6px 14px -6px rgba(0, 5, 11, 0.45)',
      'glass-wash': 'linear-gradient(158deg, rgba(120, 205, 240, 0.10), rgba(120, 205, 240, 0.01) 55%), linear-gradient(rgba(1, 8, 15, 0.34), rgba(1, 8, 15, 0.34))',
      // Depth: faint caustic light from the top, a deep floor, and a vignette that darkens the edges.
      'page-bg': [
        noise(1, 1, 1, 0.42),
        snow(0.34),
        'radial-gradient(135% 105% at 50% 45%, transparent 52%, rgba(0, 3, 8, 0.72) 100%)',
        'radial-gradient(46% 30% at 74% 4%, rgba(130, 225, 248, 0.14), transparent 70%)',
        'radial-gradient(80% 46% at 38% -8%, rgba(52, 160, 208, 0.30), transparent 72%)',
        'radial-gradient(70% 45% at 100% 100%, rgba(8, 70, 110, 0.35), transparent 70%)',
        'linear-gradient(172deg, #05213a 0%, #031526 38%, #020a12 100%)',
      ].join(', '),
    },
    light: {
      'glow-rgb': rgb(palette.glacier.light.accent),
      'shadow-rgb': '8, 52, 72',
      'glass-edge': 'rgba(255, 255, 255, 0.95)',
      'glass-lift': '0 18px 40px -24px rgba(6, 40, 62, 0.34), 0 2px 8px -4px rgba(6, 40, 62, 0.2)',
      'glass-wash': 'linear-gradient(158deg, rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.14) 60%)',
      'page-bg': [
        noise(0.1, 0.45, 0.6, 0.3),
        snow(0.8),
        'radial-gradient(120% 70% at 10% -12%, rgba(255, 255, 255, 0.95), transparent 62%)',
        'radial-gradient(90% 60% at 100% 105%, rgba(150, 205, 226, 0.1), transparent 66%)',
        'linear-gradient(165deg, #f4fbfe 0%, #e0eff5 50%, #d3e8f1 100%)',
      ].join(', '),
    },
  },
}

const rawVars = (set: BoardSet, theme: ThemeName) =>
  [
    ...Object.entries(palette[set][theme]).map(([k, v]) => `  --c-${kebab(k)}: ${v};`),
    ...Object.entries(extras[set][theme]).map(([k, v]) => `  --c-${k}: ${v};`),
  ].join('\n')

const tint = (css: string) => css.replaceAll('rgba(0,0,0,', 'rgba(var(--c-shadow-rgb),')
const glow = '0 0 0 1px rgba(var(--c-glow-rgb),0.35), 0 0 24px -4px rgba(var(--c-glow-rgb),0.45)'

const themeBlock = [
  ...Object.keys(palette.atelier.dark).map((k) => `  --color-${kebab(k)}: var(--c-${kebab(k)});`),
  ...Object.entries(font).map(([k, v]) => `  --font-${k}: ${v};`),
  ...Object.entries(fontSize).map(([k, v]) => `  --text-${k}: ${v};`),
  ...Object.entries(radius).map(([k, v]) => `  --radius-${k}: ${v};`),
  ...Object.entries(shadow).map(([k, v]) => `  --shadow-${k}: ${tint(v)};`),
  `  --shadow-glow: ${glow};`,
  ...Object.entries(duration).map(([k, v]) => `  --duration-${k}: ${v}ms;`),
  ...(Object.keys(ease) as (keyof typeof ease)[]).map((k) => `  --ease-${k}: ${cssBezier(k)};`),
].join('\n')

// Wood is the default set, so it matches whenever data-set is neither of the others (including before
// the store sets the attribute). Each set then follows the theme: attribute first, else the OS.
const setSelector = (set: BoardSet) =>
  set === 'wood' ? ":root:not([data-set='glacier']):not([data-set='atelier'])" : `:root[data-set='${set}']`

const setCss = (set: BoardSet) => {
  const root = setSelector(set)
  return `${root} {
  color-scheme: dark;
${rawVars(set, 'dark')}
}

@media (prefers-color-scheme: light) {
  ${root}:not([data-theme='dark']) {
    color-scheme: light;
${rawVars(set, 'light').replaceAll('\n', '\n  ')}
  }
}

${root}[data-theme='light'] {
  color-scheme: light;
${rawVars(set, 'light')}
}

${root}[data-theme='dark'] {
  color-scheme: dark;
${rawVars(set, 'dark')}
}
`
}

const css = `/* Generated by scripts/gen-tokens.ts from src/design/tokens.ts. Do not edit. */
@theme inline {
${themeBlock}
}

${BOARD_SETS.map(setCss).join('\n')}`

writeFileSync(new URL('../src/design/tokens.css', import.meta.url), css)
