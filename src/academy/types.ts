import type { TacticKind } from '../rules/types'

declare const skillBrand: unique symbol
/** A skill (one lesson node on the map). Branded so a plain string cannot pass as one. */
export type SkillId = string & { readonly [skillBrand]: true }
export const skillId = (id: string) => id as SkillId

export type LevelId = 'foundations' | 'tactics-1' | 'checkmates' | 'openings' | 'endgames' | 'tactics-2'

export interface Level {
  readonly id: LevelId
  readonly title: string
  readonly summary: string
}

export interface Skill {
  readonly id: SkillId
  readonly level: LevelId
  readonly title: string
  /** One sentence for the map card. */
  readonly summary: string
  /** What the learner can do after mastering it; shown on the lesson page. */
  readonly objectives: readonly string[]
  /** Soft prerequisites: the map recommends this skill once all are mastered (A2). */
  readonly prerequisites: readonly SkillId[]
  /** The tactic this skill teaches, so a tactic seen in Play can link here. */
  readonly tactic?: TacticKind
  readonly minutes: number
  /** Map placement in grid units: column within the level band, row = level order. */
  readonly map: { readonly col: number }
}

export interface Curriculum {
  readonly levels: readonly Level[]
  readonly skills: readonly Skill[]
}

/** What the learner has done with a skill. Absent = never opened. */
export type SkillProgress = { readonly status: 'inProgress' | 'mastered'; readonly updatedAt: number }

/**
 * How the map shows a skill. Locks are soft: `later` is still openable, it just is not
 * recommended yet because a prerequisite is not mastered.
 */
export type SkillState = 'later' | 'recommended' | 'inProgress' | 'mastered'
