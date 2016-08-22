doctype html
div.bar(id='test' @wow data-foo='bar')
  p#foo hello world!
  .wow
    .nest2
      .nest3
        p more text
  .unnest
  // a comment
  li: a(href='wow') content
  p
    | text on its own line
    span now it's a span!
    | ah, more text on its own line...
