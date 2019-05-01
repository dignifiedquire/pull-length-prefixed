/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const Reader = require('pull-reader')
const expect = require('chai').expect

const lp = require('../src')

describe('pull-length-prefixed decodeFromReader', () => {
  it('basic', (done) => {
    const input = [
      Buffer.from('haay wuurl!')
    ]

    const reader = Reader(1e3)

    // length-prefix encode input
    pull(
      pull.values(input),
      lp.encode(),
      reader
    )

    // decode from reader
    lp.decodeFromReader(reader, function (err, output) {
      if (err) throw err
      expect(
        output
      ).to.be.eql(
        input[0]
      )
      done()
    })
  })

  it('empty input', (done) => {
    const input = []

    const reader = Reader(1e3)

    // length-prefix encode input
    pull(
      pull.values(input),
      lp.encode(),
      reader
    )

    // decode from reader
    lp.decodeFromReader(reader, function (err, output) {
      expect(output).to.eql(Buffer.alloc(0))
      done(err)
    })
  })
})
