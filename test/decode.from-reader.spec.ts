import { expect } from 'aegir/chai'
import randomBytes from 'iso-random-stream/src/random.js'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { reader } from 'it-reader'
import { Uint8ArrayList } from 'uint8arraylist'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import varint from 'varint'
import * as lp from '../src/index.js'
import { times, someBytes } from './helpers/index.js'

describe('decode from reader', () => {
  it('should be able to decode from an it-reader', async () => {
    const input = await Promise.all(times(5, someBytes))
    const stream = reader(
      pipe(
        input,
        (source) => lp.encode(source)
      )
    )

    const output = await pipe(
      lp.decode.fromReader(stream),
      async (source) => new Uint8ArrayList(...await all(source))
    )

    expect(output.slice()).to.equalBytes(uint8ArrayConcat(input))
  })

  it('should not decode a message that is too long', async () => {
    const byteLength = 100 + 1
    const bytes = randomBytes(byteLength)

    const input = [
      Uint8Array.from(varint.encode(byteLength)),
      bytes
    ]

    const stream = reader(input)

    await expect(
      pipe(
        lp.decode.fromReader(stream, { maxDataLength: 100 }),
        async (source) => all(source)
      )
    ).to.eventually.be.rejected.with.property('code', 'ERR_MSG_DATA_TOO_LONG')
  })
})
