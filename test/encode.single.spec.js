/* eslint-env mocha */
'use strict'

const { Buffer } = require('buffer')
const { expect } = require('chai')
const Varint = require('varint')
const { someBytes } = require('./_helpers')

const lp = require('../')
const { int32BEEncode } = lp

describe('encode.single', () => {
  it('should encode length as prefix', async () => {
    const input = await someBytes()
    const output = lp.encode.single(input)

    const length = Varint.decode(output.slice())
    expect(length).to.equal(input.length)
    expect(output.slice(Varint.decode.bytes)).to.deep.equal(input)
  })

  it('should encode zero length as prefix', () => {
    const input = Buffer.alloc(0)
    const output = lp.encode.single(input)

    const length = Varint.decode(output.slice())
    expect(length).to.equal(input.length)
    expect(output.slice(Varint.decode.bytes)).to.deep.equal(input)
  })

  it('should encode with custom length encoder (int32BE)', async () => {
    const input = await someBytes()
    const output = lp.encode.single(input, { lengthEncoder: int32BEEncode })

    const length = output.readInt32BE(0)
    expect(length).to.equal(input.length)
  })
})
