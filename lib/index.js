const lex = require('./lexer')
const parse = require('./parser')

module.exports = function SugarMLParser (input, parseOptions, options) {
  return parse(lex(input, options))
}

module.exports.lex = lex
module.exports.parse = parse
