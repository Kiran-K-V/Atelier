import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ProgressMap } from '../academy/state'
import type { SkillId, SkillProgress } from '../academy/types'
import { safeStorage } from './storage'

interface ProgressState {
  readonly skills: ProgressMap
  /** Marks a skill started; never downgrades a mastered skill. */
  start: (id: SkillId) => void
  master: (id: SkillId) => void
  reset: () => void
}

const STATUSES: readonly SkillProgress['status'][] = ['inProgress', 'mastered']

/** Stored JSON is untrusted: keep only well-formed entries. */
function readSkills(raw: unknown): ProgressMap {
  if (typeof raw !== 'object' || raw === null) return {}
  const skills = (raw as { skills?: unknown }).skills
  if (typeof skills !== 'object' || skills === null) return {}
  const out: Partial<Record<SkillId, SkillProgress>> = {}
  for (const [id, v] of Object.entries(skills)) {
    const e = v as Partial<SkillProgress> | null
    if (e && STATUSES.includes(e.status as SkillProgress['status']) && typeof e.updatedAt === 'number') {
      out[id as SkillId] = { status: e.status as SkillProgress['status'], updatedAt: e.updatedAt }
    }
  }
  return out
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      skills: {},
      start: (id) =>
        set((s) => (s.skills[id] ? s : { skills: { ...s.skills, [id]: { status: 'inProgress', updatedAt: Date.now() } } })),
      master: (id) => set((s) => ({ skills: { ...s.skills, [id]: { status: 'mastered', updatedAt: Date.now() } } })),
      reset: () => set({ skills: {} }),
    }),
    {
      name: 'atelier-progress',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ skills: s.skills }),
      merge: (persisted, current) => ({ ...current, skills: readSkills(persisted) }),
    },
  ),
)
