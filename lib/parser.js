// Our target output is a reshape AST
// (https://github.com/reshape/reshape#reshape-ast)
module.exports = (tokens) => {
  let current = 0
  let indentLevel = 0
  let token = tokens[current]

  function walk (ctx) {
    token = tokens[current]

    const dt = doctype()
    if (typeof dt !== 'undefined') { return dt }
    const te = text()
    if (typeof te !== 'undefined') { return te }
    const cm = comment()
    if (typeof cm !== 'undefined') { return cm }
    const ta = tag()
    if (typeof ta !== 'undefined') { return ta }
    const ne = newlineIndent(ctx)
    if (typeof ne !== 'undefined') { return ne }
    const en = endOfInput()
    if (typeof en !== 'undefined') { return en }

    // if we haven't matched here, there must be an error
    throw new TypeError(`Unrecognized token type: ${token.type}`)
  }

  // run the parser
  const root = []
  while (current < tokens.length) { root.push(walk(root)) }
  return root

  /**
   * Doctype isn't really a tag, so it needs it's own type and rules
   */
  function doctype () {
    if (token && token.type === 'doctype') {
      current++
      return {
        type: 'text',
        content: `<!DOCTYPE ${token.value}>`,
        location: { line: token.line, col: token.col }
      }
    }
  }

  /**
   * Very basic parsing for text content
   */
  function text () {
    if (token && token.type === 'text') {
      current++
      return {
        type: 'text',
        content: token.value,
        location: { line: token.line, col: token.col }
      }
    }
  }

  /**
   * Basic parsing for comments as well
   */
  function comment () {
    if (token && token.type === 'comment') {
      current++
      return {
        type: 'comment',
        content: token.value,
        location: { line: token.line, col: token.col }
      }
    }
  }

  /**
   * If there's a tag, we get the attributes, recurse if there's nested content,
   * then return the tag node.
   */
  function tag () {
    if (token && token.type === 'tag') {
      // create our base node with the tag's name
      const node = { type: 'tag', name: token.value, content: [] }

      // move past the tag token
      next()

      // Now we do the attributes by looping until we are through all the
      // attributes and on to another token type
      if (token.type === 'attributeKey') { node.attrs = {} }
      while (token.type === 'attributeKey' || token.type === 'attributeValue') {
        // if we have a key, add it to attrs with empty string value
        if (token.type === 'attributeKey') {
          // if this attr hasn't already been populated, initialize it
          if (!node.attrs[token.value]) { node.attrs[token.value] = [] }
          next()
        }

        // if we have a value, add it as the value for the previous key
        if (token.type === 'attributeValue') {
          const previousKey = tokens[current - 1].value
          if (node.attrs[previousKey].length > 1) {
            node.attrs[previousKey] += ' '
          }
          node.attrs[previousKey].push({
            type: ''
          })
          next()
        }

        // TODO need a way to handle multiples and conflicts
      }

      // grab the current indent level, we need to to decide how long to keep
      // searching for contents
      const currentIndent = indentLevel

      // now we recurse to get the contents, looping while the indent level is
      // greater than that of the current node, to pick up everything nested
      node.content.push(walk(node.content))
      while (indentLevel > currentIndent) { // eslint-disable-line
        node.content.push(walk(node.content))
      }

      // when finished, return the node
      return node
    }
  }

  /**
   * We handle newlines and indents in one shot, since indents always come after
   * a newline.
   */
  function newlineIndent (ctx) {
    if (token && token.type === 'newline') {
      // move past the newline
      next()

      // if the next token is a tag, it must be at the root indent level, so
      // we reset the indent level before moving forward. this happens at the
      // end of the page, with the last element usually
      if (token && token.type === 'tag') {
        indentLevel = 0
      }

      // if the next token is an indent, we need to deal with nesting
      if (token && token.type === 'indent') {
        // if our indent level is greater than what we were at before, we
        // recurse again, and update the current indent level
        if (token.level > indentLevel) {
          indentLevel = token.level
          current++
          ctx.push('')
          return walk(ctx)
        }

        // if the indent level is the same as before, we just continue parsing
        // at the same level
        if (token.level === indentLevel) {
          current++
          // TODO figure out better way to not push anything
          return { type: 'text', content: '' }
        }

        // if the indent level is less than before, we decrease the indent level
        // to match and return
        if (token.level < indentLevel) {
          indentLevel = token.level
          current++
          // TODO figure out better way to not push anything
          return { type: 'text', content: '' }
        }
      } else {
        // TODO figure out better way to not push anything
        return { type: 'text', content: '' }
      }
    }
  }

  /**
   * End of input, this means our indent level is back to zero. This will
   * break out of any existing nest loops.
   */
  function endOfInput () {
    if (typeof token === 'undefined') {
      indentLevel = 0
      // TODO figure out better way to not push anything
      return { type: 'text', content: '' }
    }
  }

  /**
   * Move forward to the next token.
   */
  function next () {
    token = tokens[++current]
  }
}
