import type { StateStorage } from 'zustand/middleware'

// Storage throws in private mode, with blocked site data, and in the node test env.
export const safeStorage: StateStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Settings still work for this session.
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // Nothing to remove.
    }
  },
}
