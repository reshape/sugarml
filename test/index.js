const parser = require('..')
const fs = require('fs')
const path = require('path')
const test = require('ava')
const reshape = require('reshape')
const fixtures = path.join(__dirname, 'fixtures')

test('basic coverage example', (t) => {
  return compare(t, 'simple')
})

test('attributes', (t) => {
  return compare(t, 'attributes')
})

test('pipe', (t) => {
  return compare(t, 'pipe')
})

test('id', (t) => {
  return compare(t, 'id')
})

test('class', (t) => {
  return compare(t, 'class')
})

test('class and id', (t) => {
  return compare(t, 'class-id')
})

test('comment', (t) => {
  return compare(t, 'comments')
})

test('invalid token', (t) => {
  t.throws(error('html'), /Cannot parse character "<"/)
})

test('quoted attrs containing quotes', (t) => {
  return compare(t, 'attr-quotes')
})

function compare (t, name, log) {
  let html, expected

  try {
    html = fs.readFileSync(path.join(fixtures, `${name}.sml`), 'utf8')
    expected = fs.readFileSync(path.join(fixtures, `expected/${name}.html`), 'utf8')
  } catch (err) {
    console.error(err)
  }

  return reshape({ parser })
    .process(html)
    .then((res) => {
      if (log) console.log(res.output())
      t.is(res.output(), expected.trim())
    })
}

function error (name) {
  const html = fs.readFileSync(path.join(fixtures, `${name}.sml`), 'utf8')
  return reshape({ parser }).process(html)
}
