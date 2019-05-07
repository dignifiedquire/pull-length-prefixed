/* eslint-env mocha */
'use strict'

const pipe = require('it-pipe')
const { expect } = require('chai')
const randomInt = require('random-int')
const randomBytes = require('random-bytes')
const { map, collect } = require('streaming-iterables')
const Varint = require('varint')
const BufferList = require('bl')

const lp = require('../')
const { MAX_DATA_LENGTH } = lp.decode
const toBuffer = map(c => c.slice())

describe('decode', () => {
  it('should decode single message', async () => {
    const byteLength = randomInt(1, 64)
    const bytes = await randomBytes(byteLength)

    const input = Buffer.concat([
      Buffer.from(Varint.encode(byteLength)),
      bytes
    ])

    const [ output ] = await pipe([input], lp.decode(), toBuffer, collect)
    expect(output.slice(-byteLength)).to.deep.equal(bytes)
  })

  it('should decode empty single message', async () => {
    const input = Buffer.concat([
      Buffer.from(Varint.encode(0)),
      Buffer.alloc(0)
    ])

    const [ output ] = await pipe([input], lp.decode(), collect)
    expect(output).to.deep.equal(Buffer.alloc(0))
  })

  it('should decode single message as BufferList', async () => {
    const byteLength = randomInt(1, 64)
    const bytes = await randomBytes(byteLength)

    const input = new BufferList([
      Buffer.from(Varint.encode(byteLength)),
      bytes
    ])

    const [ output ] = await pipe([input], lp.decode(), toBuffer, collect)
    expect(output.slice(-byteLength)).to.deep.equal(bytes)
  })

  it('should decode fragmented length single message', async () => {
    const byteLength = 128 // for 2 byte varint
    const bytes = await randomBytes(byteLength)

    const input = [
      Buffer.from(Varint.encode(byteLength).slice(0, 1)),
      Buffer.concat([
        Buffer.from(Varint.encode(byteLength).slice(1)),
        bytes
      ])
    ]

    const [ output ] = await pipe(input, lp.decode(), toBuffer, collect)
    expect(output.slice(-byteLength)).to.deep.equal(bytes)
  })

  it('should decode fragmented data single message', async () => {
    const byteLength = randomInt(2, 64)
    const bytes = await randomBytes(byteLength)

    const input = [
      Buffer.concat([
        Buffer.from(Varint.encode(byteLength)),
        bytes.slice(0, 1)
      ]),
      bytes.slice(1)
    ]

    const [ output ] = await pipe(input, lp.decode(), toBuffer, collect)
    expect(output.slice(-byteLength)).to.deep.equal(bytes)
  })

  it('should not decode a message that is too long', async () => {
    const byteLength = MAX_DATA_LENGTH + 1
    const bytes = await randomBytes(byteLength)

    const input = [
      Buffer.from(Varint.encode(byteLength)),
      bytes
    ]

    try {
      await pipe(input, lp.decode(), toBuffer, collect)
    } catch (err) {
      expect(err.code).to.equal('ERR_MSG_TOO_LONG')
      return
    }
    throw new Error('did not throw for too long message')
  })

  it('should decode two messages chunked across boundary', async () => {
    const byteLength0 = randomInt(2, 64)
    const bytes0 = await randomBytes(byteLength0)

    const byteLength1 = randomInt(1, 64)
    const bytes1 = await randomBytes(byteLength1)

    const input = [
      Buffer.concat([
        Buffer.from(Varint.encode(byteLength0)),
        bytes0.slice(0, 1)
      ]),
      Buffer.concat([
        bytes0.slice(1),
        Buffer.from(Varint.encode(byteLength1)),
        bytes1
      ])
    ]

    const output = await pipe(input, lp.decode(), toBuffer, collect)
    expect(output[0].slice(-byteLength0)).to.deep.equal(bytes0)
    expect(output[1].slice(-byteLength1)).to.deep.equal(bytes1)
  })
})
