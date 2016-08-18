class SugarmlError extends Error {
  constructor (config) {
    super(config.message)

    this.name = this.constructor.name
    this.line = config.location.line
    this.col = config.location.col
    this.filename = config.location.filename ? config.location.filename : '[no filename]'
    this.message = this._formatMessage()

    Error.captureStackTrace(this, this.constructor)
  }

  _formatMessage () {
    const res = []
    res.push(this.message)
    res.push('\n')
    if (this.line && this.col) {
      res.push('Location: ')
      res.push(`${this.filename}:`)
      res.push(`${this.line}:${this.col}`)
    }

    return res.join('')
  }
}

module.exports = SugarmlError
