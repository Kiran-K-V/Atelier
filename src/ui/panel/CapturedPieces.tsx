import type { Color } from '../../rules/types'
import { glyph } from '../glyphs'
import type { CapturedGroup } from './material'

/**
 * Taken pieces in tight stacks, one stack per type, then the lead as +N.
 * Purely visual: the player row speaks the same facts to screen readers.
 */
export function CapturedPieces({ groups, color, lead }: { groups: readonly CapturedGroup[]; color: Color; lead: number }) {
  if (groups.length === 0 && lead === 0) return null
  return (
    <span aria-hidden className="flex min-w-0 items-center gap-1.5">
      <span className="flex items-center gap-1">
        {groups.map(({ type, count }) => (
          <span key={type} className="flex">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className={`text-[1.25rem] leading-none text-text/80 ${i > 0 ? '-ml-[0.5em]' : ''}`}>
                {glyph(color, type)}
              </span>
            ))}
          </span>
        ))}
      </span>
      {lead > 0 && <span className="text-xs font-semibold tabular-nums text-text">+{lead}</span>}
    </span>
  )
}
