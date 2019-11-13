'use strict'

const { map } = require('streaming-iterables')
const randomInt = require('random-int')
const randomBytes = require('random-bytes')

module.exports.toBuffer = map(c => c.slice())
module.exports.times = (n, fn) => Array.from(Array(n), fn)
module.exports.someBytes = n => randomBytes(randomInt(1, n || 32))
