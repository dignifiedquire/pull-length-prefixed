/* eslint-env mocha */
'use strict'

const pipe = require('it-pipe')
const Reader = require('it-reader')
const { expect } = require('chai')
const randomBytes = require('random-bytes')
const { collect } = require('streaming-iterables')
const Varint = require('varint')
const { toBuffer, times, someBytes } = require('./_helpers')

const lp = require('../')

describe('decode from reader', () => {
  it('should be able to decode from an it-reader', async () => {
    const input = await Promise.all(times(5, someBytes))
    const reader = Reader(
      pipe(input, lp.encode())
    )

    const output = await pipe(
      lp.decode.fromReader(reader),
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
        lp.decode.fromReader(reader, { maxDataLength: 100 }),
        toBuffer,
        collect
      )
    } catch (err) {
      expect(err.code).to.equal('ERR_MSG_DATA_TOO_LONG')
      return
    }

    throw new Error('did not throw for too long message')
  })
})
