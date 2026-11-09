import { labelClass } from './styles'
import { SiteNav } from './SiteNav'

/** Brand lockup. Used inline in the Academy header. */
export function Wordmark() {
  return (
    <div className="flex items-baseline gap-3">
      <span className="atelier-wordmark text-3xl font-normal leading-none text-text">Atelier</span>
      <span className={`${labelClass} border-l border-line-strong pl-3`}>Chess</span>
    </div>
  )
}

/** Play page lockup: the heading over the board, with the Play/Academy switch beside it. */
export function PlayWordmark() {
  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-3 lg:left-8 lg:top-7 lg:flex-row lg:items-baseline lg:gap-6">
      <div className="flex items-baseline gap-3">
        <h1 className="atelier-wordmark m-0 text-3xl font-normal leading-none text-text lg:text-5xl">Atelier</h1>
        <span className={`${labelClass} border-l border-line-strong pl-3`}>Chess</span>
      </div>
      <SiteNav className="pointer-events-auto self-start" />
    </div>
  )
}
