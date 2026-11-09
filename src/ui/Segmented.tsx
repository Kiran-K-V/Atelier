import { useId } from 'react'
import { labelClass } from './styles'

interface Option<T extends string> {
  readonly value: T
  readonly label: string
}

interface SegmentedProps<T extends string> {
  readonly legend: string
  readonly options: readonly Option<T>[]
  readonly value: T
  readonly onChange: (value: T) => void
  readonly columns: 2 | 3 | 4
}

const COLUMNS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const

/** Radio group drawn as a hairline grid. Native radios give arrow-key navigation for free. */
export function Segmented<T extends string>({ legend, options, value, onChange, columns }: SegmentedProps<T>) {
  const name = useId()
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className={`${labelClass} mb-2.5 p-0`}>{legend}</legend>
      <div className={`grid ${COLUMNS[columns]} gap-px overflow-hidden rounded-sm border border-line bg-line`}>
        {options.map((o) => (
          <label
            key={o.value}
            className="relative flex min-h-11 cursor-pointer select-none items-center justify-center bg-surface px-2 text-sm text-text-muted transition-colors duration-fast ease-standard hover:bg-surface2 hover:text-text has-checked:bg-surface3 has-checked:text-text has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-focus"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            {o.label}
            <span
              aria-hidden
              className="absolute inset-x-3 bottom-0 h-0.5 origin-left scale-x-0 bg-accent transition-transform duration-base ease-standard peer-checked:scale-x-100"
            />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
