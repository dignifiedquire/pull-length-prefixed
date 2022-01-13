import BufferList from 'bl/BufferList.js'
import { varintDecode } from './varint-decode.js'
import errCode from 'err-code'
import type { LengthDecoderFunction } from './varint-decode.js'
import type { Reader } from 'it-reader'
import type { Source, Transform } from 'it-stream-types'

export interface ReadState {
  dataLength: number
}

export interface DecoderOptions {
  lengthDecoder?: LengthDecoderFunction
  onData?: (data: BufferList | Uint8Array) => void
  onLength?: (length: number) => void
  maxLengthLength?: number
  maxDataLength?: number
}

export interface ReadResult {
  mode: string
  chunk?: BufferList
  buffer: BufferList
  state?: ReadState
  data?: BufferList
}

interface ReadHandler {
  (chunk: BufferList, buffer: BufferList, state?: ReadState, options?: DecoderOptions): ReadResult
}

// Maximum length of the length section of the message
export const MAX_LENGTH_LENGTH = 8 // Varint.encode(Number.MAX_SAFE_INTEGER).length
// Maximum length of the data section of the message
export const MAX_DATA_LENGTH = 1024 * 1024 * 4

const Empty = new BufferList([])
const ReadModes = { LENGTH: 'readLength', DATA: 'readData' }

const ReadHandlers: Record<string, ReadHandler> = {
  [ReadModes.LENGTH]: (chunk, buffer, state?, options?): ReadResult => {
    const lengthDecoder = options?.lengthDecoder ?? varintDecode
    const maxLengthLength = options?.maxLengthLength ?? MAX_LENGTH_LENGTH
    const maxDataLength = options?.maxDataLength ?? MAX_DATA_LENGTH

    // console.log(ReadModes.LENGTH, chunk.length)
    buffer = buffer.append(chunk)

    let dataLength
    try {
      dataLength = lengthDecoder(buffer.slice())
    } catch (err) {
      if (buffer.length > maxLengthLength) {
        throw errCode(new Error('message length too long'), 'ERR_MSG_LENGTH_TOO_LONG')
      }
      if (err instanceof RangeError) {
        return { mode: ReadModes.LENGTH, buffer, chunk: undefined, state: undefined, data: undefined }
      }
      throw err
    }

    if (dataLength > maxDataLength) {
      throw errCode(new Error('message data too long'), 'ERR_MSG_DATA_TOO_LONG')
    }

    chunk = buffer.shallowSlice(lengthDecoder.bytes)
    buffer = new BufferList()

    if (options?.onLength != null) {
      options.onLength(dataLength)
    }

    if (dataLength <= 0) {
      if (options?.onData != null) {
        options.onData(Empty)
      }

      return { mode: ReadModes.LENGTH, chunk, buffer, data: Empty }
    }

    return { mode: ReadModes.DATA, chunk, buffer, state: { dataLength }, data: undefined }
  },

  [ReadModes.DATA]: (chunk, buffer, state, options?) => {
    buffer = buffer.append(chunk)

    if (state == null) {
      throw new Error('state is required')
    }

    if (buffer.length < state.dataLength) {
      return { mode: ReadModes.DATA, buffer, state, chunk: undefined, data: undefined }
    }

    const { dataLength } = state
    const data = buffer.shallowSlice(0, dataLength)

    const nextChunk = buffer.length > dataLength ? buffer.shallowSlice(dataLength) : undefined
    buffer = new BufferList()

    if ((options?.onData) != null) {
      options.onData(data)
    }

    return { mode: ReadModes.LENGTH, chunk: nextChunk, buffer, state: undefined, data }
  }
}

export function decode (options?: DecoderOptions): Transform<BufferList | Uint8Array, BufferList> {
  const decoder = async function * (source: Source<BufferList | Uint8Array>): Source<BufferList> {
    let buffer = new BufferList()
    let mode = ReadModes.LENGTH // current parsing mode
    let state: ReadState | undefined // accumulated state for the current mode

    for await (const chunk of source) {
      // @ts-expect-error bl types are broken
      let nextChunk: BufferList | undefined = new BufferList(chunk)

      // Each chunk may contain multiple messages - keep calling handler for the
      // current parsing mode until all handlers have consumed the chunk.
      while (nextChunk != null) {
        const result = ReadHandlers[mode](nextChunk, buffer, state, options)

        mode = result.mode
        nextChunk = result.chunk
        buffer = result.buffer
        state = result.state

        if (result.data != null) {
          yield result.data
        }
      }
    }

    if (buffer.length > 0) {
      throw errCode(new Error('unexpected end of input'), 'ERR_UNEXPECTED_EOF')
    }
  }

  return decoder
}

/**
 * @param {*} reader
 * @param {import('./types').DecoderOptions} [options]
 * @returns
 */
decode.fromReader = (reader: Reader, options?: DecoderOptions) => {
  let byteLength = 1 // Read single byte chunks until the length is known

  const varByteSource = (async function * () {
    while (true) {
      try {
        const { done, value } = await reader.next(byteLength)

        if (done === true) {
          return
        }

        if (value != null) {
          yield value
        }
      } catch (err: any) {
        if (err.code === 'ERR_UNDER_READ') {
          return { done: true, value: null }
        }
        throw err
      } finally {
        // Reset the byteLength so we continue to check for varints
        byteLength = 1
      }
    }
  }())

  /**
   * Once the length has been parsed, read chunk for that length
   */
  const onLength = (l: number) => { byteLength = l }
  return decode({
    ...(options ?? {}),
    onLength
  })(varByteSource)
}
