'use strict'

const Varint = require('varint')
const { Buffer } = require('buffer')
const BufferList = require('bl/BufferList')

const MIN_POOL_SIZE = 147 // Varint.encode(Number.MAX_VALUE).length
const DEFAULT_POOL_SIZE = 10 * 1024

function encode (options) {
  options = options || {}
  options.poolSize = Math.max(options.poolSize || DEFAULT_POOL_SIZE, MIN_POOL_SIZE)

  return source => (async function * () {
    let pool = Buffer.alloc(options.poolSize)
    let poolOffset = 0

    for await (const chunk of source) {
      Varint.encode(chunk.length, pool, poolOffset)
      poolOffset += Varint.encode.bytes
      const encodedLength = pool.slice(poolOffset - Varint.encode.bytes, poolOffset)

      if (pool.length - poolOffset < MIN_POOL_SIZE) {
        pool = Buffer.alloc(options.poolSize)
        poolOffset = 0
      }

      yield new BufferList().append(encodedLength).append(chunk)
      // yield Buffer.concat([encodedLength, chunk])
    }
  })()
}

encode.single = c => new BufferList([Buffer.from(Varint.encode(c.length)), c])

module.exports = encode
module.exports.MIN_POOL_SIZE = MIN_POOL_SIZE
module.exports.DEFAULT_POOL_SIZE = DEFAULT_POOL_SIZE
