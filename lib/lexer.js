const SugarmlError = require('./error')

module.exports = function Lexer (input, options) {
  let line = 1
  let col = 1
  let current = 0
  let tokens = []
  let newTagContext = false

  // Strip utf8 BOM and standardize line breaks
  input = input.replace(/^\uFEFF/, '')
  input = input.replace(/\r\n|\r/g, '\n')

  // grab the current character
  let char = input[current]
  let last

  while (current < input.length) {
    doctype()
    pipe()
    tag()
    classId()
    attributes()
    blockContent()
    indentOrTagContent()
    newline()
    nestedInlineTag()
    comment()
    if (char === 'undefined') continue // end of input

    // are we infinite looping? throw an error
    if (last === current) {
      throw new SugarmlError({
        message: `Cannot parse character "${char}"`,
        location: {
          filename: options.filename,
          line: line,
          col: col + 1,
          src: input
        }
      })
    }
    last = current
  }

  return tokens

  function doctype () {
    // doctype must be the first thing in the document
    if (current === 0 && lookahead(7) === 'doctype') {
      // move past the entire word 'doctype'
      next(7)

      // is there's a space afterwards, skip it
      if (char.match(/\s/)) next()

      // after the space, collect til EOL
      const content = collectUntil('\n')

      addToken('doctype', content)
    }
  }

  /**
   * Pipe - starting a line with a pipe denotes text content inside a tag
   */
  function pipe () {
    if (char === '|') {
      // move past the pipe
      next()

      // move past the space after it, if there is one
      if (char.match(/[^\S\n]/)) next()

      // grab all the text contents
      let content = collectUntil('\n')

      // if the next !non-.match(recter is a pipe, add a newline
      const nextNonSpace = lookFor(/([^\s])/)
      if (nextNonSpace && nextNonSpace[1] === '|') content += '\n'

      addToken('text', content)
    }
  }

  /**
   * Tag - matches normal characters, creates a html tag token
   */
  function tag () {
    if (char.match(/\w/)) {
      // element names can include any character, technically.
      // except for, due to language syntax: ['#', '.', '(', ':', '\s']
      const tag = collectUntil('#|.|(|:|\\s/')

      addToken('tag', tag)
    }
  }

  // parse for class or id shortcuts via '.' and/or '#'
  function classId () {
    // '.' with a space or newline after is block content, so here we need
    // to match a dot with a character after in order to get a class
    if (char === '#' || `${char}${nextChar()}`.match(/^\.\S$/)) {
      // store type for later
      const type = char === '#' ? 'id' : 'class'

      // move past the # or .
      next()

      // match until another #, ., (, :, or space
      const val = collectUntil('#|.|(|:|\\s/')

      // if there was no previous element, it's a div
      // this could be configurable if there's demand for it
      const lastToken = tokens[tokens.length - 1]
      if (!lastToken || ['tag', 'attributeKey', 'attributeValue'].indexOf(lastToken.type) < 0 || newTagContext) {
        addToken('tag', 'div')
        newTagContext = false
      }

      // we have to add an attribute key and value to represent class/id
      // the value is quoted using single quotes for consistency
      addToken('attributeKey', type)
      addToken('attributeValue', val)
    }
  }

  /**
   * Attribute - directly following a tag, wrapped in parens. Attributes
   * themselves can be boolean or key/value, and are space-separated.
   */
  function attributes () {
    if (char === '(') {
      // move past the open paren
      next()

      // we're in attribute land until the *close paren*
      while (char !== ')') {
        // attempt to get the attribute key
        // - if it has a value, it will end at the *=*
        // - if it's boolean, it will end at the *paren* or *space* (next attr)
        const key = collectUntil('=|)|\\s/')

        // if we do have a key, add it to our tokens
        if (key.length) addToken('attributeKey', key)

        // attempt to get the value, which exists if there's an *=*
        let val = ''
        if (char === '=') {
          // move past the equals
          next()

          // if there's an open quote, move past it
          let quoted = false
          if (char.match(/['"]/)) {
            quoted = char
            next()
          }

          // now we grab the value, it ends at a *space*, *close paren*, or
          // a *close quote*. if it's quoted though, we don't match *space*.
          // this is because you can have div(class='foo bar')
          let regex = '\\s|)|\'|"'
          if (quoted) { regex = quoted }
          val += collectUntil(regex)

          // if there's a close quote, move past it
          if (char.match(/['"]/)) next()
        }

        // if we did match a value, push it to tokens
        if (val.length) addToken('attributeValue', val)

        // if we have a *space*, move on to the next attribute
        if (char.match(/\s/)) next()
      }
      // done with attributes, move past the *close paren*
      if (char === ')') next()
    }
  }

  /**
   * Block Content - a period immediately following a tag denotes a raw content
   * block. If inline, treated as normal content. If indented under the tag,
   * raw content is pulled until the indent is no longer present.
   */
  function blockContent () {
    if (`${char}${nextChar()}`.match(/^\.\s$/)) {
      // move past the dot
      next()

      // the dot can be followed by zero or more spaces and a newline
      const match = lookFor(/[^\S\n]*\n/)

      // if only spaces until newline, it's indented so we need special handling
      if (match.index === 0) {
        // skip past any spaces and the newline
        next(match[0].length)
        nextLine()

        // now we need to get the indent level that content must surpass
        let minIndent = 0

        // find the containing tag token, then get the token before that, which
        // is its indent if it has one
        let maybeIndent
        for (let i = tokens.length - 1; i > 0; i--) {
          if (tokens[i].type === 'tag') {
            maybeIndent = tokens[i - 1]
            break
          }
        }

        // grab the length of the indent if there is one
        if (maybeIndent && maybeIndent.type === 'indent') {
          minIndent = maybeIndent.value.length
        }

        // go through the content block and collect
        let content = ''
        content += contentBlockCollect(minIndent)

        // add the text token
        addToken('text', content)

        // add a newline at the end, since the block parse eats it
        addToken('newline', '\n')
        nextLine()
      }
    }
  }

  /**
   * An unmatched space at this point could be either an indent, or a space
   * between a tag and its contents.
   */
  function indentOrTagContent () {
    if (char && char.match(/\s/) && !char.match(/\n/)) {
      const lastToken = tokens[tokens.length - 1]

      // if the previous token was a newline, we're looking at an indent
      let indentLevel = 0
      let indent = ''
      if (lastToken.type === 'newline') {
        while (char.match(/\s/) && !char.match(/\n/)) {
          indent += char
          indentLevel++
          next()
        }
        addToken('indent', indent, { level: indentLevel })
      }

      // if the previous token was a tag, it's a space before content or
      // trailing whitespace on an empty tag
      if (['tag', 'attributeKey', 'attributeValue'].indexOf(lastToken.type) > -1) {
        // move past the space
        next()

        // pull contents until we hit a newline
        const content = collectUntil('\n')

        addToken('text', content)
      }
    }
  }

  /**
   * Newline - a line break
   */
  function newline () {
    if (char && char.match(/\n/)) {
      addToken('newline', char)
      next()
      line++; col = 0 // increment the line number, reset the col
    }
  }

  /**
   * Nested Inline Tag - a colon directly after a tag means we have a nested
   * inline tag
   */
  function nestedInlineTag () {
    if (char && char === ':') {
      // move past the colon
      next()
      // if there's a space for padding, move past this
      if (char.match(/\s/)) next()
      // flip the flag to create a new tag context if its followed by a shortcut
      newTagContext = true
    }
  }

  /**
   * Comment - indicated by "//"
   */
  function comment () {
    // comments
    if (char === '/' && nextChar() === '/') {
      // move past the two slashes
      next(); next()

      // if there is a space, move past that
      if (char.match(/\s/)) next()

      // grab the comment body
      const comment = collectUntil('\n')

      addToken('comment', comment)
    }
  }

  /**
   * Adds a token with a name and value, also line/col position.
   * @param {String} type - name/type of the token, ex. "tag"
   * @param {String} value - token's contents/value, ex. "div"
   */
  function addToken (type, value, extras) {
    tokens.push(Object.assign({type, value, line, col}, extras))
  }

  /**
   * Moves to the next character
   */
  function next (n = 1) {
    current += n
    char = input[current]
    col += n
  }

  /**
   * Moves to the next line
   */
  function nextLine () {
    line++; col = 0
  }

  /**
   * Previews the character after the current one
   */
  function nextChar () {
    return input[current + 1]
  }

  /**
   * Looks ahead the specified number of characters and returns a string
   * @param {Integer} n - number of characters ahead to pull
   */
  function lookahead (n) {
    return input.substring(current, n)
  }

  function lookFor (re) {
    return re.exec(input.substring(current))
  }

  // this method might look weird, but it has the best performance for
  // this purpose!
  function collectUntil (re) {
    const matches = new RegExp(`^([^${re}]*)`).exec(input.substr(current))
    next(matches[1].length)
    return matches[1]
  }

  // shell function for recursive internal function, used to adjust indent
  // level after processing has completed
  function contentBlockCollect (minIndent) {
    const content = _contentBlockCollect(minIndent)

    // split by line for measuring and removing indentation
    let lines = content.split('\n')

    // calculate the minimum indentation across all lines of content
    // disregard empty newlines by adding them as a ridiculously large number
    const baseIndent = Math.min.apply(Math, lines.map((l) => {
      if (!l.length) return 99999
      return l.match(/[^\S\n]*/)[0].length
    }))

    // now remove the min indent from each line and return
    return lines.map((l) => l.substring(baseIndent)).join('\n')
  }

  function _contentBlockCollect (minIndent) {
    let content = ''

    // move past the base indent on the element
    next(minIndent)

    // scan through the content line by line. if any given line has an indent
    // level that's not greater than the min, it's the end of the content block
    content += collectUntil('\n')

    // bypass the newline
    next()
    nextLine()

    // check to see if there are one or more empty lines before more content
    const emptyLineSearch = lookFor(/(\n+)([^\S\n]+\S+)/)
    if (emptyLineSearch && emptyLineSearch.index === 0) {
      // if so, add the newlines to the content and move forward
      const numberOfNewlines = emptyLineSearch[1].length
      for (let i = 0; i < numberOfNewlines; i++) {
        content += '\n'
        nextLine()
      }
      next(numberOfNewlines)
    }

    // measure the indent level on the next line
    const nextLineIndent = lookFor(/[^\S\n]*/)
    if (nextLineIndent && nextLineIndent[0].length > minIndent) {
      // add the newline then keep collecting
      content += '\n'
      nextLine()
      content += _contentBlockCollect(minIndent)
    }

    return content
  }
}
