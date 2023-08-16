import { expect } from 'aegir/chai'
import all from 'it-all'
import { block } from 'it-block'
import each from 'it-foreach'
import map from 'it-map'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import { Uint8ArrayList } from 'uint8arraylist'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import varint from 'varint'
import * as lp from '../src/index.js'
import { int32BEDecode } from './helpers/int32BE-decode.js'
import { int32BEEncode } from './helpers/int32BE-encode.js'

describe('e2e', () => {
  it('basics', async () => {
    const input = [
      uint8ArrayFromString('hello '),
      uint8ArrayFromString('world')
    ]

    const encoded = await pipe(
      input,
      (source) => lp.encode(source),
      async (source) => new Uint8ArrayList(...all(source))
    )

    const helloLen = varint.encode('hello '.length)
    const worldLen = varint.encode('world'.length)

    expect(
      encoded.slice()
    ).to.equalBytes(
      uint8ArrayConcat([
        Uint8Array.from(helloLen),
        uint8ArrayFromString('hello '),
        Uint8Array.from(worldLen),
        uint8ArrayFromString('world')
      ])
    )

    const output = await pipe(
      encoded,
      (source) => lp.decode(source),
      async (source) => new Uint8ArrayList(...all(source))
    )

    expect(output.slice()).to.equalBytes(
      uint8ArrayConcat(input)
    )
  })

  it('max length', async () => {
    const input = [
      uint8ArrayFromString('hello '),
      uint8ArrayFromString('world')
    ]

    const encoded = pipe(
      input,
      (source) => lp.encode(source),
      (source) => new Uint8ArrayList(...all(source))
    )

    const helloLen = varint.encode('hello '.length)
    const worldLen = varint.encode('world'.length)

    expect(
      encoded.slice()
    ).to.equalBytes(
      uint8ArrayConcat([
        Uint8Array.from(helloLen),
        uint8ArrayFromString('hello '),
        Uint8Array.from(worldLen),
        uint8ArrayFromString('world')
      ])
    )

    await expect(
      pipe(encoded, (source) => lp.decode(source, { maxDataLength: 1 }), async (source) => all(source))
    ).to.eventually.be.rejected.with.property('code', 'ERR_MSG_DATA_TOO_LONG')
  })

  it('zero length', async () => {
    const encoded = pipe([], (source) => lp.encode(source), (source) => all(source))

    expect(encoded).to.be.eql([])

    const decoded = pipe(
      [new Uint8Array(0), uint8ArrayFromString('more data')],
      (source) => lp.encode(source),
      (source) => lp.decode(source),
      (source) => new Uint8ArrayList(...all(source))
    )

    expect(decoded.slice()).to.equalBytes(
      uint8ArrayConcat([
        new Uint8Array(0),
        uint8ArrayFromString('more data')]
      )
    )
  })

  it('push time based', async () => {
    const p = pushable()
    const input: Uint8Array[] = []
    let i = 0

    push()
    function push (): void {
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
      (source) => lp.encode(source),
      (source) => lp.decode(source),
      async (source) => new Uint8ArrayList(...await all(source))
    )

    expect(output.slice()).to.equalBytes(
      uint8ArrayConcat(input)
    )
  })

  it('invalid prefix', async () => {
    const input = [
      uint8ArrayFromString('br34k mai h34rt')
    ]

    await expect(
      pipe(
        // encode valid input
        input,
        (source) => lp.encode(source),
        // corrupt data
        (source) => map(source, data => data.slice(0, -6)),
        // attempt decode
        (source) => lp.decode(source),
        async (source) => all(source)
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
        (source) => lp.encode(source),
        block(size, { noPad: true }),
        (source) => lp.decode(source),
        async (source) => new Uint8ArrayList(...await all(source))
      )

      expect(
        res.slice()
      ).to.equalBytes(
        uint8ArrayConcat([
          uint8ArrayFromString('hello '),
          uint8ArrayFromString('world'),
          longBuffer
        ])
      )
    })
  })

  describe('back pressure', () => {
    const input: Uint8Array[] = []

    before(() => {
      for (let j = 0; j < 200; j++) {
        const a: string[] = []
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
        (source) => lp.encode(source),
        (source) => lp.decode(source),
        async (source) => new Uint8ArrayList(...await all(source))
      )

      expect(res.slice()).to.equalBytes(uint8ArrayConcat(input))
    })

    it('decode - slow in - fast out', async () => {
      const res = await pipe(
        input,
        (source) => lp.encode(source),
        (source) => delay(source, 10),
        (source) => lp.decode(source),
        async (source) => new Uint8ArrayList(...await all(source))
      )

      expect(res.slice()).to.equalBytes(uint8ArrayConcat(input))
    })

    it('encode/decode with custom length encoder/decoder', async () => {
      const res = pipe(
        input,
        (source) => lp.encode(source, { lengthEncoder: int32BEEncode }),
        (source) => lp.decode(source, { lengthDecoder: int32BEDecode }),
        (source) => new Uint8ArrayList(...all(source))
      )

      expect(res.slice()).to.equalBytes(uint8ArrayConcat(input))
    })
  })
})

function delay (source: Iterable<Uint8Array | Uint8ArrayList>, time: number): AsyncGenerator<Uint8Array | Uint8ArrayList, void, undefined> {
  return each(source, async () => { await new Promise(resolve => setTimeout(resolve, time)) })
}
