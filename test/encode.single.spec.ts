import { expect } from 'aegir/chai'
import varint from 'varint'
import { someBytes } from './helpers/index.js'
import * as lp from '../src/index.js'
import { int32BEEncode } from './helpers/int32BE-encode.js'

describe('encode.single', () => {
  it('should encode length as prefix', () => {
    const input = someBytes()
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

  it('should encode with custom length encoder (int32BE)', () => {
    const input = someBytes()
    const output = lp.encode.single(input, { lengthEncoder: int32BEEncode }).subarray()

    const view = new DataView(output.buffer, output.byteOffset, output.byteLength)
    const length = view.getInt32(0, false)
    expect(length).to.equal(input.length)
  })
})
