import type { Curriculum, Skill, SkillId, SkillProgress, SkillState } from './types'

export type ProgressMap = Readonly<Partial<Record<SkillId, SkillProgress>>>

export function skillState(skill: Skill, progress: ProgressMap): SkillState {
  const own = progress[skill.id]
  if (own) return own.status
  return skill.prerequisites.every((id) => progress[id]?.status === 'mastered') ? 'recommended' : 'later'
}

/** The skill to suggest next: first in progress, else first recommended, in curriculum order. */
export function nextSkill(curriculum: Curriculum, progress: ProgressMap): Skill | undefined {
  const states = curriculum.skills.map((s) => [s, skillState(s, progress)] as const)
  return states.find(([, st]) => st === 'inProgress')?.[0] ?? states.find(([, st]) => st === 'recommended')?.[0]
}

/** Prerequisites must exist and come earlier, so the map is acyclic and ordered. Returns problems. */
export function validateCurriculum(curriculum: Curriculum): string[] {
  const problems: string[] = []
  const seen = new Set<SkillId>()
  const levels = new Set(curriculum.levels.map((l) => l.id))
  for (const s of curriculum.skills) {
    if (seen.has(s.id)) problems.push(`duplicate skill ${s.id}`)
    if (!levels.has(s.level)) problems.push(`${s.id}: unknown level ${s.level}`)
    for (const p of s.prerequisites) if (!seen.has(p)) problems.push(`${s.id}: prerequisite ${p} missing or later`)
    seen.add(s.id)
  }
  return problems
}
