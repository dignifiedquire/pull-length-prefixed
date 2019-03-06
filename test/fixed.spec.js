/* eslint-env mocha */
'use strict'

const Buffer = require('safe-buffer').Buffer

const pull = require('pull-stream')
const expect = require('chai').expect

const lp = require('../src')

describe('pull-length-prefixed', () => {
  it('basics', (done) => {
    const input = [
      Buffer.from('hello '),
      Buffer.from('world')
    ]
    const bytes = 4

    pull(
      pull.values(input),
      lp.encode({ fixed: true, bytes: bytes }),
      pull.collect((err, encoded) => {
        if (err) throw err

        expect(
          encoded
        ).to.be.eql([
          Buffer.concat([
            Buffer.alloc(bytes, '00000006', 'hex'),
            Buffer.from('hello ')
          ]),
          Buffer.concat([
            Buffer.alloc(bytes, '00000005', 'hex'),
            Buffer.from('world')
          ])
        ])

        pull(
          pull.values(encoded),
          lp.decode({ fixed: true, bytes: bytes }),
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

    const bytes = 4

    pull(
      pull.values(input),
      lp.encode({ fixed: true, bytes: bytes }),
      pull.collect((err, encoded) => {
        if (err) throw err

        expect(
          encoded
        ).to.be.eql([
          Buffer.concat([
            Buffer.alloc(bytes, '00000006', 'hex'),
            Buffer.from('hello ')
          ]),
          Buffer.concat([
            Buffer.alloc(bytes, '00000005', 'hex'),
            Buffer.from('world')
          ])
        ])

        pull(
          pull.values(encoded),
          lp.decode({ fixed: true, maxLength: 1 }),
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
})
