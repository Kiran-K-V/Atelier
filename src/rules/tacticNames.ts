import type { TacticKind } from './types'

/** Callout word shown over the board. */
export const TACTIC_LABEL: Record<TacticKind, string> = {
  doubleCheck: 'Double check!',
  discovered: 'Discovered!',
  fork: 'Fork!',
  skewer: 'Skewer!',
  pin: 'Pin!',
  backRank: 'Back rank!',
  sacrifice: 'Sacrifice!',
}

/** Plain name for move lists and screen readers. */
export const TACTIC_NAME: Record<TacticKind, string> = {
  doubleCheck: 'double check',
  discovered: 'discovered attack',
  fork: 'fork',
  skewer: 'skewer',
  pin: 'pin',
  backRank: 'back-rank threat',
  sacrifice: 'sacrifice',
}
