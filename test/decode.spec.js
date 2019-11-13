/* eslint-env mocha */
'use strict'

const pipe = require('it-pipe')
const { expect } = require('chai')
const randomInt = require('random-int')
const randomBytes = require('random-bytes')
const { collect } = require('streaming-iterables')
const Varint = require('varint')
const BufferList = require('bl/BufferList')
const defer = require('p-defer')
const { toBuffer, times } = require('./_helpers')

const lp = require('../')
const { MAX_LENGTH_LENGTH, MAX_DATA_LENGTH } = lp.decode
const { int32BEDecode } = lp

describe('decode', () => {
  it('should decode single message', async () => {
    const byteLength = randomInt(1, 64)
    const bytes = await randomBytes(byteLength)

    const input = Buffer.concat([
      Buffer.from(Varint.encode(byteLength)),
      bytes
    ])

    const [output] = await pipe([input], lp.decode(), toBuffer, collect)
    expect(output.slice(-byteLength)).to.deep.equal(bytes)
  })

  it('should decode empty single message', async () => {
    const input = Buffer.concat([
      Buffer.from(Varint.encode(0)),
      Buffer.alloc(0)
    ])

    const [output] = await pipe([input], lp.decode(), collect)
    expect(output).to.deep.equal(Buffer.alloc(0))
  })

  it('should decode single message as BufferList', async () => {
    const byteLength = randomInt(1, 64)
    const bytes = await randomBytes(byteLength)

    const input = new BufferList([
      Buffer.from(Varint.encode(byteLength)),
      bytes
    ])

    const [output] = await pipe([input], lp.decode(), toBuffer, collect)
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

    const [output] = await pipe(input, lp.decode(), toBuffer, collect)
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

    const [output] = await pipe(input, lp.decode(), toBuffer, collect)
    expect(output.slice(-byteLength)).to.deep.equal(bytes)
  })

  it('should not decode message length that is too long', async () => {
    // A value < 0x80 signifies end of varint so pass buffers of >= 0x80
    // so that it will keep throwing a RangeError until we reach the max length
    const lengths = times(5, () => Buffer.alloc(MAX_LENGTH_LENGTH / 4).fill(0x80))
    const bytes = await randomBytes(randomInt(2, 64))

    const input = [...lengths, bytes]

    try {
      await pipe(input, lp.decode(), toBuffer, collect)
    } catch (err) {
      expect(err.code).to.equal('ERR_MSG_LENGTH_TOO_LONG')
      return
    }
    throw new Error('did not throw for too long message')
  })

  it('should not decode message data that is too long', async () => {
    const byteLength = MAX_DATA_LENGTH + 1
    const bytes = await randomBytes(byteLength)

    const input = [
      Buffer.from(Varint.encode(byteLength)),
      bytes
    ]

    try {
      await pipe(input, lp.decode(), toBuffer, collect)
    } catch (err) {
      expect(err.code).to.equal('ERR_MSG_DATA_TOO_LONG')
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

  it('should callback on length and data boundaries', async () => {
    const byteLength0 = randomInt(2, 64)
    const bytes0 = await randomBytes(byteLength0)

    const byteLength1 = randomInt(1, 64)
    const bytes1 = await randomBytes(byteLength1)

    const input = [
      Buffer.concat([
        Buffer.from(Varint.encode(byteLength0)),
        bytes0,
        Buffer.from(Varint.encode(byteLength1)),
        bytes1
      ])
    ]

    const lengthDeferred = defer()
    const dataDeferred = defer()

    const expectedLengths = [byteLength0, byteLength1]
    const expectedDatas = [bytes0, bytes1]

    const onLength = len => {
      const expectedLength = expectedLengths.shift()

      try {
        expect(len).to.equal(expectedLength)
      } catch (err) {
        return lengthDeferred.reject(err)
      }

      if (!expectedLengths.length) {
        lengthDeferred.resolve()
      }
    }

    const onData = data => {
      const expectedData = expectedDatas.shift()

      try {
        expect(data.slice()).to.eql(expectedData)
      } catch (err) {
        return dataDeferred.reject(err)
      }

      if (!expectedLengths.length) {
        dataDeferred.resolve()
      }
    }

    pipe(input, lp.decode({ onLength, onData }), collect)

    await Promise.all([lengthDeferred.promise, dataDeferred.promise])
  })

  it('should decode with custom length decoder (int32BE)', async () => {
    const byteLength0 = randomInt(2, 64)
    const encodedByteLength0 = Buffer.allocUnsafe(4)
    encodedByteLength0.writeInt32BE(byteLength0)
    const bytes0 = await randomBytes(byteLength0)

    const byteLength1 = randomInt(1, 64)
    const encodedByteLength1 = Buffer.allocUnsafe(4)
    encodedByteLength1.writeInt32BE(byteLength1)
    const bytes1 = await randomBytes(byteLength1)

    const input = [
      Buffer.concat([
        encodedByteLength0,
        bytes0.slice(0, 1)
      ]),
      Buffer.concat([
        bytes0.slice(1),
        encodedByteLength1,
        bytes1
      ])
    ]

    const output = await pipe(input, lp.decode({ lengthDecoder: int32BEDecode }), toBuffer, collect)
    expect(output[0].slice(-byteLength0)).to.deep.equal(bytes0)
    expect(output[1].slice(-byteLength1)).to.deep.equal(bytes1)
  })
})
