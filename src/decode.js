'use strict'

const BufferList = require('bl/BufferList')
const Varint = require('varint')

const MSB = 0x80
const isEndByte = byte => !(byte & MSB)
const MAX_DATA_LENGTH = 1024 * 1024 * 4

const toBufferProxy = bl => new Proxy({}, {
  get: (_, prop) => prop[0] === 'l' ? bl[prop] : bl.get(parseInt(prop))
})

const Empty = Buffer.alloc(0)

const ReadModes = { LENGTH: 'readLength', DATA: 'readData' }

const ReadHandlers = {
  [ReadModes.LENGTH]: (chunk, buffer, state, options) => {
    // console.log(ReadModes.LENGTH, chunk.length)
    let endByteIndex = -1

    // BufferList bytes must be accessed via .get
    const getByte = chunk.get ? i => chunk.get(i) : i => chunk[i]

    for (let i = 0; i < chunk.length; i++) {
      if (isEndByte(getByte(i))) {
        endByteIndex = i
        break
      }
    }

    if (endByteIndex === -1) {
      return { mode: ReadModes.LENGTH, buffer: buffer.append(chunk) }
    }

    endByteIndex = buffer.length + endByteIndex
    buffer = buffer.append(chunk)

    const dataLength = Varint.decode(toBufferProxy(buffer.shallowSlice(0, endByteIndex + 1)))

    if (dataLength > options.maxDataLength) {
      throw Object.assign(new Error('message too long'), { code: 'ERR_MSG_TOO_LONG' })
    }

    chunk = buffer.shallowSlice(endByteIndex + 1)
    buffer = new BufferList()

    if (options.onLength) options.onLength(dataLength)

    if (dataLength <= 0) {
      if (options.onData) options.onData(Empty)
      return { mode: ReadModes.LENGTH, chunk, buffer, data: Empty }
    }

    return { mode: ReadModes.DATA, chunk, buffer, state: { dataLength } }
  },

  [ReadModes.DATA]: (chunk, buffer, state, options) => {
    // console.log(ReadModes.DATA, chunk.length)
    buffer = buffer.append(chunk)

    if (buffer.length < state.dataLength) {
      return { mode: ReadModes.DATA, buffer, state }
    }

    const { dataLength } = state
    const data = buffer.shallowSlice(0, dataLength)

    chunk = buffer.length > dataLength ? buffer.shallowSlice(dataLength) : null
    buffer = new BufferList()

    if (options.onData) options.onData(data)
    return { mode: ReadModes.LENGTH, chunk, buffer, data }
  }
}

function decode (options) {
  options = options || {}
  options.maxDataLength = options.maxDataLength || MAX_DATA_LENGTH

  return source => (async function * () {
    let buffer = new BufferList()
    let mode = ReadModes.LENGTH // current parsing mode
    let state // accumulated state for the current mode

    for await (let chunk of source) {
      // Each chunk may contain multiple messages - keep calling handler for the
      // current parsing mode until all handlers have consumed the chunk.
      while (chunk) {
        const result = ReadHandlers[mode](chunk, buffer, state, options)
        ;({ mode, chunk, buffer, state } = result)
        if (result.data) yield result.data
      }
    }

    if (buffer.length) {
      throw Object.assign(new Error('unexpected end of input'), { code: 'ERR_UNEXPECTED_EOF' })
    }
  })()
}

decode.fromReader = (reader, options) => {
  options = options || {}

  let byteLength = 1 // Read single byte chunks until the length is known
  const varByteSource = {
    [Symbol.asyncIterator] () { return this },
    next: async () => {
      try {
        return await reader.next(byteLength)
      } catch (err) {
        if (err.code === 'ERR_UNDER_READ') {
          return { done: true, value: null }
        }
        throw err
      } finally {
        // Reset the byteLength so we continue to check for varints
        byteLength = 1
      }
    }
  }

  // Once the length has been parsed, read chunk for that length
  options.onLength = l => { byteLength = l }
  return decode(options)(varByteSource)
}

module.exports = decode
module.exports.MAX_DATA_LENGTH = MAX_DATA_LENGTH
