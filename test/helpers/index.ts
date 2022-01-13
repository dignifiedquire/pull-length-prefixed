import type BufferList from 'bl/BufferList'
import map from 'it-map'
import randomInt from 'random-int'
import randomBytes from 'iso-random-stream/src/random.js'
import type { Source } from 'it-stream-types'

export function toBuffer (source: Source<BufferList>) {
  return map(source, c => c.slice())
}

export function times <T> (n: number, fn: (...args: any[]) => T): T[] {
  return Array.from(Array(n)).fill(fn())
}

export function someBytes (n?: number) {
  return randomBytes(randomInt(1, n ?? 32))
}
