import type { Difficulty } from '../../store/types'

export const LEVELS: readonly { value: Difficulty; label: string }[] = [
  { value: 1, label: 'Novice' },
  { value: 2, label: 'Casual' },
  { value: 3, label: 'Club' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Expert' },
  { value: 6, label: 'Master' },
]

export const levelName = (d: Difficulty): string => LEVELS.find((l) => l.value === d)?.label ?? ''
