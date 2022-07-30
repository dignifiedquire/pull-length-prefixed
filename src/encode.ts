import { Uint8ArrayList } from 'uint8arraylist'
import { unsigned } from 'uint8-varint'
import type { LengthEncoderFunction } from './index.js'
import type { Source, Transform } from 'it-stream-types'
import { allocUnsafe } from './alloc.js'

interface EncoderOptions {
  lengthEncoder?: LengthEncoderFunction
}

const defaultEncoder: LengthEncoderFunction = (length) => {
  const lengthLength = unsigned.encodingLength(length)
  const lengthBuf = allocUnsafe(lengthLength)

  unsigned.encode(length, lengthBuf)

  defaultEncoder.bytes = lengthLength

  return lengthBuf
}
defaultEncoder.bytes = 0

export function encode (options?: EncoderOptions): Transform<Uint8ArrayList | Uint8Array, Uint8Array> {
  options = options ?? {}

  const encodeLength = options.lengthEncoder ?? defaultEncoder

  const encoder = async function * (source: Source<Uint8ArrayList | Uint8Array>): Source<Uint8Array> {
    for await (const chunk of source) {
      // length + data
      const length = encodeLength(chunk.byteLength)

      // yield only Uint8Arrays
      if (length instanceof Uint8Array) {
        yield length
      } else {
        yield * length
      }

      // yield only Uint8Arrays
      if (chunk instanceof Uint8Array) {
        yield chunk
      } else {
        yield * chunk
      }
    }
  }

  return encoder
}

encode.single = (chunk: Uint8ArrayList | Uint8Array, options?: EncoderOptions) => {
  options = options ?? {}
  const encodeLength = options.lengthEncoder ?? defaultEncoder

  return new Uint8ArrayList(
    encodeLength(chunk.byteLength),
    chunk
  )
}
