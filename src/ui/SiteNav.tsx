import { Link, useLocation } from 'wouter'

const ITEMS = [
  { href: '/', label: 'Play', active: (path: string) => path === '/' },
  { href: '/academy', label: 'Academy', active: (path: string) => path === '/academy' || path.startsWith('/academy/') },
] as const

/** Play / Academy switch. Two links, the current one marked with aria-current. */
export function SiteNav({ className = '' }: { readonly className?: string }) {
  const [path] = useLocation()
  return (
    <nav aria-label="Primary" className={`inline-flex items-center rounded-xs border border-line-strong bg-surface/80 p-0.5 backdrop-blur-sm ${className}`}>
      {ITEMS.map(({ href, label, active }) => {
        const current = active(path)
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={`inline-flex min-h-9 items-center rounded-xs px-3 font-mono text-xs uppercase tracking-[0.16em] no-underline transition-[color,background-color] duration-fast ease-standard ${current ? 'bg-surface3 text-accent-strong shadow-[inset_0_-2px_0_var(--color-accent)]' : 'text-text-muted hover:bg-surface2 hover:text-text'}`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
