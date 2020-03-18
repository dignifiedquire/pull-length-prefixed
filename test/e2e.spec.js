/* eslint-env mocha */
'use strict'

const { Buffer } = require('buffer')
const { expect } = require('chai')
const Varint = require('varint')
const pipe = require('it-pipe')
const block = require('it-block')
const Pushable = require('it-pushable')
const { map, tap, collect } = require('streaming-iterables')
const { toBuffer } = require('./_helpers')

const lp = require('../')
const { int32BEEncode, int32BEDecode } = lp

describe('e2e', () => {
  it('basics', async () => {
    const input = [
      Buffer.from('hello '),
      Buffer.from('world')
    ]

    const encoded = await pipe(input, lp.encode(), toBuffer, collect)

    const helloLen = Varint.encode('hello '.length)
    const worldLen = Varint.encode('world'.length)

    expect(
      encoded
    ).to.be.eql([
      Buffer.concat([
        Buffer.alloc(helloLen.length, helloLen, 'utf8'),
        Buffer.alloc('hello '.length, 'hello ', 'utf8')
      ]),
      Buffer.concat([
        Buffer.alloc(worldLen.length, worldLen, 'utf8'),
        Buffer.alloc('world'.length, 'world', 'utf8')
      ])
    ])

    const output = await pipe(encoded, lp.decode(), toBuffer, collect)

    expect(input).to.be.eql(output)
  })

  it('max length', async () => {
    const input = [
      Buffer.from('hello '),
      Buffer.from('world')
    ]

    const encoded = await pipe(input, lp.encode(), toBuffer, collect)

    const helloLen = Varint.encode('hello '.length)
    const worldLen = Varint.encode('world'.length)

    expect(
      encoded
    ).to.be.eql([
      Buffer.concat([
        Buffer.alloc(helloLen.length, helloLen, 'utf8'),
        Buffer.alloc('hello '.length, 'hello ', 'utf8')
      ]),
      Buffer.concat([
        Buffer.alloc(worldLen.length, worldLen, 'utf8'),
        Buffer.alloc('world'.length, 'world', 'utf8')
      ])
    ])

    try {
      await pipe(encoded, lp.decode({ maxDataLength: 1 }), collect)
    } catch (err) {
      expect(err.code).to.equal('ERR_MSG_DATA_TOO_LONG')
      return
    }

    throw new Error('did not throw on too long message')
  })

  it('zero length', async () => {
    const encoded = await pipe([], lp.encode(), toBuffer, collect)

    expect(encoded).to.be.eql([])

    const decoded = await pipe(
      [Buffer.alloc(0), Buffer.from('more data')],
      lp.encode(),
      lp.decode(),
      toBuffer,
      collect
    )

    expect(decoded).to.be.eql([Buffer.alloc(0), Buffer.from('more data')])
  })

  it('push time based', async () => {
    const p = Pushable()
    const input = []
    let i = 0

    push()
    function push () {
      setTimeout(() => {
        const val = Buffer.from(`hello ${i}`)
        p.push(val)
        input.push(val)
        i++

        if (i < 20) {
          push()
        } else {
          p.end()
        }
      }, 10)
    }

    const output = await pipe(
      p,
      lp.encode(),
      lp.decode(),
      toBuffer,
      collect
    )

    expect(input).to.be.eql(output)
  })

  it('invalid prefix', async () => {
    const input = [
      Buffer.from('br34k mai h34rt')
    ]

    try {
      await pipe(
        // encode valid input
        input,
        lp.encode(),
        // corrupt data
        map(data => data.slice(0, -6)),
        // attempt decode
        lp.decode(),
        collect
      )
    } catch (err) {
      expect(err.code).to.equal('ERR_UNEXPECTED_EOF')
      return
    }

    throw new Error('did not throw for invalid prefix')
  })

  const sizes = [1, 2, 4, 6, 10, 100, 1000]

  sizes.forEach((size) => {
    it(`split packages to blocks: ${size}`, async () => {
      const longBuffer = Buffer.alloc(size * 10)
      longBuffer.fill('a')

      const input = [
        Buffer.from('hello '),
        Buffer.from('world'),
        longBuffer
      ]

      const res = await pipe(
        input,
        lp.encode(),
        block(size, { noPad: true }),
        lp.decode(),
        toBuffer,
        collect
      )

      expect(
        res
      ).to.be.eql([
        Buffer.from('hello '),
        Buffer.from('world'),
        longBuffer
      ])
    })
  })

  describe('back pressure', () => {
    const input = []

    before(() => {
      for (let j = 0; j < 200; j++) {
        const a = []
        for (let i = 0; i < 200; i++) {
          a[i] = String(i)
        }

        input.push(Buffer.from(a.join('')))
      }
    })

    it('encode - slow in - fast out', async () => {
      const res = await pipe(
        input,
        delay(10),
        lp.encode(),
        lp.decode(),
        toBuffer,
        collect
      )

      expect(res).to.be.eql(input)
    })

    it('decode - slow in - fast out', async () => {
      const res = await pipe(
        input,
        lp.encode(),
        delay(10),
        lp.decode(),
        toBuffer,
        collect
      )

      expect(res).to.be.eql(input)
    })

    it('encode/decode with custom length encoder/decoder', async () => {
      const res = await pipe(
        input,
        lp.encode({ lengthEncoder: int32BEEncode }),
        lp.decode({ lengthDecoder: int32BEDecode }),
        toBuffer,
        collect
      )

      expect(res).to.be.eql(input)
    })
  })
})

function delay (time) {
  return tap(() => new Promise(resolve => setTimeout(resolve, time)))
}
