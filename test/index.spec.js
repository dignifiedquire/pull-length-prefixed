/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const expect = require('chai').expect
const varint = require('varint')
const block = require('pull-block')

const lp = require('../src')

describe('pull-length-prefixed', () => {
  it('basics', (done) => {
    const input = [
      new Buffer('hello '),
      new Buffer('world')
    ]

    pull(
      pull.values(input),
      lp.encode(),
      pull.collect((err, encoded) => {
        if (err) throw err

        expect(
          encoded
        ).to.be.eql([
          Buffer.concat([
            new Buffer(varint.encode('hello '.length)),
            new Buffer('hello ')
          ]),
          Buffer.concat([
            new Buffer(varint.encode('world'.length)),
            new Buffer('world')
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

  it('push time based', (done) => {
    const p = new Pushable()
    const input = []
    let i = 0

    push()
    function push () {
      setTimeout(() => {
        const val = new Buffer(`hello ${i}`)
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

  it.skip('invalid prefix', (done) => {
    const input = [
      new Buffer('br34k mai h34rt'),
    ]

    pull(
      // encode valid input
      pull.values(input),
      lp.encode(),
      // corrupt data
      pull.map(data => data.slice(0,-6)),
      // attempt decode
      lp.decode(),
      pull.collect((err, output) => {
        expect(err).to.exist
        expect(err).to.be.instanceof(Error)
        expect(output).to.not.exist
        done()
      })
    )
  })

  const sizes = [1, 2, 4, 6, 10, 100, 1000]

  sizes.forEach((size) => {
    it(`split packages to blocks: ${size}`, (done) => {
      const longBuffer = new Buffer(size * 10)
      longBuffer.fill('a')

      const input = [
        new Buffer('hello '),
        new Buffer('world'),
        longBuffer
      ]

      pull(
        pull.values(input),
        lp.encode(),
        block(size, {nopad: true}),
        lp.decode(),
        pull.collect((err, res) => {
          if (err) throw err

          expect(
            res
          ).to.be.eql([
            new Buffer('hello '),
            new Buffer('world'),
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

        input.push(new Buffer(a.join('')))
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
