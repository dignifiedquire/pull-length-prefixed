import randomBytes from 'iso-random-stream/src/random.js'
import randomInt from 'random-int'

export function times <T> (n: number, fn: (...args: any[]) => T): T[] {
  return Array.from(Array(n)).fill(fn())
}

export function someBytes (n?: number): Uint8Array {
  return randomBytes(randomInt(1, n ?? 32))
}
