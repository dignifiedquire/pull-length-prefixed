import varint from 'varint'

export interface LengthDecoderFunction {
  (data: Uint8Array): number
  bytes: number
}

export const varintDecode: LengthDecoderFunction = (data) => {
  const len = varint.decode(data)
  varintDecode.bytes = varint.decode.bytes

  return len
}
varintDecode.bytes = 0
