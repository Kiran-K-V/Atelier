import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

/*
 * One button system for the app. Every variant shares the base: 44px tall on touch screens, 40px on desktop,
 * a 2px focus ring, a 1px press. Colours come only from tokens, so both board sets read correctly.
 * Disabled buttons drop to a hairline outline with faint text: clearly "not now", never a half-rendered fill.
 */
const BASE =
  'relative inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-sm text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-fast ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus enabled:active:translate-y-px disabled:cursor-not-allowed lg:min-h-10'

const VARIANT: Record<Variant, string> = {
  // accent-strong, not accent: it keeps text contrast above AA in the light theme.
  // A soft accent-tinted drop shadow lifts the one call to action off the panel.
  primary:
    'bg-accent-strong text-accent-ink shadow-[0_8px_20px_-10px_rgba(var(--c-glow-rgb),0.7),var(--shadow-sm)] enabled:hover:shadow-glow enabled:active:shadow-[inset_0_1px_2px_rgba(var(--c-shadow-rgb),0.35)] disabled:bg-transparent disabled:text-text-faint disabled:shadow-none disabled:ring-1 disabled:ring-inset disabled:ring-line',
  // The inset top line matches the glass panel edge (glacier only; atelier has no --c-glass-edge).
  secondary:
    'border border-line-strong bg-surface2 text-text shadow-[inset_0_1px_0_var(--c-glass-edge,transparent),var(--shadow-sm)] enabled:hover:border-accent/50 enabled:hover:bg-surface3 enabled:active:bg-surface3 enabled:active:shadow-none disabled:border-dashed disabled:border-line-strong disabled:bg-transparent disabled:text-text-faint disabled:shadow-none',
  ghost: 'text-text-muted enabled:hover:bg-surface2 enabled:hover:text-text enabled:active:bg-surface3 disabled:text-text-faint',
}

interface ButtonProps extends ComponentProps<'button'> {
  readonly variant?: Variant
  /** Square icon-only button. Give it an aria-label. */
  readonly iconOnly?: boolean
  readonly icon?: ReactNode
}

export function Button({ variant = 'secondary', iconOnly = false, icon, className = '', type = 'button', children, ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${BASE} ${iconOnly ? 'size-11 lg:size-10' : 'px-4'} ${VARIANT[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  )
}
