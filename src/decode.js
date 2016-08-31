'use strict'

const varint = require('varint')
const Reader = require('pull-reader')
const Buffer = require('safe-buffer').Buffer
const pushable = require('pull-pushable')

exports.decode = decode
exports.decodeFromReader = decodeFromReader

const MSB = 0x80
const isEndByte = (byte) => !(byte & MSB)

function decode () {
  let reader = new Reader()
  let p = pushable((err) => {
    reader.abort(err)
  })

  return (read) => {
    reader(read)
    function next () {
      decodeFromReader(reader, (err, msg) => {
        if (err) return p.end(err)

        p.push(msg)
        next()
      })
    }

    next()
    return p
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
