import { labelClass } from './styles'

export function Wordmark() {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-baseline gap-3 lg:left-8 lg:top-7">
      <h1 className="atelier-wordmark m-0 text-3xl font-normal leading-none text-text lg:text-5xl">Atelier</h1>
      <span className={`${labelClass} border-l border-line-strong pl-3`}>Chess</span>
    </div>
  )
}
