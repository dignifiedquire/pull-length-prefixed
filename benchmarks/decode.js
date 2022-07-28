import { decode, encode } from '../dist/src/index.js'
import { pipe } from 'it-pipe'
import { randomBytes } from 'iso-random-stream'
import drain from 'it-drain'
import { Uint8ArrayList } from 'uint8arraylist'

const REPEAT = 1000
let start = Date.now()
const bytes = randomBytes(65536)
const data = await pipe(
  [bytes],
  encode(),
  async source => {
    let buf = new Uint8ArrayList()

    for await (const b of source) {
      buf.append(b)
    }

    return buf.slice()
  }
)

for (let i = 0; i < REPEAT; i++) {
  for (let j = 0; j < REPEAT; j++) {
    const out = await pipe(
      [
        // 5-byte, length prefixed split over several messages
        data.subarray(0, 10),
        data.subarray(10, 20),
        data.subarray(20, 30),
        data.subarray(30)
      ],
      decode(),
      drain
    )
  }
}

console.info('decode', Date.now() - start, 'ms,', Math.round(REPEAT / ((Date.now() - start) / 1000)), 'op/s') // eslint-disable-line no-console
