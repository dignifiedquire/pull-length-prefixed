import { expect } from 'aegir/utils/chai.js'
import { pipe } from 'it-pipe'
import randomInt from 'random-int'
import all from 'it-all'
import varint from 'varint'
import { toBuffer, times, someBytes } from './helpers/index.js'
import * as lp from '../src/index.js'
import { MIN_POOL_SIZE } from '../src/encode.js'

const { int32BEEncode } = lp

describe('encode', () => {
  it('should encode length as prefix', async () => {
    const input = await Promise.all(times(randomInt(1, 10), someBytes))
    const output = await pipe(input, lp.encode(), toBuffer, async (source) => await all(source))
    output.forEach((o, i) => {
      const length = varint.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(varint.decode.bytes)).to.deep.equal(input[i])
    })
  })

  it('should encode zero length as prefix', async () => {
    const input = [new Uint8Array(0)]
    const output = await pipe(input, lp.encode(), toBuffer, async (source) => await all(source))
    output.forEach((o, i) => {
      const length = varint.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(varint.decode.bytes)).to.deep.equal(input[i])
    })
  })

  it('should re-allocate buffer pool when empty', async () => {
    const input = await Promise.all(times(MIN_POOL_SIZE * 2, someBytes))
    const output = await pipe(
      input,
      lp.encode({ poolSize: MIN_POOL_SIZE * 1.5 }),
      toBuffer,
      async (source) => await all(source)
    )
    output.forEach((o, i) => {
      const length = varint.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(varint.decode.bytes)).to.deep.equal(input[i])
    })
  })

  it('should encode with custom length encoder (int32BE)', async () => {
    const input = await Promise.all(times(randomInt(1, 100), someBytes))
    const output = await pipe(
      input,
      lp.encode({ lengthEncoder: int32BEEncode }),
      toBuffer,
      async (source) => await all(source)
    )
    output.forEach((o, i) => {
      const length = o.readInt32BE(0)
      expect(length).to.equal(input[i].length)
    })
  })
})
