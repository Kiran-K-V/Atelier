import { useGame } from '../../store/game'
import { SettingsPanel } from '../SettingsPanel'
import { GameControls } from './GameControls'
import { MoveList } from './MoveList'
import { PlayerCard } from './PlayerCard'
import { StatusLine } from './StatusLine'

export function GamePanel() {
  const orientation = useGame((s) => s.orientation)
  const top = orientation === 'w' ? 'b' : 'w'

  return (
    <div className="flex min-h-full flex-col">
      <header className="relative flex items-start justify-between gap-3 px-4 pb-5 pt-5 lg:px-6">
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
