# pull-length-prefixed

[![](https://img.shields.io/badge/made%20by-Protocol%20Labs-blue.svg?style=flat-square)](http://ipn.io)
[![](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://ipfs.io/)
[![](https://img.shields.io/badge/freenode-%23ipfs-blue.svg?style=flat-square)](http://webchat.freenode.net/?channels=%23ipfs)
[![Coverage Status](https://coveralls.io/repos/github/dignifiedquire/pull-length-prefixed/badge.svg?branch=master)](https://coveralls.io/github/dignifiedquire/pull-length-prefixed?branch=master)
[![Travis CI](https://travis-ci.org/dignifiedquire/pull-length-prefixed.svg?branch=master)](https://travis-ci.org/dignifiedquire/pull-length-prefixed)
[![Circle CI](https://circleci.com/gh/dignifiedquire/pull-length-prefixed.svg?style=svg)](https://circleci.com/gh/dignifiedquire/pull-length-prefixed)
[![Dependency Status](https://david-dm.org/dignifiedquire/pull-length-prefixed.svg?style=flat-square)](https://david-dm.org/dignifiedquire/pull-length-prefixed) [![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)


> Streaming length prefixed buffers with pull-streams



## Install

```bash
$ npm install --save pull-length-prefixed
```

## Usage

```js
var pull = require('pull-stream')
var lp = require('pull-length-prefixed')

// encode
pull(
  pull.values([Buffer.from('hello world')]),
  lp.encode(),
  pull.collect(function (err, encode) {
    if (err) throw err
    console.log(encoded)
    // => [Buffer <0b 68 65 6c 6c 6f 20 77 6f 72 6c 64>]
  })
)

// decode
pull(
  pull.values(encoded), // e.g. from above
  lp.decode(),
  pull.collect(function (err, decoded) {
    if (err) throw err
    console.log(decoded)
    // => [Buffer <68 65 6c 6c 6f 20 77 6f 72 6c 64>]
  })
)
```
