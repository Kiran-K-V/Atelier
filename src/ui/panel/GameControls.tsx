import { useState } from 'react'
import type { Color } from '../../rules/types'
import { useGame } from '../../store/game'
import type { Difficulty } from '../../store/types'
import { Button } from '../Button'
import { Segmented } from '../Segmented'
import { labelClass } from '../styles'
import { LEVELS } from './levels'

type Side = 'w' | 'b' | 'random'

const SIDES: readonly { value: Side; label: string }[] = [
  { value: 'w', label: 'White' },
  { value: 'b', label: 'Black' },
  { value: 'random', label: 'Random' },
]

const resolveSide = (side: Side): Color => (side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : side)

function NewGameSheet({ onStart }: { onStart: () => void }) {
  const [side, setSide] = useState<Side>('w')
  const difficulty = useGame((s) => s.difficulty)
  const setDifficulty = useGame((s) => s.setDifficulty)
  const newGame = useGame((s) => s.newGame)

  return (
    <div id="new-game-sheet" className="mb-3 flex flex-col gap-4 rounded-xs bg-surface2 p-4">
      <label className="flex flex-col gap-2.5">
        <span className={labelClass}>Opponent</span>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value) as Difficulty)}
          className="min-h-11 rounded-xs border border-line-strong bg-surface px-3 text-sm text-text focus-visible:outline-2 focus-visible:outline-focus"
        >
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <Segmented legend="Play as" columns={3} options={SIDES} value={side} onChange={setSide} />
      <Button
        variant="primary"
        onClick={() => {
          newGame(resolveSide(side))
          onStart()
        }}
      >
        Start game
      </Button>
    </div>
  )
}

export function GameControls() {
  const [open, setOpen] = useState(false)
  const canUndo = useGame((s) => s.history.length > 0)
  const undo = useGame((s) => s.undo)
  const flipBoard = useGame((s) => s.flipBoard)

  return (
    <div className="border-t border-line px-4 py-4 lg:px-6">
      {open && <NewGameSheet onStart={() => setOpen(false)} />}
      <div className="grid grid-cols-[1fr_1fr_1.5fr] gap-2">
        <Button onClick={undo} disabled={!canUndo}>
          Undo
        </Button>
        <Button onClick={flipBoard}>Flip</Button>
        <Button aria-expanded={open} aria-controls="new-game-sheet" onClick={() => setOpen((o) => !o)}>
          New game
        </Button>
      </div>
    </div>
  )
}
