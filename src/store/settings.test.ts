import { beforeEach, describe, expect, it } from 'vitest'
import { useSettings } from './settings'

// The node test env has no localStorage; a plain map stands in so persist can read and write.
const data = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  },
})

const KEY = 'atelier-settings'
const stored = () => JSON.parse(data.get(KEY) ?? '{}').state

beforeEach(() => {
  data.clear()
  useSettings.setState({ boardSet: 'wood' })
})

describe('settings store: boardSet', () => {
  it('defaults to wood', () => {
    expect(useSettings.getState().boardSet).toBe('wood')
  })

  it('persists a change', () => {
    useSettings.getState().setBoardSet('atelier')
    expect(stored().boardSet).toBe('atelier')
  })

  it('restores a stored value', async () => {
    data.set(KEY, JSON.stringify({ state: { boardSet: 'atelier' }, version: 0 }))
    await useSettings.persist.rehydrate()
    expect(useSettings.getState().boardSet).toBe('atelier')
  })

  it('rejects an invalid stored value and keeps the default', async () => {
    data.set(KEY, JSON.stringify({ state: { boardSet: 'neon', theme: 'dark' }, version: 0 }))
    await useSettings.persist.rehydrate()
    expect(useSettings.getState().boardSet).toBe('wood')
    expect(useSettings.getState().theme).toBe('dark')
  })
})
