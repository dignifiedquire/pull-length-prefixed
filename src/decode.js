'use strict'

const BufferList = require('bl')
const Varint = require('varint')

const MSB = 0x80
const isEndByte = byte => !(byte & MSB)
const MAX_DATA_LENGTH = 1024 * 1024 * 4

const toBufferProxy = bl => new Proxy({}, {
  get: (_, prop) => prop[0] === 'l' ? bl[prop] : bl.get(prop)
})

const Empty = Buffer.alloc(0)

const ReadModes = { LENGTH: 'readLength', DATA: 'readData' }

const ReadHandlers = {
  [ReadModes.LENGTH]: (chunk, buffer, state, options) => {
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

    if (dataLength <= 0) {
      return { mode: ReadModes.LENGTH, chunk, buffer, value: Empty }
    }

    return { mode: ReadModes.DATA, chunk, buffer, state: { dataLength } }
  },

  [ReadModes.DATA]: (chunk, buffer, state, options) => {
    buffer = buffer.append(chunk)

    if (buffer.length < state.dataLength) {
      return { mode: ReadModes.DATA, buffer, state }
    }

    const value = buffer.shallowSlice(0, state.dataLength + 1)

    chunk = buffer.shallowSlice(state.dataLength + 1)
    chunk = chunk.length ? chunk : null
    buffer = new BufferList()

    return { mode: ReadModes.LENGTH, chunk, buffer, value }
  }
}

function decode (options) {
  options = options || {}
  options.maxDataLength = options.maxDataLength || MAX_DATA_LENGTH

  return source => (async function * () {
    let buffer = new BufferList()
    let mode = ReadModes.LENGTH
    let state = {}

    for await (let chunk of source) {
      while (chunk) {
        const result = ReadHandlers[mode](chunk, buffer, state, options)
        ;({ mode, chunk, buffer, state } = result)
        if (result.value) yield result.value
      }
    }
  })()
}

module.exports = decode
module.exports.MAX_DATA_LENGTH = MAX_DATA_LENGTH
