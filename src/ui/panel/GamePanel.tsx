import { useGame } from '../../store/game'
import { SettingsPanel } from '../SettingsPanel'
import { GameControls } from './GameControls'
import { MoveList } from './MoveList'
import { PlayerCard } from './PlayerCard'
import { StatusLine } from './StatusLine'

/** Top to bottom: status, the opponent's side, the score, your side, then the controls. */
export function GamePanel() {
  const orientation = useGame((s) => s.orientation)
  const top = orientation === 'w' ? 'b' : 'w'

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 lg:px-5 lg:pb-4 lg:pt-5">
        <StatusLine />
        <SettingsPanel />
      </header>
      <PlayerCard color={top} />
      <MoveList />
      <PlayerCard color={orientation} />
      <GameControls />
    </div>
  )
}
