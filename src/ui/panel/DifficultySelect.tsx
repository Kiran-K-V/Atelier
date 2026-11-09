import type { Difficulty } from '../../store/types'
import { useGame } from '../../store/game'
import { Segmented } from '../Segmented'
import { sectionClass } from '../styles'

const LEVELS: readonly { value: `${Difficulty}`; label: string }[] = [
  { value: '1', label: 'Novice' },
  { value: '2', label: 'Casual' },
  { value: '3', label: 'Club' },
  { value: '4', label: 'Strong' },
  { value: '5', label: 'Expert' },
  { value: '6', label: 'Master' },
]

export function DifficultySelect() {
  const difficulty = useGame((s) => s.difficulty)
  const setDifficulty = useGame((s) => s.setDifficulty)
  return (
    <div className={sectionClass}>
      <Segmented
        legend="Difficulty"
        columns={3}
        options={LEVELS}
        value={`${difficulty}`}
        onChange={(v) => setDifficulty(Number(v) as Difficulty)}
      />
    </div>
  )
}
