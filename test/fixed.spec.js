/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const expect = require('chai').expect

const lp = require('../src')

describe('pull-length-prefixed', () => {
  it('basics', (done) => {
    const input = [
      new Buffer('hello '),
      new Buffer('world')
    ]

    pull(
      pull.values(input),
      lp.encode({fixed: true}),
      pull.collect((err, encoded) => {
        if (err) throw err

        expect(
          encoded
        ).to.be.eql([
          Buffer.concat([
            new Buffer('00000006', 'hex'),
            new Buffer('hello ')
          ]),
          Buffer.concat([
            new Buffer('00000005', 'hex'),
            new Buffer('world')
          ])
        ])

        pull(
          pull.values(encoded),
          lp.decode({fixed: true}),
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
      new Buffer('hello '),
      new Buffer('world')
    ]

    pull(
      pull.values(input),
      lp.encode({fixed: true}),
      pull.collect((err, encoded) => {
        if (err) throw err

        expect(
          encoded
        ).to.be.eql([
          Buffer.concat([
            new Buffer('00000006', 'hex'),
            new Buffer('hello ')
          ]),
          Buffer.concat([
            new Buffer('00000005', 'hex'),
            new Buffer('world')
          ])
        ])

        pull(
          pull.values(encoded),
          lp.decode({fixed: true, maxLength: 1}),
          pull.collect((err, output) => {
            expect(
              err
            ).to.be.eql(
              'size longer than max permitted length of 1!'
            )
            done()
          })
        )
      })
    )
  })
})
