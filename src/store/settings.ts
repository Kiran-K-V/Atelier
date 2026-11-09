import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { QualityTier, SettingsActions, SettingsState, ThemePreference } from './types'

const REDUCE_QUERY = '(prefers-reduced-motion: reduce)'
const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark']
const TIERS: readonly QualityTier[] = ['low', 'medium', 'high']

type Persisted = Pick<SettingsState, 'theme' | 'quality' | 'qualityAuto' | 'reducedMotionUser' | 'sound' | 'tactics'>

const canMatchMedia = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function'

const systemPrefersReducedMotion = (): boolean => canMatchMedia() && window.matchMedia(REDUCE_QUERY).matches

// Storage throws in private mode, with blocked site data, and in the node test env.
const safeStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Settings still work for this session.
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // Nothing to remove.
    }
  },
}

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T => list.includes(value as T)

/** Stored JSON is untrusted: keep only fields that have the right type. */
function readPersisted(raw: unknown): Partial<Persisted> {
  if (typeof raw !== 'object' || raw === null) return {}
  const r = raw as Record<string, unknown>
  const out: { -readonly [K in keyof Persisted]?: Persisted[K] } = {}
  if (isOneOf(THEMES, r.theme)) out.theme = r.theme
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
      quality: 'high',
      qualityAuto: true,
      reducedMotion: systemPrefersReducedMotion(),
      reducedMotionUser: null,
      sound: true,
      tactics: true,

      setTheme: (theme) => set({ theme }),
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
function applyToDocument({ theme, reducedMotion }: SettingsState): void {
  const root = document.documentElement
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
