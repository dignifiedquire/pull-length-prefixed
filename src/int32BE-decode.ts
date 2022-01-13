import type { LengthDecoderFunction } from './varint-decode.js'

export const int32BEDecode: LengthDecoderFunction = (data) => {
  if (data.length < 4) {
    throw RangeError('Could not decode int32BE')
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  return view.getInt32(0, false)
}
int32BEDecode.bytes = 4 // Always because fixed length
