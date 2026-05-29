// Vitest global test setup.
// Registers @testing-library/jest-dom matchers (toBeInTheDocument, toBeDisabled, …)
// and augments Vitest's `expect` typings.
import '@testing-library/jest-dom/vitest'

// jsdom doesn't always provide a functional `localStorage`, which Zustand's
// `persist` middleware (used by authStore) calls on every setState. Install a
// minimal in-memory implementation so persisted stores work under test.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() { return this.store.size }
  clear() { this.store.clear() }
  getItem(key: string) { return this.store.get(key) ?? null }
  key(index: number) { return [...this.store.keys()][index] ?? null }
  removeItem(key: string) { this.store.delete(key) }
  setItem(key: string, value: string) { this.store.set(key, String(value)) }
}

if (
  typeof globalThis.localStorage === 'undefined' ||
  typeof globalThis.localStorage.setItem !== 'function'
) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
  })
}

// Radix UI primitives (Select, Dropdown, …) call DOM APIs that jsdom doesn't
// implement. Stub them so components using Radix can be exercised under test.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
}

