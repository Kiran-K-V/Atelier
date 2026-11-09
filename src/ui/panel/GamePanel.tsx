import { SettingsPanel } from '../SettingsPanel'
import { labelClass } from '../styles'
import { CapturedSummary } from './CapturedSummary'
import { DifficultySelect } from './DifficultySelect'
import { GameControls } from './GameControls'
import { MoveList } from './MoveList'
import { StatusLine } from './StatusLine'

export function GamePanel() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="relative flex items-center justify-between px-4 pb-4 pt-5 lg:px-6">
        <h2 className={`${labelClass} m-0 font-normal`}>Match</h2>
        <SettingsPanel />
      </header>
      <StatusLine />
      <CapturedSummary />
      <MoveList />
      <DifficultySelect />
      <GameControls />
    </div>
  )
}
