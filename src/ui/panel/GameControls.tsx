import { useState } from 'react'
import type { Color } from '../../rules/types'
import { useGame } from '../../store/game'
import { Button } from '../Button'
import { Segmented } from '../Segmented'
import { sectionClass } from '../styles'

type Side = 'w' | 'b' | 'random'

const SIDES: readonly { value: Side; label: string }[] = [
  { value: 'w', label: 'White' },
  { value: 'b', label: 'Black' },
  { value: 'random', label: 'Random' },
]

const resolveSide = (side: Side): Color => (side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : side)

export function GameControls() {
  const [side, setSide] = useState<Side>('w')
  const canUndo = useGame((s) => s.history.length > 0)
  const newGame = useGame((s) => s.newGame)
  const undo = useGame((s) => s.undo)
  const flipBoard = useGame((s) => s.flipBoard)

  return (
    <div className={`${sectionClass} flex flex-col gap-5`}>
      <Segmented legend="Play as" columns={3} options={SIDES} value={side} onChange={setSide} />
      <Button variant="primary" onClick={() => newGame(resolveSide(side))}>
        New game
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={undo} disabled={!canUndo}>
          Undo
        </Button>
        <Button onClick={flipBoard}>Flip board</Button>
      </div>
    </div>
  )
}
