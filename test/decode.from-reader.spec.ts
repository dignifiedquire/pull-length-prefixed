import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import { reader } from 'it-reader'
import randomBytes from 'iso-random-stream/src/random.js'
import all from 'it-all'
import varint from 'varint'
import { times, someBytes } from './helpers/index.js'
import * as lp from '../src/index.js'

describe('decode from reader', () => {
  it('should be able to decode from an it-reader', async () => {
    const input = await Promise.all(times(5, someBytes))
    const stream = reader(
      pipe(
        input,
        lp.encode()
      )
    )

    const output = await pipe(
      lp.decode.fromReader(stream),
      async (source) => await all(source)
    )

    expect(output).to.deep.equal(input)
  })

  it('should not decode a message that is too long', async () => {
    const byteLength = 100 + 1
    const bytes = await randomBytes(byteLength)

    const input = [
      Uint8Array.from(varint.encode(byteLength)),
      bytes
    ]

    const stream = reader(input)

    await expect(
      pipe(
        lp.decode.fromReader(stream, { maxDataLength: 100 }),
        async (source) => await all(source)
      )
    ).to.eventually.be.rejected.with.property('code', 'ERR_MSG_DATA_TOO_LONG')
  })
})
