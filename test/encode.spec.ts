import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import randomInt from 'random-int'
import all from 'it-all'
import { unsigned } from 'uint8-varint'
import { times, someBytes } from './helpers/index.js'
import * as lp from '../src/index.js'
import { int32BEEncode } from './helpers/int32BE-encode.js'

describe('encode', () => {
  it('should encode length as prefix', async () => {
    const input = await Promise.all(times(randomInt(1, 10), someBytes))
    const output = await pipe(input, lp.encode(), async (source) => await all(source))
    output.forEach((o, i) => {
      const length = unsigned.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(unsigned.encodingLength(length))).to.deep.equal(input[i])
    })
  })

  it('should encode zero length as prefix', async () => {
    const input = [new Uint8Array(0)]
    const output = await pipe(input, lp.encode(), async (source) => await all(source))
    output.forEach((o, i) => {
      const length = unsigned.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(unsigned.encodingLength(length))).to.deep.equal(input[i])
    })
  })

  it('should encode with custom length encoder (int32BE)', async () => {
    const input = await Promise.all(times(randomInt(1, 100), someBytes))
    const output = await pipe(
      input,
      lp.encode({ lengthEncoder: int32BEEncode }),
      async (source) => await all(source)
    )
    output.forEach((o, i) => {
      const length = o.getUint32(0, false)
      expect(length).to.equal(input[i].length)
    })
  })
})
