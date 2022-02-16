import { allocUnsafe } from './alloc.js'
import type { LengthEncoderFunction } from './varint-encode.js'

export const int32BEEncode: LengthEncoderFunction = (value, target, offset) => {
  target = target ?? allocUnsafe(4)
  const view = new DataView(target.buffer, target.byteOffset, target.byteLength)
  view.setInt32(offset ?? 0, value, false)
  return target
}
int32BEEncode.bytes = 4 // Always because fixed length
