import type { Curriculum, Level, Skill, SkillId, SkillState } from '../../academy/types'

export const STATE_LABEL: Record<SkillState, string> = {
  later: 'Later',
  recommended: 'Recommended',
  inProgress: 'In progress',
  mastered: 'Mastered',
}

/** Medallion radius, px. */
export const NODE_R = 26
/** Space under a medallion for its title (two lines) and state label. */
export const LABEL_H = 58
/** Distance between row centres inside one band. */
export const ROW_H = 140
/** Room above the first row for same-row arcs. */
const PAD_TOP = 64
const PAD_BOTTOM = 28

export interface MapNode {
  readonly skill: Skill
  /** Curriculum order, 0-based. */
  readonly index: number
  readonly band: number
  /** Row inside the band. */
  readonly row: number
  readonly x: number
  readonly y: number
}

export interface MapBand {
  readonly level: Level
  readonly y: number
  readonly height: number
}

export interface MapEdge {
  readonly from: SkillId
  readonly to: SkillId
  /** SVG path data, in map coordinates. */
  readonly d: string
}

export interface MapLayout {
  readonly width: number
  readonly height: number
  /** Width of one column; a node's label may use this much minus a gutter. */
  readonly colW: number
  readonly bands: readonly MapBand[]
  readonly nodes: readonly MapNode[]
  readonly edges: readonly MapEdge[]
}

const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * Places skills on the illustrated map. Bands follow curriculum level order top to bottom.
 * A skill sits in its `map.col`; a second skill with the same column in one band drops a row.
 * Edges run from each prerequisite to the skill and bend into the lanes between columns
 * so they pass beside, not through, the nodes of the rows they cross. Pure and deterministic.
 */
export function layoutSkillMap(curriculum: Curriculum, width: number): MapLayout {
  const cols = Math.max(1, ...curriculum.skills.map((s) => s.map.col + 1))
  const colW = width / cols

  const bands: MapBand[] = []
  const nodes: MapNode[] = []
  let y = 0
  curriculum.levels.forEach((level, band) => {
    const used = new Map<number, number>()
    const inBand = curriculum.skills.flatMap((skill, index) => (skill.level === level.id ? [{ skill, index }] : []))
    const placed = inBand.map(({ skill, index }) => {
      const row = used.get(skill.map.col) ?? 0
      used.set(skill.map.col, row + 1)
      return { skill, index, row }
    })
    const rows = Math.max(1, ...placed.map((p) => p.row + 1))
    const height = PAD_TOP + (rows - 1) * ROW_H + 2 * NODE_R + LABEL_H + PAD_BOTTOM
    for (const p of placed) {
      nodes.push({ ...p, band, x: r1(colW * (p.skill.map.col + 0.5)), y: y + PAD_TOP + NODE_R + p.row * ROW_H })
    }
    bands.push({ level, y, height })
    y += height
  })
  nodes.sort((a, b) => a.index - b.index)

  const byId = new Map(nodes.map((n) => [n.skill.id, n]))
  // Every distinct row on the map, top to bottom, with the nodes on it.
  const rowYs = [...new Set(nodes.map((n) => n.y))].sort((a, b) => a - b)
  const rowNodes = new Map(rowYs.map((ry) => [ry, nodes.filter((n) => n.y === ry)]))

  const edges: MapEdge[] = []
  for (const to of nodes) {
    for (const pre of to.skill.prerequisites) {
      const from = byId.get(pre)
      if (!from) continue
      edges.push({ from: from.skill.id, to: to.skill.id, d: edgePath(from, to, colW, rowYs, rowNodes) })
    }
  }

  return { width, height: y, colW, bands, nodes, edges }
}

function edgePath(
  from: MapNode,
  to: MapNode,
  colW: number,
  rowYs: readonly number[],
  rowNodes: ReadonlyMap<number, readonly MapNode[]>,
): string {
  const M = `M${from.x} ${from.y}`
  if (from.y === to.y) {
    const span = Math.abs(to.x - from.x) / colW
    if (span <= 1.01) return `${M} L${to.x} ${to.y}`
    // Arc over the nodes in between; longer spans arc higher so nested arcs do not touch.
    const lift = Math.min(PAD_TOP - 6, 22 + span * 8)
    const top = from.y - NODE_R - lift
    return `${M} C${from.x} ${r1(top)} ${to.x} ${r1(top)} ${to.x} ${to.y}`
  }

  // Waypoints at every row strictly between the two ends, nudged into a lane if a node is in the way.
  const pts: [number, number][] = [[from.x, from.y]]
  for (const ry of rowYs) {
    if (ry <= from.y || ry >= to.y) continue
    const t = (ry - from.y) / (to.y - from.y)
    let x = from.x + (to.x - from.x) * t
    const blocker = rowNodes.get(ry)?.find((n) => Math.abs(n.x - x) < colW * 0.4)
    if (blocker) {
      // Hold the lane past the whole node block (seal and label), not just its centre.
      x = r1(blocker.x + (to.x >= blocker.x ? colW / 2 : -colW / 2))
      pts.push([x, ry - NODE_R - 10], [x, ry + NODE_R + LABEL_H])
    } else pts.push([r1(x), ry])
  }
  pts.push([to.x, to.y])

  // Vertical tangents at every waypoint keep the chain smooth without a spline solver.
  let d = M
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const mid = r1((y0 + y1) / 2)
    d += ` C${x0} ${mid} ${x1} ${mid} ${x1} ${y1}`
  }
  return d
}

/** Skills that `id` needs, directly or not. */
export function ancestors(curriculum: Curriculum, id: SkillId): Set<SkillId> {
  const byId = new Map(curriculum.skills.map((s) => [s.id, s]))
  const out = new Set<SkillId>()
  const stack = [...(byId.get(id)?.prerequisites ?? [])]
  while (stack.length) {
    const next = stack.pop()!
    if (out.has(next)) continue
    out.add(next)
    stack.push(...(byId.get(next)?.prerequisites ?? []))
  }
  return out
}

/** Skills that need `id`, directly or not. */
export function dependents(curriculum: Curriculum, id: SkillId): Set<SkillId> {
  const out = new Set<SkillId>()
  // Prerequisites always come earlier, so one forward pass is enough.
  for (const s of curriculum.skills) {
    if (s.prerequisites.some((p) => p === id || out.has(p))) out.add(s.id)
  }
  return out
}
