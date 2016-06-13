/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const expect = require('chai').expect
const varint = require('varint')

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
})
