import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'quiet'

const VARIANT: Record<Variant, string> = {
  // accent-strong, not accent: it keeps text contrast above AA in the light theme.
  primary: 'bg-accent-strong text-accent-ink hover:shadow-glow',
  quiet: 'border border-line-strong text-text hover:bg-surface2 active:bg-surface3',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: Variant
}

export function Button({ variant = 'quiet', className = '', type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center rounded-xs px-4 text-sm font-medium tracking-wide transition-[color,background-color,box-shadow,transform] duration-fast ease-standard active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${VARIANT[variant]} ${className}`}
      {...rest}
    />
  )
}
