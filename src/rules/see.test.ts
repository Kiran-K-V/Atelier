import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { see } from './see'

function legal(fen: string): string {
  return new Chess(fen).fen()
}

describe('see', () => {
  it('nets the difference of a simple trade', () => {
    const fen = legal('4k3/8/4p3/3n4/4P3/8/8/4K3 w - - 0 1')
    expect(see(fen, 'd5', 'w')).toBe(2)
  })

  it('wins an undefended piece in full', () => {
    const fen = legal('4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1')
    expect(see(fen, 'd5', 'w')).toBe(3)
  })

  it('is zero when the side has nothing that attacks the square', () => {
    const fen = legal('4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1')
    expect(see(fen, 'd5', 'b')).toBe(0)
  })

  it('is zero for an empty square', () => {
    expect(see(legal('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), 'd5', 'w')).toBe(0)
  })

  it('declines a losing capture', () => {
    const fen = legal('3rk3/8/8/3p4/8/8/3R4/4K3 w - - 0 1')
    expect(see(fen, 'd5', 'w')).toBe(0)
  })

  it('counts the x-ray battery behind the first capturer', () => {
    const battery = legal('3rk3/8/8/3p4/8/8/3R4/3RK3 w - - 0 1')
    const single = legal('3rk3/8/8/3p4/8/8/3R4/4K3 w - - 0 1')
    expect(see(battery, 'd5', 'w')).toBe(1)
    expect(see(single, 'd5', 'w')).toBe(0)
  })

  it('lets the king capture only when nothing recaptures', () => {
    const supported = legal('8/8/4k3/3p4/8/8/6B1/3R2K1 w - - 0 1')
    const alone = legal('8/8/4k3/3p4/8/8/8/3R2K1 w - - 0 1')
    expect(see(supported, 'd5', 'w')).toBe(1)
    expect(see(alone, 'd5', 'w')).toBe(0)
  })
})
