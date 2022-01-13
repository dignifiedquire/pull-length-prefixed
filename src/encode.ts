import BufferList from 'bl/BufferList.js'
import { varintEncode } from './varint-encode.js'
import { concat as uint8ArrayConcat } from 'uint8arrays'
import type { LengthEncoderFunction } from './varint-encode.js'
import type { Source, Transform } from 'it-stream-types'

interface EncoderOptions {
  poolSize?: number
  minPoolSize?: number
  lengthEncoder?: LengthEncoderFunction
}

export const MIN_POOL_SIZE = 8 // Varint.encode(Number.MAX_SAFE_INTEGER).length
export const DEFAULT_POOL_SIZE = 10 * 1024

export function encode (options?: EncoderOptions): Transform<BufferList | Uint8Array, Uint8Array> {
  options = options ?? {}

  const poolSize = Math.max(options.poolSize ?? DEFAULT_POOL_SIZE, options.minPoolSize ?? MIN_POOL_SIZE)
  const encodeLength = options.lengthEncoder ?? varintEncode

  const encoder = async function * (source: Source<BufferList | Uint8Array>): Source<Uint8Array> {
    let pool = new Uint8Array(poolSize)
    let poolOffset = 0

    for await (const chunk of source) {
      encodeLength(chunk.length, pool, poolOffset)
      const encodedLength = pool.slice(poolOffset, poolOffset + encodeLength.bytes)
      poolOffset += encodeLength.bytes

      if (pool.length - poolOffset < MIN_POOL_SIZE) {
        pool = new Uint8Array(poolSize)
        poolOffset = 0
      }

      yield uint8ArrayConcat([encodedLength, chunk.slice()], encodedLength.length + chunk.length)
    }
  }

  return encoder
}

encode.single = (chunk: BufferList | Uint8Array, options?: EncoderOptions) => {
  options = options ?? {}
  const encodeLength = options.lengthEncoder ?? varintEncode
  // @ts-expect-error bl types are broken
  return new BufferList([encodeLength(chunk.length), chunk.slice()])
}
