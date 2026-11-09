import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'

/**
 * While the host component is mounted: move focus inside, keep Tab inside, route Escape,
 * and give focus back to whatever had it before. Mark the first target with data-autofocus.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, onEscape: () => void): void {
  const escape = useRef(onEscape)
  useEffect(() => {
    escape.current = onEscape
  })

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? root
    first.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        escape.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const start = items[0]
      const end = items.at(-1)
      if (!start || !end) {
        event.preventDefault()
        return
      }
      const active = document.activeElement
      if (event.shiftKey && (active === start || active === root)) {
        event.preventDefault()
        end.focus()
      } else if (!event.shiftKey && active === end) {
        event.preventDefault()
        start.focus()
      }
    }
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [ref])
}
