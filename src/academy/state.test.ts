import { describe, expect, it } from 'vitest'
import { curriculum } from './curriculum'
import { nextSkill, skillState, validateCurriculum, type ProgressMap } from './state'
import { skillId, type Curriculum, type Skill } from './types'

const a: Skill = { id: skillId('a'), level: 'foundations', title: 'A', summary: '', objectives: [], prerequisites: [], minutes: 1, map: { col: 0 } }
const b: Skill = { ...a, id: skillId('b'), title: 'B', prerequisites: [a.id] }
const tiny: Curriculum = { levels: [{ id: 'foundations', title: 'F', summary: '' }], skills: [a, b] }
const mastered = (at = 1) => ({ status: 'mastered' as const, updatedAt: at })

describe('skillState', () => {
  it('recommends a skill with no prerequisites', () => {
    expect(skillState(a, {})).toBe('recommended')
  })
  it('marks a skill later until every prerequisite is mastered', () => {
    expect(skillState(b, {})).toBe('later')
    expect(skillState(b, { [a.id]: { status: 'inProgress', updatedAt: 1 } })).toBe('later')
    expect(skillState(b, { [a.id]: mastered() })).toBe('recommended')
  })
  it('reports own progress first, even when prerequisites are missing', () => {
    expect(skillState(b, { [b.id]: { status: 'inProgress', updatedAt: 1 } })).toBe('inProgress')
  })
})

describe('nextSkill', () => {
  it('prefers a skill in progress over a recommended one', () => {
    const p: ProgressMap = { [b.id]: { status: 'inProgress', updatedAt: 1 } }
    expect(nextSkill(tiny, p)?.id).toBe(b.id)
  })
  it('returns undefined when everything is mastered', () => {
    expect(nextSkill(tiny, { [a.id]: mastered(), [b.id]: mastered() })).toBeUndefined()
  })
})

describe('validateCurriculum', () => {
  it('accepts the shipped curriculum', () => {
    expect(validateCurriculum(curriculum)).toEqual([])
  })
  it('rejects a prerequisite that comes later', () => {
    expect(validateCurriculum({ ...tiny, skills: [b, a] })).toEqual(['b: prerequisite a missing or later'])
  })
  it('gives every tactic kind at most one skill, so Play can link to it', () => {
    const tactics = curriculum.skills.flatMap((s) => (s.tactic ? [s.tactic] : []))
    expect(new Set(tactics).size).toBe(tactics.length)
  })
})
