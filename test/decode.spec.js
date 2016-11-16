/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const Reader = require('pull-reader')
const expect = require('chai').expect
const varint = require('varint')
const block = require('pull-block')

const lp = require('../src')

describe('pull-length-prefixed decode', () => {
  it('decodeFromReader', (done) => {

    const input = [
      new Buffer('haay wuurl!')
    ]

    const reader = Reader(1e3)
    
    // length-prefix encode input
    pull(
      pull.values(input),
      lp.encode(),
      reader
    )

    // decode from reader
    lp.decodeFromReader(reader, function(err, output){
      if (err) throw err
      expect(
        output
      ).to.be.eql(
        input[0]
      )
      done()
    })

  })

  it('decodeFromReader - empty input', (done) => {

    const input = []

    const reader = Reader(1e3)
    
    // length-prefix encode input
    pull(
      pull.values(input),
      lp.encode(),
      reader
    )

    // decode from reader
    lp.decodeFromReader(reader, function(err, output){
      expect(err).to.exist
      expect(err).to.be.instanceof(Error)
      done()
    })

  })
})
