/* eslint-env mocha */
'use strict'

const Buffer = require('safe-buffer').Buffer

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const expect = require('chai').expect
const varint = require('varint')
const block = require('pull-block')

const lp = require('../src')

describe('pull-length-prefixed', () => {
  it('basics', (done) => {
    const input = [
      Buffer.from('hello '),
      Buffer.from('world')
    ]

    pull(
      pull.values(input),
      lp.encode(),
      pull.collect((err, encoded) => {
        if (err) throw err

        const helloLen = varint.encode('hello '.length)
        const worldLen = varint.encode('world'.length)
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
        pull(
          pull.values(encoded),
          lp.decode(),
          pull.collect((err, output) => {
            if (err) throw err
            expect(
              input
            ).to.be.eql(
              output
            )
            done()
          })
        )
      })
    )
  })

  it('max length', (done) => {
    const input = [
      Buffer.from('hello '),
      Buffer.from('world')
    ]

    pull(
      pull.values(input),
      lp.encode(),
      pull.collect((err, encoded) => {
        if (err) throw err

        const helloLen = varint.encode('hello '.length)
        const worldLen = varint.encode('world'.length)
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

        pull(
          pull.values(encoded),
          lp.decode({ maxLength: 1 }),
          pull.collect((err) => {
            expect(err).to.include({
              message: 'size longer than max permitted length of 1!'
            })
            done()
          })
        )
      })
    )
  })

  it('push time based', (done) => {
    const p = new Pushable()
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

    pull(
      p,
      lp.encode(),
      lp.decode(),
      pull.collect((err, output) => {
        if (err) throw err
        expect(
          input
        ).to.be.eql(
          output
        )
        done()
      })
    )
  })

  it('invalid prefix', (done) => {
    const input = [
      Buffer.from('br34k mai h34rt')
    ]

    pull(
      // encode valid input
      pull.values(input),
      lp.encode(),
      // corrupt data
      pull.map(data => data.slice(0, -6)),
      // attempt decode
      lp.decode(),
      pull.collect((err, output) => {
        expect(err).to.be.instanceof(Error)
        expect(output).to.deep.equal([])
        done()
      })
    )
  })

  const sizes = [1, 2, 4, 6, 10, 100, 1000]

  sizes.forEach((size) => {
    it(`split packages to blocks: ${size}`, (done) => {
      const longBuffer = Buffer.alloc(size * 10)
      longBuffer.fill('a')

      const input = [
        Buffer.from('hello '),
        Buffer.from('world'),
        longBuffer
      ]

      pull(
        pull.values(input),
        lp.encode(),
        block(size, { nopad: true }),
        lp.decode(),
        pull.collect((err, res) => {
          if (err) throw err

          expect(
            res
          ).to.be.eql([
            Buffer.from('hello '),
            Buffer.from('world'),
            longBuffer
          ])
          done()
        })
      )
    })
  })

  describe('back pressure', () => {
    let input = []

    before(() => {
      for (let j = 0; j < 200; j++) {
        const a = []
        for (let i = 0; i < 200; i++) {
          a[i] = String(i)
        }

        input.push(Buffer.from(a.join('')))
      }
    })

    it('encode - slow in - fast out', (done) => {
      pull(
        pull.values(input),
        delay(10),
        lp.encode(),
        lp.decode(),
        pull.collect((err, res) => {
          if (err) throw err

          expect(res).to.be.eql(input)

          done()
        })
      )
    })

    it('decode - slow in - fast out', (done) => {
      pull(
        pull.values(input),
        lp.encode(),
        delay(10),
        lp.decode(),
        pull.collect((err, res) => {
          if (err) throw err

          expect(res).to.be.eql(input)

          done()
        })
      )
    })
  })
})

function delay (time) {
  return pull.asyncMap((val, cb) => {
    setTimeout(() => {
      cb(null, val)
    }, time)
  })
}
