/* eslint-env mocha */
'use strict'

const { Buffer } = require('buffer')
const pipe = require('it-pipe')
const { expect } = require('chai')
const randomInt = require('random-int')
const { collect } = require('streaming-iterables')
const Varint = require('varint')
const { toBuffer, times, someBytes } = require('./_helpers')

const lp = require('../')
const { int32BEEncode } = lp
const { MIN_POOL_SIZE } = lp.encode

describe('encode', () => {
  it('should encode length as prefix', async () => {
    const input = await Promise.all(times(randomInt(1, 10), someBytes))
    const output = await pipe(input, lp.encode(), toBuffer, collect)
    output.forEach((o, i) => {
      const length = Varint.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(Varint.decode.bytes)).to.deep.equal(input[i])
    })
  })

  it('should encode zero length as prefix', async () => {
    const input = [Buffer.alloc(0)]
    const output = await pipe(input, lp.encode(), toBuffer, collect)
    output.forEach((o, i) => {
      const length = Varint.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(Varint.decode.bytes)).to.deep.equal(input[i])
    })
  })

  it('should re-allocate buffer pool when empty', async () => {
    const input = await Promise.all(times(MIN_POOL_SIZE * 2, someBytes))
    const output = await pipe(
      input,
      lp.encode({ poolSize: MIN_POOL_SIZE * 1.5 }),
      toBuffer,
      collect
    )
    output.forEach((o, i) => {
      const length = Varint.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(Varint.decode.bytes)).to.deep.equal(input[i])
    })
  })

  it('should encode with custom length encoder (int32BE)', async () => {
    const input = await Promise.all(times(randomInt(1, 100), someBytes))
    const output = await pipe(
      input,
      lp.encode({ lengthEncoder: int32BEEncode }),
      toBuffer,
      collect
    )
    output.forEach((o, i) => {
      const length = o.readInt32BE(0)
      expect(length).to.equal(input[i].length)
    })
  })
})
