import { expect } from 'aegir/utils/chai.js'
import varint from 'varint'
import { pipe } from 'it-pipe'
import { block } from 'it-block'
import { pushable } from 'it-pushable'
import { toBuffer } from './helpers/index.js'
import all from 'it-all'
import map from 'it-map'
import each from 'it-foreach'
import type { Source } from 'it-stream-types'
import type BufferList from 'bl/BufferList.js'
import * as lp from '../src/index.js'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

const { int32BEEncode, int32BEDecode } = lp

describe('e2e', () => {
  it('basics', async () => {
    const input = [
      uint8ArrayFromString('hello '),
      uint8ArrayFromString('world')
    ]

    const encoded = await pipe(input, lp.encode(), toBuffer, async (source) => await all(source))

    const helloLen = varint.encode('hello '.length)
    const worldLen = varint.encode('world'.length)

    expect(
      encoded
    ).to.be.eql([
      uint8ArrayConcat([
        Uint8Array.from(helloLen),
        uint8ArrayFromString('hello ')
      ]),
      uint8ArrayConcat([
        Uint8Array.from(worldLen),
        uint8ArrayFromString('world')
      ])
    ])

    const output = await pipe(encoded, lp.decode(), toBuffer, async (source) => await all(source))

    expect(input).to.be.eql(output)
  })

  it('max length', async () => {
    const input = [
      uint8ArrayFromString('hello '),
      uint8ArrayFromString('world')
    ]

    const encoded = await pipe(input, lp.encode(), toBuffer, async (source) => await all(source))

    const helloLen = varint.encode('hello '.length)
    const worldLen = varint.encode('world'.length)

    expect(
      encoded
    ).to.be.eql([
      uint8ArrayConcat([
        Uint8Array.from(helloLen),
        uint8ArrayFromString('hello ')
      ]),
      uint8ArrayConcat([
        Uint8Array.from(worldLen),
        uint8ArrayFromString('world')
      ])
    ])

    await expect(
      pipe(encoded, lp.decode({ maxDataLength: 1 }), async (source) => await all(source))
    ).to.eventually.be.rejected.with.property('code', 'ERR_MSG_DATA_TOO_LONG')
  })

  it('zero length', async () => {
    const encoded = await pipe([], lp.encode(), toBuffer, async (source) => await all(source))

    expect(encoded).to.be.eql([])

    const decoded = await pipe(
      [new Uint8Array(0), uint8ArrayFromString('more data')],
      lp.encode(),
      lp.decode(),
      toBuffer,
      async (source) => await all(source)
    )

    expect(decoded).to.be.eql([new Uint8Array(0), uint8ArrayFromString('more data')])
  })

  it('push time based', async () => {
    const p = pushable<Uint8Array>()
    const input: Uint8Array[] = []
    let i = 0

    push()
    function push () {
      setTimeout(() => {
        const val = uint8ArrayFromString(`hello ${i}`)
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
      async (source) => await all(source)
    )

    expect(input).to.be.eql(output)
  })

  it('invalid prefix', async () => {
    const input = [
      uint8ArrayFromString('br34k mai h34rt')
    ]

    await expect(
      pipe(
        // encode valid input
        input,
        lp.encode(),
        // corrupt data
        (source) => map(source, data => data.slice(0, -6)),
        // attempt decode
        lp.decode(),
        async (source) => await all(source)
      )
    ).to.eventually.be.rejected.with.property('code', 'ERR_UNEXPECTED_EOF')
  })

  const sizes = [1, 2, 4, 6, 10, 100, 1000]

  sizes.forEach((size) => {
    it(`split packages to blocks: ${size}`, async () => {
      const longBuffer = uint8ArrayFromString(new Array(size * 10).fill('a').join(''))

      const input = [
        uint8ArrayFromString('hello '),
        uint8ArrayFromString('world'),
        longBuffer
      ]

      const res = await pipe(
        input,
        lp.encode(),
        toBuffer,
        block(size, { noPad: true }),
        lp.decode(),
        toBuffer,
        async (source) => await all(source)
      )

      expect(
        res
      ).to.be.eql([
        uint8ArrayFromString('hello '),
        uint8ArrayFromString('world'),
        longBuffer
      ])
    })
  })

  describe('back pressure', () => {
    const input: Uint8Array[] = []

    before(() => {
      for (let j = 0; j < 200; j++) {
        const a = []
        for (let i = 0; i < 200; i++) {
          a[i] = String(i)
        }

        input.push(uint8ArrayFromString(a.join('')))
      }
    })

    it('encode - slow in - fast out', async () => {
      const res = await pipe(
        input,
        (source) => delay(source, 10),
        lp.encode(),
        lp.decode(),
        toBuffer,
        async (source) => await all(source)
      )

      expect(res).to.be.eql(input)
    })

    it('decode - slow in - fast out', async () => {
      const res = await pipe(
        input,
        lp.encode(),
        (source) => delay(source, 10),
        lp.decode(),
        toBuffer,
        async (source) => await all(source)
      )

      expect(res).to.be.eql(input)
    })

    it('encode/decode with custom length encoder/decoder', async () => {
      const res = await pipe(
        input,
        lp.encode({ lengthEncoder: int32BEEncode }),
        lp.decode({ lengthDecoder: int32BEDecode }),
        toBuffer,
        async (source) => await all(source)
      )

      expect(res).to.be.eql(input)
    })
  })
})

function delay (source: Source<Uint8Array | BufferList>, time: number) {
  return each(source, async () => await new Promise(resolve => setTimeout(resolve, time)))
}
