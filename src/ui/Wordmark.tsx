import { BoardSetSwitch } from './BoardSetSwitch'
import { SiteNav } from './SiteNav'

/** Brand name. One type treatment: the display serif. Its 40px line box matches the nav height. */
export function Wordmark({ as: Tag = 'span' }: { readonly as?: 'span' | 'h1' }) {
  return <Tag className="atelier-wordmark m-0 text-[2.125rem] font-normal leading-10 text-text lg:text-[2.375rem]">Atelier</Tag>
}

/** Play page header over the board: wordmark and nav share one 40px row, split by a hairline. */
export function PlayWordmark() {
  return (
    <div className="pointer-events-none absolute inset-x-4 top-3 z-10 flex items-center gap-4 lg:inset-x-8 lg:top-6 lg:gap-5">
      <Wordmark as="h1" />
      <span aria-hidden className="h-6 w-px bg-line-strong" />
      <SiteNav className="pointer-events-auto" />
      <BoardSetSwitch className="pointer-events-auto ml-auto" />
    </div>
  )
}
