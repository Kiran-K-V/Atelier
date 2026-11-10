import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { BOARD_SETS } from '../design/tokens'
import { safeStorage } from './storage'
import type { QualityTier, SettingsActions, SettingsState, ThemePreference } from './types'

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'
const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark']
const TIERS: readonly QualityTier[] = ['low', 'medium', 'high']

type Persisted = Pick<SettingsState, 'theme' | 'boardSet' | 'quality' | 'qualityAuto' | 'reducedMotionUser' | 'sound' | 'tactics'>

const canMatchMedia = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

const systemPrefersReducedMotion = (): boolean => canMatchMedia() && window.matchMedia(REDUCE_QUERY).matches

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T => list.includes(value as T)

/** Stored JSON is untrusted: keep only fields that have the right type. */
function readPersisted(raw: unknown): Partial<Persisted> {
  if (typeof raw !== 'object' || raw === null) return {}
  const r = raw as Record<string, unknown>
  const out: { -readonly [K in keyof Persisted]?: Persisted[K] } = {}
  if (isOneOf(THEMES, r.theme)) out.theme = r.theme
  if (isOneOf(BOARD_SETS, r.boardSet)) out.boardSet = r.boardSet
  if (isOneOf(TIERS, r.quality)) out.quality = r.quality
  if (typeof r.qualityAuto === 'boolean') out.qualityAuto = r.qualityAuto
  if (typeof r.reducedMotionUser === 'boolean' || r.reducedMotionUser === null) out.reducedMotionUser = r.reducedMotionUser
  if (typeof r.sound === 'boolean') out.sound = r.sound
  if (typeof r.tactics === 'boolean') out.tactics = r.tactics
  return out
}

export const useSettings = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      theme: 'system',
      boardSet: 'wood',
      quality: 'high',
      qualityAuto: false,
      reducedMotion: systemPrefersReducedMotion(),
      reducedMotionUser: null,
      sound: true,
      tactics: true,

      setTheme: (theme) => set({ theme }),
      setBoardSet: (boardSet) => set({ boardSet }),
      setQuality: (q) => set(q === 'auto' ? { qualityAuto: true } : { quality: q, qualityAuto: false }),
      setDetectedQuality: (quality) => set((s) => (s.qualityAuto ? { quality } : s)),
      setReducedMotion: (v) => set({ reducedMotionUser: v, reducedMotion: v ?? systemPrefersReducedMotion() }),
      setSound: (sound) => set({ sound }),
      setTactics: (tactics) => set({ tactics }),
    }),
    {
      name: 'atelier-settings',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s): Persisted => ({
        theme: s.theme,
        boardSet: s.boardSet,
        quality: s.quality,
        qualityAuto: s.qualityAuto,
        reducedMotionUser: s.reducedMotionUser,
        sound: s.sound,
        tactics: s.tactics,
      }),
      merge: (persisted, current) => {
        const next = { ...current, ...readPersisted(persisted) }
        return { ...next, reducedMotion: next.reducedMotionUser ?? systemPrefersReducedMotion() }
      },
    },
  ),
)

// The root element carries the theme and motion mode so CSS can react without React.
function applyToDocument({ theme, boardSet, reducedMotion }: SettingsState): void {
  const root = document.documentElement
  root.setAttribute('data-set', boardSet)
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  root.setAttribute('data-motion', reducedMotion ? 'reduce' : 'full')
}

if (typeof document !== 'undefined') {
  applyToDocument(useSettings.getState())
  useSettings.subscribe(applyToDocument)
}

if (canMatchMedia()) {
  window.matchMedia(REDUCE_QUERY).addEventListener('change', (event) => {
    useSettings.setState((s) => ({ reducedMotion: s.reducedMotionUser ?? event.matches }))
  })
}
