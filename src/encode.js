'use strict'

const varint = require('varint')
const Buffer = require('safe-buffer').Buffer

module.exports = encode

function encode () {
  const poolSize = 10 * 1024
  let pool = Buffer.alloc(poolSize)
  let used = 0
  let ended = false

  return (read) => (end, cb) => {
    if (ended) return cb(ended)

    read(null, (end, data) => {
      if (end) {
        ended = end
        cb(ended)
        return
      }

      if (!Buffer.isBuffer(data)) {
        ended = new Error('data must be a buffer')
        cb(ended)
        return
      }

      varint.encode(data.length, pool, used)
      used += varint.encode.bytes

      cb(null, Buffer.concat([
        pool.slice(used - varint.encode.bytes, used),
        data
      ]))

      if (pool.length - used < 100) {
        pool = Buffer.alloc(poolSize)
        used = 0
      }
    })
  }
}
