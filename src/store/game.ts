import { Chess } from 'chess.js'
import { create } from 'zustand'
import type { Move } from 'chess.js'
import { isAbortError, StockfishEngine } from '../engine/engine'
import type { ChessEngine } from '../engine/engine'
import { checkersOf, checkSquareOf, isPromotionMove, legalTargets, statusOf, toPlayedMove } from '../rules/game'
import { applyMove, initialPieces, piecesFromBoard } from '../rules/pieces'
import type { Color, MoveIntent, PieceInstance, Square } from '../rules/types'
import type { GameActions, GameState } from './types'

type Store = GameState & GameActions

// chess.js is the rules authority. It lives outside React state so it is never copied or diffed.
const chess = new Chess()
let basePieces: readonly PieceInstance[] = initialPieces()

let createEngine: () => ChessEngine = () => new StockfishEngine()
let engine: ChessEngine | null = null
let enginePromise: Promise<ChessEngine> | null = null
/** Bumped by newGame/undo/load so late engine replies can be recognised and dropped. */
let epoch = 0

export function setEngineFactory(factory: () => ChessEngine): void {
  epoch++
  engine?.dispose()
  engine = null
  enginePromise = null
  createEngine = factory
  useGame.setState({ engine: 'loading' })
  warmUp()
}

function warmUp(): void {
  ensureEngine().catch(() => {})
}

function ensureEngine(): Promise<ChessEngine> {
  if (enginePromise) return enginePromise
  const p: Promise<ChessEngine> = startEngine().catch((err: unknown) => {
    if (enginePromise === p) {
      engine?.dispose()
      engine = null
      enginePromise = null
      useGame.setState({ engine: 'error' })
    }
    throw err
  })
  enginePromise = p
  return p
}

async function startEngine(): Promise<ChessEngine> {
  const e = createEngine()
  engine = e
  await e.init()
  if (engine === e && useGame.getState().engine === 'loading') useGame.setState({ engine: 'ready' })
  return e
}

function position(): Pick<GameState, 'fen' | 'turn' | 'status' | 'checkSquare' | 'checkers'> {
  return {
    fen: chess.fen(),
    turn: chess.turn(),
    status: statusOf(chess),
    checkSquare: checkSquareOf(chess),
    checkers: checkersOf(chess),
  }
}

const NO_SELECTION = { selected: null, legalTargets: [], pendingPromotion: null } as const

function freshState(playerColor: Color) {
  return {
    ...position(),
    ...NO_SELECTION,
    pieces: basePieces,
    history: [],
    playerColor,
    orientation: playerColor,
    cursor: null,
    illegalAttempt: null,
  }
}

function playChess(intent: MoveIntent): Move | null {
  try {
    return chess.move({ from: intent.from, to: intent.to, promotion: intent.promotion })
  } catch {
    return null
  }
}

/** Plays on chess.js and records it in pieces/history/status. Null when illegal. */
function commitMove(intent: MoveIntent): boolean {
  const move = playChess(intent)
  if (!move) return false
  const s = useGame.getState()
  const applied = applyMove(s.pieces, move)
  const played = toPlayedMove(move, s.history.length + 1, applied.captured, applied.rookMove, chess)
  useGame.setState({
    ...position(),
    ...NO_SELECTION,
    pieces: applied.pieces,
    history: [...s.history, played],
  })
  return true
}

function settledEngineState(s: GameState): GameState['engine'] {
  return s.engine === 'thinking' ? 'ready' : s.engine
}

async function engineTurn(): Promise<void> {
  const start = useGame.getState()
  if (start.status.kind !== 'playing' || start.turn === start.playerColor) return
  const myEpoch = epoch
  try {
    const eng = await ensureEngine()
    if (epoch !== myEpoch) return
    useGame.setState({ engine: 'thinking' })
    const intent = await eng.bestMove(chess.fen(), useGame.getState().difficulty)
    if (epoch !== myEpoch) return
    if (!commitMove(intent)) throw new Error('Engine returned an illegal move')
    useGame.setState({ engine: 'ready' })
  } catch (err) {
    if (isAbortError(err) || epoch !== myEpoch) return
    useGame.setState({ engine: 'error' })
  }
}

function isOwnPieceToMove(s: GameState, square: Square): boolean {
  return s.status.kind === 'playing' && s.turn === s.playerColor && chess.get(square)?.color === s.playerColor
}


function rejectMove(square: Square): void {
  const prev = useGame.getState().illegalAttempt
  const nonce = Math.max(Date.now(), (prev?.nonce ?? 0) + 1)
  useGame.setState({ ...NO_SELECTION, illegalAttempt: { square, nonce } })
}

function submitPlayerMove(intent: MoveIntent): boolean {
  const s = useGame.getState()
  if (s.pendingPromotion) return false
  const { from, to } = intent
  const legal =
    isOwnPieceToMove(s, from) && legalTargets(chess, from).includes(to)
  if (!legal) {
    rejectMove(from)
    return false
  }
  if (!isPromotionMove(chess, from, to)) {
    commitMove({ from, to })
  } else if (intent.promotion) {
    commitMove(intent)
  } else {
    useGame.setState({ pendingPromotion: { from, to }, selected: from, legalTargets: legalTargets(chess, from) })
    return true
  }
  void engineTurn()
  return true
}

function select(square: Square): void {
  useGame.setState({ selected: square, legalTargets: legalTargets(chess, square), pendingPromotion: null })
}

/** Resets everything that belongs to one game and cancels any engine work. */
function resetSession(playerColor: Color): void {
  epoch++
  engine?.stop()
  const settled = settledEngineState(useGame.getState())
  useGame.setState({ ...freshState(playerColor), engine: settled })
  void engineTurn()
}

export const useGame = create<Store>()((set, get) => ({
  ...freshState('w'),
  difficulty: 3,
  engine: 'loading',

  clickSquare: (square) => {
    const s = get()
    if (s.pendingPromotion || s.status.kind !== 'playing') return
    if (!s.selected) {
      if (isOwnPieceToMove(s, square)) select(square)
      return
    }
    if (square === s.selected) {
      set(NO_SELECTION)
    } else if (s.legalTargets.includes(square)) {
      submitPlayerMove({ from: s.selected, to: square })
    } else if (isOwnPieceToMove(s, square)) {
      select(square)
    } else {
      rejectMove(s.selected)
    }
  },

  hoverSquare: (square) => {
    const s = get()
    if (s.selected || s.pendingPromotion) return
    if (square && isOwnPieceToMove(s, square)) {
      set({ legalTargets: legalTargets(chess, square) })
    } else if (s.legalTargets.length > 0) {
      set({ legalTargets: [] })
    }
  },

  tryMove: (intent) => submitPlayerMove(intent),

  choosePromotion: (piece) => {
    const pending = get().pendingPromotion
    if (!pending) return
    if (commitMove({ ...pending, promotion: piece })) void engineTurn()
    else rejectMove(pending.from)
  },

  cancelPromotion: () => set(NO_SELECTION),

  moveCursor: (square) => set({ cursor: square }),

  newGame: (playerColor) => {
    chess.reset()
    basePieces = initialPieces()
    resetSession(playerColor)
  },

  undo: () => {
    const s = get()
    if (chess.history().length === 0) return
    epoch++
    engine?.stop()
    do {
      chess.undo()
    } while (chess.turn() !== s.playerColor && chess.history().length > 0)
    const moves = chess.history({ verbose: true })
    const pieces = moves.reduce<readonly PieceInstance[]>((acc, m) => applyMove(acc, m).pieces, basePieces)
    set({
      ...position(),
      ...NO_SELECTION,
      pieces,
      history: s.history.slice(0, moves.length),
      illegalAttempt: null,
      engine: settledEngineState(s),
    })
    void engineTurn()
  },

  flipBoard: () => set((s) => ({ orientation: s.orientation === 'w' ? 'b' : 'w' })),

  setDifficulty: (difficulty) => set({ difficulty }),
}))

/** Test helper: replaces the game with the position in `fen`. */
export function loadFenForTest(fen: string, playerColor: Color = 'w'): void {
  chess.load(fen)
  basePieces = piecesFromBoard(chess.board())
  resetSession(playerColor)
}

warmUp()
