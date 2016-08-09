const lex = require('./lexer')
const parse = require('./parser')

module.exports = function SugarMLParser (input) {
  return parse(lex(input))
}

module.exports.lex = lex
module.exports.parse = parse
