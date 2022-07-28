import { Uint8ArrayList } from 'uint8arraylist'
import type { LengthEncoderFunction } from '../../src/index.js'

export const int32BEEncode: LengthEncoderFunction = (value) => {
  const data = new Uint8ArrayList(
    new Uint8Array(4)
  )
  data.setInt32(0, value, false)

  return data
}
int32BEEncode.bytes = 4 // Always because fixed length
