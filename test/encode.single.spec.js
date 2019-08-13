/* eslint-env mocha */
'use strict'

const { expect } = require('chai')
const randomInt = require('random-int')
const randomBytes = require('random-bytes')
const Varint = require('varint')

const lp = require('../')
const someBytes = n => randomBytes(randomInt(1, n || 32))

describe('encode.single', () => {
  it('should encode length as prefix', async () => {
    const input = await someBytes()
    const output = lp.encode.single(input)

    const length = Varint.decode(output.slice())
    expect(length).to.equal(input.length)
    expect(output.slice(Varint.decode.bytes)).to.deep.equal(input)
  })

  it('should encode zero length as prefix', async () => {
    const input = Buffer.alloc(0)
    const output = lp.encode.single(input)

    const length = Varint.decode(output.slice())
    expect(length).to.equal(input.length)
    expect(output.slice(Varint.decode.bytes)).to.deep.equal(input)
  })
})
