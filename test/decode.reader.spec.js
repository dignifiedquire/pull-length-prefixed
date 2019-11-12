/* eslint-env mocha */
'use strict'

const pipe = require('it-pipe')
const Reader = require('it-reader')
const { expect } = require('chai')
const randomInt = require('random-int')
const randomBytes = require('random-bytes')
const { map, collect } = require('streaming-iterables')
const Varint = require('varint')

const lp = require('../')
const toBuffer = map(c => c.slice())
const times = (n, fn) => Array.from(Array(n), fn)
const someBytes = n => randomBytes(randomInt(1, n || 32))

describe('decode from reader', () => {
  it('should be able to decode from an it-reader', async () => {
    const input = await Promise.all(times(5, someBytes))
    const reader = Reader(
      pipe(input, lp.encode())
    )

    const output = await pipe(
      lp.decodeFromReader(reader),
      toBuffer,
      collect
    )

    expect(output).to.eql(input)
  })

  it('should not decode a message that is too long', async () => {
    const byteLength = 100 + 1
    const bytes = await randomBytes(byteLength)

    const input = [
      Buffer.from(Varint.encode(byteLength)),
      bytes
    ]

    const reader = Reader(input)
    try {
      await pipe(
        lp.decodeFromReader(reader, { maxDataLength: 100 }),
        toBuffer,
        collect
      )
    } catch (err) {
      expect(err.code).to.equal('ERR_MSG_TOO_LONG')
      return
    }

    throw new Error('did not throw for too long message')
  })
})
