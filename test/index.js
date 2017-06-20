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

test('pipe with text only', (t) => {
  return compare(t, 'pipe2')
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

test('quoted attrs containing quotes', (t) => {
  return compare(t, 'attr-quotes')
})

test('nesting with empty lines in between', (t) => {
  return compare(t, 'nesting-newline')
})

test('block content', (t) => {
  return compare(t, 'block-content')
})

test('inline tags', (t) => {
  return compare(t, 'inline')
})

test('no newline at eof', (t) => {
  return compare(t, 'no-eof-newline')
})

test('invalid token', (t) => {
  return error('html', t)
    .catch((err) => { t.regex(err.toString(), /Cannot parse character "<"/) })
})

function compare (t, name, log) {
  let html, expected

  try {
    html = fs.readFileSync(path.join(fixtures, `${name}.sgr`), 'utf8')
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

function error (name, t) {
  const html = fs.readFileSync(path.join(fixtures, `${name}.sgr`), 'utf8')
  return reshape({ parser }).process(html)
}
