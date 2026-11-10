import { useId } from 'react'
import { BOARD_SETS, sceneSets, type BoardSet } from '../design/tokens'
import { useSettings } from '../store/settings'

const LABEL: Record<BoardSet, string> = { wood: 'Wood', glacier: 'Glacier', atelier: 'Atelier' }

/** A two-by-two checker of the set's own squares: what the board will look like. */
const swatch = (set: BoardSet) => {
  const { squareLight: light, squareDark: dark } = sceneSets[set]
  return { backgroundImage: `repeating-conic-gradient(${light} 0% 25%, ${dark} 0% 50%)`, backgroundSize: '100% 100%' }
}

/**
 * Board set switch: one pill, a swatch per set, the current one raised. Native radios, so arrow keys
 * move between sets and a screen reader announces the group. Same 44px / 40px height as the nav beside it.
 */
export function BoardSetSwitch({ className = '' }: { readonly className?: string }) {
  const name = useId()
  const boardSet = useSettings((s) => s.boardSet)
  const setBoardSet = useSettings((s) => s.setBoardSet)
  return (
    <fieldset className={`glass m-0 inline-flex h-11 min-w-0 items-stretch gap-0.5 rounded-sm border border-line bg-surface p-1 lg:h-10 ${className}`}>
      <legend className="sr-only">Board set</legend>
      {BOARD_SETS.map((set) => (
        <label
          key={set}
          title={LABEL[set]}
          className="relative inline-flex cursor-pointer select-none items-center gap-2 rounded-[6px] px-2 text-sm font-medium text-text-muted transition-[color,background-color,box-shadow] duration-fast ease-standard hover:bg-surface2 hover:text-text has-checked:bg-surface3 has-checked:text-text has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-focus"
        >
          <input
            type="radio"
            name={name}
            value={set}
            checked={boardSet === set}
            onChange={() => setBoardSet(set)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="size-5 shrink-0 rounded-full border border-line-strong transition-[box-shadow,transform] duration-fast ease-standard peer-checked:scale-110 peer-checked:shadow-[0_0_0_2px_var(--color-accent-strong)]"
            style={swatch(set)}
          />
          <span className="hidden sm:inline">{LABEL[set]}</span>
          <span className="sr-only sm:hidden">{LABEL[set]}</span>
        </label>
      ))}
    </fieldset>
  )
}
