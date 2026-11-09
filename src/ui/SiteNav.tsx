import { Link, useLocation } from 'wouter'

const ITEMS = [
  { href: '/', label: 'Play', active: (path: string) => path === '/' },
  { href: '/academy', label: 'Academy', active: (path: string) => path === '/academy' || path.startsWith('/academy/') },
] as const

/**
 * Play / Academy switch, drawn as a segmented control: one track, the current page as a raised thumb.
 * Two links, the current one marked with aria-current. 44px tall on touch screens, 40px on desktop.
 */
export function SiteNav({ className = '' }: { readonly className?: string }) {
  const [path] = useLocation()
  return (
    <nav aria-label="Primary" className={`glass inline-flex h-11 items-stretch gap-0.5 rounded-sm border border-line bg-surface p-1 lg:h-10 ${className}`}>
      {ITEMS.map(({ href, label, active }) => {
        const current = active(path)
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={`inline-flex items-center rounded-[6px] px-3.5 text-sm font-medium no-underline transition-[color,background-color,box-shadow] duration-fast ease-standard ${current ? 'bg-surface3 text-text shadow-[inset_0_1px_0_var(--c-glass-edge,transparent),var(--shadow-sm)]' : 'text-text-muted hover:bg-surface2 hover:text-text'}`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
