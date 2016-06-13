'use strict'

const varint = require('varint')
const Reader = require('pull-reader')
const Buffer = require('safe-buffer').Buffer

module.exports = decode

const MSB = 0x80
const isEndByte = (byte) => !(byte & MSB)

function decode () {
  let ended = false
  let reader = new Reader()
  let first = true

  return (read) => (end, cb) => {
    reader(read)
    if (end) return reader.abort(end, cb)
    if (ended) return cb(ended)

    let rawMsgSize = []
    if (first) readByte()

    // 1. Read the varint
    function readByte () {
      first = false
      reader.read(1, (err, byte) => {
        if (err) {
          ended = err
          return cb(ended)
        }

        rawMsgSize.push(byte)
        if (byte && !isEndByte(byte[0])) {
          readByte()
        } else {
          readMessage()
        }
      })
    }

    function readMessage () {
      const msgSize = varint.decode(Buffer.concat(rawMsgSize))
      rawMsgSize = []
      reader.read(msgSize, (err, msg) => {
        if (err) {
          ended = err
          return cb(ended)
        }

        first = true
        cb(null, msg)
      })
    }
  }
}
