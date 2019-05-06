/* eslint-env mocha */
'use strict'

const pipe = require('it-pipe')
const { expect } = require('chai')
const randomInt = require('random-int')
const randomBytes = require('random-bytes')
const { map, collect } = require('streaming-iterables')
const Varint = require('varint')

const lp = require('../')

describe('decode', () => {
  it('should decode single message', async () => {
    const byteLength = randomInt(1, 64)
    const bytes = await randomBytes(byteLength)

    const input = Buffer.concat([
      Buffer.from(Varint.encode(byteLength)),
      bytes
    ])

    const [ output ] = await pipe([input], lp.decode(), map(c => c.slice()), collect)
    expect(output.slice(-byteLength)).to.deep.equal(bytes)
  })

  it('should decode fragmented single message')
})
