import varint from 'varint'

export interface LengthEncoderFunction {
  (value: number, target?: Uint8Array, offset?: number): Uint8Array
  bytes: number
}

/**
 * Encode the passed length `value` to the `target` buffer at the given `offset`
 */
export const varintEncode: LengthEncoderFunction = (value, target?, offset?) => {
  // @ts-expect-error target can be undefined
  const ret = varint.encode(value, target, offset)
  varintEncode.bytes = varint.encode.bytes
  // If no target, create Buffer from returned array
  return target ?? Uint8Array.from(ret)
}
varintEncode.bytes = 0
