import type { ReactNode } from 'react'
import { BoardSetSwitch } from '../BoardSetSwitch'
import { SiteNav } from '../SiteNav'
import { Wordmark } from '../Wordmark'

/** Shared frame for Academy pages: header with brand and nav, scrollable main, capped width. */
export function AcademyLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-bg app-bg text-text">
      <header className="glass shrink-0 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 lg:px-8 lg:py-4">
          <Wordmark />
          <div className="flex flex-wrap items-center gap-3">
            <SiteNav />
            <BoardSetSwitch />
          </div>
        </div>
      </header>
      <main className="atelier-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8 lg:py-12">{children}</div>
      </main>
    </div>
  )
}
