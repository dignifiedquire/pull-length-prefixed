import { expect } from 'aegir/utils/chai.js'
import varint from 'varint'
import { someBytes } from './helpers/index.js'
import * as lp from '../src/index.js'

const { int32BEEncode } = lp

describe('encode.single', () => {
  it('should encode length as prefix', async () => {
    const input = await someBytes()
    const output = lp.encode.single(input)

    const length = varint.decode(output.slice())
    expect(length).to.equal(input.length)
    expect(output.slice(varint.decode.bytes)).to.deep.equal(input)
  })

  it('should encode zero length as prefix', () => {
    const input = new Uint8Array(0)
    const output = lp.encode.single(input)

    const length = varint.decode(output.slice())
    expect(length).to.equal(input.length)
    expect(output.slice(varint.decode.bytes)).to.deep.equal(input)
  })

  it('should encode with custom length encoder (int32BE)', async () => {
    const input = await someBytes()
    const output = lp.encode.single(input, { lengthEncoder: int32BEEncode })

    const length = output.readInt32BE(0)
    expect(length).to.equal(input.length)
  })
})
