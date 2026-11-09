import { create } from 'zustand'

interface AnnouncerState {
  readonly text: string
  /** Lets the same sentence be announced twice in a row. */
  readonly nonce: number
  readonly at: number
}

const JOIN_WINDOW_MS = 600

export const useAnnouncements = create<AnnouncerState>(() => ({ text: '', nonce: 0, at: 0 }))

/**
 * "replace" suits cursor feedback, where only the latest square matters.
 * "join" suits game events: a move and "Stockfish is thinking" often arrive together,
 * and a plain replace would drop the move before a screen reader says it.
 */
export function announce(text: string, mode: 'replace' | 'join' = 'replace'): void {
  const now = Date.now()
  useAnnouncements.setState((s) => ({
    text: mode === 'join' && now - s.at < JOIN_WINDOW_MS && s.text ? `${s.text}. ${text}` : text,
    nonce: s.nonce + 1,
    at: now,
  }))
}
