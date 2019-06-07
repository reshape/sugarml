const lex = require('./lexer')
const parse = require('./parser')

module.exports = function SugarMLParser(input, options) {
  return parse(lex(input, options),input,options)
}

module.exports.lex = lex
module.exports.parse = parse
