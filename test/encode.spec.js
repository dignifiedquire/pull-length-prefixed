/* eslint-env mocha */
'use strict'

const pipe = require('it-pipe')
const { expect } = require('chai')
const randomInt = require('random-int')
const randomBytes = require('random-bytes')
const { map, collect } = require('streaming-iterables')
const Varint = require('varint')

const lp = require('../')
const { MIN_POOL_SIZE } = lp.encode

const times = (n, fn) => Array.from(Array(n), fn)
const someBytes = n => randomBytes(randomInt(1, n || 32))

describe('encode', () => {
  it('should encode length as prefix', async () => {
    const input = await Promise.all(times(randomInt(1, 10), someBytes))
    const output = await pipe(input, lp.encode(), map(c => c.slice()), collect)
    output.forEach((o, i) => {
      const length = Varint.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(Varint.decode.bytes)).to.deep.equal(input[i])
    })
  })

  it('should encode zero length as prefix', async () => {
    const input = [Buffer.alloc(0)]
    const output = await pipe(input, lp.encode(), map(c => c.slice()), collect)
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
      map(c => c.slice()),
      collect
    )
    output.forEach((o, i) => {
      const length = Varint.decode(o)
      expect(length).to.equal(input[i].length)
      expect(o.slice(Varint.decode.bytes)).to.deep.equal(input[i])
    })
  })
})
