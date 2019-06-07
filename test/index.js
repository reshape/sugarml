const parser = require('..')
const fs = require('fs')
const path = require('path')
const test = require('ava')
const reshape = require('reshape')
const fixtures = path.join(__dirname, 'fixtures')

test('basic coverage example', t => {
  return compare(t, 'simple')
})

test('attributes', t => {
  return compare(t, 'attributes')
})

test('pipe', t => {
  return compare(t, 'pipe')
})

test('pipe with text only', t => {
  return compare(t, 'pipe2')
})

test('pipe with empty lines', t => {
  return compare(t, 'pipe3')
})

test('id', t => {
  return compare(t, 'id')
})

test('class', t => {
  return compare(t, 'class')
})

test('class and id', t => {
  return compare(t, 'class-id')
})

test('comment', t => {
  return compare(t, 'comments')
})

test('quoted attrs containing quotes', t => {
  return compare(t, 'attr-quotes')
})

test('nesting with empty lines in between', t => {
  return compare(t, 'nesting-newline')
})

test('block content', t => {
  return compare(t, 'block-content')
})

test('inline tags', t => {
  return compare(t, 'inline')
})

test('inline context leak', t => {
  return compare(t, 'inline-context')
})

test('no newline at eof', t => {
  return compare(t, 'no-eof-newline')
})

test("slash in attributes doesn't bug", t => {
  return compare(t, 'slash')
})

test("empty attributes doesn't bug", t => {
  return compare(t, 'empty-attrs')
})

test.skip('html entities encoded correctly', t => {
  return compare(t, 'entities', true)
})

test('invalid token error', t => {
  return error('html', t).catch(err => {
    t.regex(err.toString(), /Cannot parse character "<"/)
  })
})

test('unclosed attribute parens error', t => {
  return error('unclosed-attribute-paren', t).catch(err => {
    t.regex(err.toString(), /Unclosed attribute parentheses/)
  })
})

test('unclosed attribute quote error', t => {
  return error('unclosed-attribute-quote', t).catch(err => {
    t.regex(err.toString(), /Unclosed attribute quote/)
  })
})

test('indent at begining', t => {
  return compare(t, 'indent-start')
})

test('sugarml own comments', t => {
  return compare(t, 'sugarml-comments')
})

test('invalid nested tag after inline text error', t => {
  return error('inline-text-nested-tag', t).catch(err => {
    t.regex(err.toString(), /Inline text and nested tags cannot both be used at the same time. To resolve this error format your template as :\n\n  1 | li \n  2 |   | foo\n  3 |   span bar/)
  })
})

function compare(t, name, log) {
  let html, expected

  try {
    html = fs.readFileSync(path.join(fixtures, `${name}.sgr`), 'utf8')
    expected = fs.readFileSync(
      path.join(fixtures, `expected/${name}.html`),
      'utf8'
    )
  } catch (err) {
    console.error(err)
  }

  return reshape({ parser })
    .process(html)
    .then(res => {
      if (log) console.log(res.output())
      t.is(res.output(), expected.trim())
    })
}

function error(name, t) {
  const html = fs.readFileSync(path.join(fixtures, `${name}.sgr`), 'utf8')
  return reshape({ parser }).process(html)
}
