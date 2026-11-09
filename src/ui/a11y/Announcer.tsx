import { useEffect, useRef } from 'react'
import { useGame } from '../../store/game'
import { announce, useAnnouncements } from './announce'
import { describeMove } from './describeMove'

/** Turns game state changes into spoken sentences. Renders nothing visible. */
function useGameAnnouncements(): void {
  const history = useGame((s) => s.history)
  const status = useGame((s) => s.status)
  const engine = useGame((s) => s.engine)
  const illegalNonce = useGame((s) => s.illegalAttempt?.nonce)

  const seenPlies = useRef(history.length)
  const seenEngine = useRef(engine)
  const seenIllegal = useRef(illegalNonce)

  useEffect(() => {
    const previous = seenPlies.current
    seenPlies.current = history.length
    const last = history.at(-1)
    if (history.length > previous && last) announce(describeMove(last, status), 'join')
    else if (history.length === 0 && previous > 0) announce('New game', 'join')
    else if (history.length < previous) announce('Move undone', 'join')
  }, [history, status])

  useEffect(() => {
    const previous = seenEngine.current
    seenEngine.current = engine
    if (engine === previous) return
    if (engine === 'thinking') announce('Stockfish is thinking', 'join')
    else if (engine === 'error') announce('Stockfish could not load', 'join')
  }, [engine])

  useEffect(() => {
    if (illegalNonce === seenIllegal.current) return
    seenIllegal.current = illegalNonce
    if (illegalNonce !== undefined) announce('Illegal move', 'join')
  }, [illegalNonce])
}

export function Announcer() {
  useGameAnnouncements()
  const { text, nonce } = useAnnouncements()
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {text}
      {nonce % 2 === 1 ? ' ' : ''}
    </div>
  )
}
