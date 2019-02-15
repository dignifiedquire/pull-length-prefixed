/* eslint-env mocha */
'use strict'

const Buffer = require('safe-buffer').Buffer

const pull = require('pull-stream')
const expect = require('chai').expect
const varint = require('varint')

const lp = require('../src')

describe('pull-length-prefixed', () => {
  it('sync stream', (done) => {
    const input = [...Array(500).keys()].map(() => Buffer.from('payload'))

    pull(
      pull.values(input),
      lp.encode(),
      pull.collect((err, encoded) => {
        if (err) throw err

        expect(
          encoded
        ).to.be.eql(
          input.map(data => {
            const len = varint.encode(data.length)
            return Buffer.concat([
              Buffer.alloc(len.length, len, 'utf8'),
              Buffer.alloc(data.length, data, 'utf8')
            ])
          }))

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
})