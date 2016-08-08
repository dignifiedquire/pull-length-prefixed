'use strict'

const varint = require('varint')
const Reader = require('pull-reader')
const Buffer = require('safe-buffer').Buffer

exports.decode = decode
exports.decodeFromReader = decodeFromReader

const MSB = 0x80
const isEndByte = (byte) => !(byte & MSB)

function decode () {
  let ended = false
  let reader = new Reader()

  return (read) => (end, cb) => {
    reader(read)
    if (end) return reader.abort(end, cb)
    if (ended) return cb(ended)

    decodeFromReader(reader, (err, msg) => {
      if (err) {
        ended = err
        return cb(ended)
      }

      cb(null, msg)
    })
  }
}

function decodeFromReader (reader, cb) {
  let rawMsgSize = []
  if (rawMsgSize.length === 0) readByte()

  // 1. Read the varint
  function readByte () {
    reader.read(1, (err, byte) => {
      if (err) {
        return cb(err)
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
    reader.read(msgSize, (err, msg) => {
      if (err) {
        return cb(err)
      }

      rawMsgSize = []
      cb(null, msg)
    })
  }
}
