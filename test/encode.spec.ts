import { expect } from 'aegir/chai'
import all from 'it-all'
import { pipe } from 'it-pipe'
import randomInt from 'random-int'
import * as varint from 'uint8-varint'
import { Uint8ArrayList } from 'uint8arraylist'
import * as lp from '../src/index.js'
import { times, someBytes } from './helpers/index.js'
import { int32BEEncode } from './helpers/int32BE-encode.js'

describe('encode', () => {
  it('should encode length as prefix', async () => {
    const input = await Promise.all(times(randomInt(1, 10), someBytes))
    const output = await pipe(
      input,
      (source) => lp.encode(source),
      async (source) => all(source)
    )

    let inputIndex = 0

    for (let i = 0; i < output.length; i += 2, inputIndex++) {
      const prefix = output[i]
      const data = output[i + 1]

      const length = varint.decode(prefix)
      expect(length).to.equal(data.length)
      expect(data).to.deep.equal(input[inputIndex])
    }
  })

  it('should encode zero length as prefix', async () => {
    const input = [new Uint8Array(0)]
    const output = await pipe(input, (source) => lp.encode(source), async (source) => all(source))

    let inputIndex = 0

    for (let i = 0; i < output.length; i += 2, inputIndex++) {
      const prefix = output[i]
      const data = output[i + 1]

      const length = varint.decode(prefix)
      expect(length).to.equal(data.length)
      expect(data).to.deep.equal(input[inputIndex])
    }
  })

  it('should encode with custom length encoder (int32BE)', async () => {
    const input = await Promise.all(times(randomInt(1, 100), someBytes))
    const output = await pipe(
      input,
      (source) => lp.encode(source, { lengthEncoder: int32BEEncode }),
      async (source) => all(source)
    )

    let inputIndex = 0

    for (let i = 0; i < output.length; i += 2, inputIndex++) {
      const prefix = output[i]
      const data = output[i + 1]

      const view = new DataView(prefix.buffer)
      const length = view.getUint32(0, false)
      expect(length).to.equal(data.length)
      expect(length).to.equal(input[inputIndex].length)
    }
  })

  it('should only yield uint8arrays', async () => {
    const output = await pipe(
      [new Uint8Array(10), new Uint8ArrayList(new Uint8Array(20))],
      (source) => lp.encode(source),
      async (source) => all(source)
    )

    // length, data, length, data
    expect(output).to.have.lengthOf(4)

    for (let i = 0; i < output.length; i++) {
      expect(output[i]).to.be.an.instanceOf(Uint8Array)
    }
  })
})
