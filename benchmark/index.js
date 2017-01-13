/* global suite, bench */

const reshape = require('reshape')
const sugarml = require('../')
const fs = require('fs')
const path = require('path')
const fixtures = path.join(__dirname, 'fixtures')

suite('Basic benchmarks', () => {
  const html = fs.readFileSync(path.join(fixtures, 'basic.html'), 'utf8')
  const basic = fs.readFileSync(path.join(fixtures, 'basic.sgr'), 'utf8')
  const attrs = fs.readFileSync(path.join(fixtures, 'attributes.sgr'), 'utf8')
  const cblock = fs.readFileSync(path.join(fixtures, 'content_block.sgr'), 'utf8')

  bench('without sugarml', (next) => {
    reshape()
      .process(html)
      .then((result) => { result.output(); next() })
  })

  bench('bare bones', (next) => {
    reshape({ parser: sugarml })
      .process(basic)
      .then((result) => { result.output(); next() })
  })

  bench('attributes', (next) => {
    reshape({ parser: sugarml })
      .process(attrs)
      .then((result) => { result.output(); next() })
  })

  bench('content block', (next) => {
    reshape({ parser: sugarml })
      .process(cblock)
      .then((result) => { result.output(); next() })
  })

  // bench('char loop parse', () => {
  //   let pointer = 0
  //   let content
  //   let char = basic[pointer]
  //   while (char !== '\n') {
  //     content += char
  //     pointer++
  //     char = basic[pointer]
  //   }
  //   return content
  // })
  //
  // bench('regex parse', () => {
  //   let pointer = 0
  //   let content
  //   const matches = /^([^\n]*)/.exec(basic)
  //   content += matches[1]
  //   pointer += matches[1].length
  //   return {content, pointer}
  // })
})
