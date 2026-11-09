import { skillId as id, type Curriculum, type Level, type Skill } from './types'

const levels: readonly Level[] = [
  { id: 'foundations', title: 'Foundations', summary: 'The board, how each piece moves, and how a game is won.' },
  { id: 'tactics-1', title: 'Tactics I', summary: 'Win material by attacking two things at once and exploiting lines.' },
  { id: 'checkmates', title: 'Checkmate patterns', summary: 'The mates every player must recognise at a glance.' },
  { id: 'openings', title: 'Opening principles', summary: 'Start a game with purpose: centre, development, king safety.' },
  { id: 'endgames', title: 'Endgame essentials', summary: 'Convert an advantage: basic mates, king activity, passed pawns.' },
  { id: 'tactics-2', title: 'Tactics II', summary: 'Combinations: deflection, decoy, overload, and calculation.' },
]

const skills: readonly Skill[] = [
  // Foundations
  {
    id: id('board'), level: 'foundations', title: 'The board', minutes: 5, map: { col: 0 }, prerequisites: [],
    summary: 'Files, ranks, diagonals, and how squares are named.',
    objectives: ['Name any square', 'Set up the board the right way round', 'Tell files, ranks and diagonals apart'],
  },
  {
    id: id('rook-bishop'), level: 'foundations', title: 'Rook and bishop', minutes: 8, map: { col: 1 }, prerequisites: [id('board')],
    summary: 'Pieces that slide along lines.',
    objectives: ['Move the rook along files and ranks', 'Move the bishop along diagonals', 'Capture with a sliding piece'],
  },
  {
    id: id('queen-king'), level: 'foundations', title: 'Queen and king', minutes: 8, map: { col: 2 }, prerequisites: [id('rook-bishop')],
    summary: 'The strongest piece, and the one you must protect.',
    objectives: ['Move the queen in every direction', 'Move the king one square', 'Keep the king away from attacked squares'],
  },
  {
    id: id('knight'), level: 'foundations', title: 'The knight', minutes: 8, map: { col: 3 }, prerequisites: [id('board')],
    summary: 'The only piece that jumps.',
    objectives: ['Move the knight in an L', 'Find knight routes between two squares', 'Jump over pieces'],
  },
  {
    id: id('pawn'), level: 'foundations', title: 'The pawn', minutes: 10, map: { col: 4 }, prerequisites: [id('board')],
    summary: 'Forward moves, diagonal captures, promotion, en passant.',
    objectives: ['Move and capture with pawns', 'Promote a pawn', 'Capture en passant'],
  },
  {
    id: id('attack-defend'), level: 'foundations', title: 'Attack and defend', minutes: 10, map: { col: 0 }, prerequisites: [id('queen-king'), id('knight'), id('pawn')],
    summary: 'See what is attacked, and protect it.',
    objectives: ['Find every piece a piece attacks', 'Capture an undefended piece', 'Defend an attacked piece by moving, guarding, or blocking'],
  },
  {
    id: id('check'), level: 'foundations', title: 'Check and escape', minutes: 8, map: { col: 1 }, prerequisites: [id('attack-defend')],
    summary: 'Give check, and get out of it three ways.',
    objectives: ['Give check', 'Escape check by moving, blocking, or capturing'],
  },
  {
    id: id('checkmate'), level: 'foundations', title: 'Checkmate and stalemate', minutes: 10, map: { col: 2 }, prerequisites: [id('check')],
    summary: 'How games are won, and how a win can slip into a draw.',
    objectives: ['Recognise checkmate', 'Recognise stalemate and other draws', 'Deliver mate in one'],
  },
  {
    id: id('castling'), level: 'foundations', title: 'Castling', minutes: 6, map: { col: 3 }, prerequisites: [id('check')],
    summary: 'The special move that tucks the king away.',
    objectives: ['Castle on either side', 'Know when castling is not allowed'],
  },
  {
    id: id('values'), level: 'foundations', title: 'Piece values and trades', minutes: 8, map: { col: 4 }, prerequisites: [id('checkmate')],
    summary: 'Count material and decide when a trade is good.',
    objectives: ['Know the value of each piece', 'Spot hanging pieces', 'Judge a simple exchange'],
  },
  // Tactics I
  {
    id: id('fork'), level: 'tactics-1', title: 'The fork', tactic: 'fork', minutes: 12, map: { col: 0 }, prerequisites: [id('values')],
    summary: 'One piece attacks two targets.',
    objectives: ['Spot fork squares', 'Use knight and pawn forks', 'Fork with check'],
  },
  {
    id: id('pin'), level: 'tactics-1', title: 'The pin', tactic: 'pin', minutes: 12, map: { col: 1 }, prerequisites: [id('values')],
    summary: 'A piece cannot move without exposing something behind it.',
    objectives: ['Tell absolute and relative pins apart', 'Pin a piece to the king', 'Attack a pinned piece'],
  },
  {
    id: id('skewer'), level: 'tactics-1', title: 'The skewer', tactic: 'skewer', minutes: 10, map: { col: 2 }, prerequisites: [id('pin')],
    summary: 'A pin in reverse: the valuable piece is in front.',
    objectives: ['Skewer the king to win the piece behind', 'Tell a skewer from a pin'],
  },
  {
    id: id('discovered'), level: 'tactics-1', title: 'Discovered attack', tactic: 'discovered', minutes: 12, map: { col: 3 }, prerequisites: [id('pin')],
    summary: 'Move one piece to unleash another.',
    objectives: ['Set up a discovered attack', 'Use discovered check'],
  },
  {
    id: id('double-check'), level: 'tactics-1', title: 'Double check', tactic: 'doubleCheck', minutes: 8, map: { col: 4 }, prerequisites: [id('discovered')],
    summary: 'Two checks at once: only the king can move.',
    objectives: ['Deliver double check', 'See why it can only be met by a king move'],
  },
  // Checkmate patterns
  {
    id: id('back-rank'), level: 'checkmates', title: 'Back-rank mate', tactic: 'backRank', minutes: 10, map: { col: 0 }, prerequisites: [id('checkmate'), id('fork')],
    summary: 'A king trapped behind its own pawns.',
    objectives: ['Deliver back-rank mate', 'Make luft to defend against it'],
  },
  {
    id: id('ladder-mate'), level: 'checkmates', title: 'Ladder mate', minutes: 8, map: { col: 1 }, prerequisites: [id('checkmate')],
    summary: 'Two heavy pieces walk the king to the edge.',
    objectives: ['Mate with two rooks', 'Mate with queen and rook'],
  },
  {
    id: id('smothered-mate'), level: 'checkmates', title: 'Smothered mate', minutes: 10, map: { col: 2 }, prerequisites: [id('back-rank'), id('fork')],
    summary: 'A knight mates a king boxed in by its own pieces.',
    objectives: ['Recognise the smothered pattern', 'Play the queen sacrifice that sets it up'],
  },
  {
    id: id('sacrifice'), level: 'checkmates', title: 'Sacrifices for mate', tactic: 'sacrifice', minutes: 12, map: { col: 3 }, prerequisites: [id('back-rank'), id('ladder-mate')],
    summary: 'Give material to break open the king.',
    objectives: ['Judge when a sacrifice works', 'Finish the attack after a sacrifice'],
  },
  // Opening principles
  {
    id: id('centre'), level: 'openings', title: 'Control the centre', minutes: 8, map: { col: 0 }, prerequisites: [id('values')],
    summary: 'Why the four central squares matter.',
    objectives: ['Occupy and control the centre with pawns and pieces'],
  },
  {
    id: id('development'), level: 'openings', title: 'Develop and castle', minutes: 10, map: { col: 1 }, prerequisites: [id('centre'), id('castling')],
    summary: 'Bring knights and bishops out, then make the king safe.',
    objectives: ['Develop minor pieces first', 'Castle early', 'Avoid moving one piece twice'],
  },
  {
    id: id('opening-traps'), level: 'openings', title: 'Early traps', minutes: 10, map: { col: 2 }, prerequisites: [id('development'), id('fork')],
    summary: 'Scholar’s mate and other ambushes, and how to avoid them.',
    objectives: ['Defend f7/f2', 'Punish an early queen'],
  },
  // Endgame essentials
  {
    id: id('queen-mate'), level: 'endgames', title: 'King and queen mate', minutes: 12, map: { col: 0 }, prerequisites: [id('ladder-mate')],
    summary: 'Force mate with a lone queen and king.',
    objectives: ['Box the king in', 'Avoid stalemate', 'Deliver mate'],
  },
  {
    id: id('rook-mate'), level: 'endgames', title: 'King and rook mate', minutes: 14, map: { col: 1 }, prerequisites: [id('queen-mate')],
    summary: 'The box method with a single rook.',
    objectives: ['Shrink the box', 'Use the king to support the rook'],
  },
  {
    id: id('opposition'), level: 'endgames', title: 'Opposition', minutes: 12, map: { col: 2 }, prerequisites: [id('values')],
    summary: 'King versus king: who has to give way.',
    objectives: ['Take the opposition', 'Win or draw king and pawn versus king'],
  },
  {
    id: id('passed-pawns'), level: 'endgames', title: 'Passed pawns', minutes: 10, map: { col: 3 }, prerequisites: [id('opposition')],
    summary: 'The rule of the square and pushing a pawn home.',
    objectives: ['Use the rule of the square', 'Escort a passed pawn'],
  },
  // Tactics II
  {
    id: id('deflection'), level: 'tactics-2', title: 'Deflection and decoy', minutes: 12, map: { col: 0 }, prerequisites: [id('double-check'), id('back-rank')],
    summary: 'Lure a defender away, or onto a bad square.',
    objectives: ['Deflect a defender', 'Decoy the king onto a mating square'],
  },
  {
    id: id('overload'), level: 'tactics-2', title: 'Overloaded defenders', minutes: 10, map: { col: 1 }, prerequisites: [id('deflection')],
    summary: 'One piece cannot guard two things.',
    objectives: ['Find the overloaded piece', 'Exploit it with a capture or check'],
  },
  {
    id: id('zwischenzug'), level: 'tactics-2', title: 'The in-between move', minutes: 10, map: { col: 2 }, prerequisites: [id('overload')],
    summary: 'Before the expected recapture, play a stronger forcing move.',
    objectives: ['Spot a check or threat that comes first', 'Avoid auto-recapturing'],
  },
  {
    id: id('calculation'), level: 'tactics-2', title: 'Combining tactics', minutes: 15, map: { col: 3 }, prerequisites: [id('zwischenzug'), id('sacrifice')],
    summary: 'Chain two or three motifs and calculate to the end.',
    objectives: ['Calculate forcing lines: checks, captures, threats', 'Solve two- and three-move combinations'],
  },
]

export const curriculum: Curriculum = { levels, skills }
