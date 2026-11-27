import assert from 'node:assert/strict'
import test from 'node:test'
import { renderMarkdown } from '../src/markdown.ts'
import { countText } from '../src/wordcount.ts'

test('counts Unicode graphemes and separates paragraphs at blank lines', () => {
  assert.deepEqual(countText('Halo! 👩‍💻\r\n \r\nCafé.'), {
    Words: 2,
    Characters: 15,
    'Characters without whitespace': 11,
    Sentences: 2,
    Paragraphs: 2,
    Lines: 3,
  })
  assert.ok(Object.values(countText('')).every(value => value === 0))
})

test('renders Markdown formatting and only permits embedded raster images', () => {
  const html = renderMarkdown('# Title\n\n**Bold** <script>alert(1)</script>\n\n![Remote](https://example.com/image.png)\n\n![Local](data:image/png;base64,AAAA)\n\n[x](javascript:alert(1))')
  assert.match(html, /<h1>Title<\/h1>/)
  assert.match(html, /<strong>Bold<\/strong>/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /<p>Remote<\/p>/)
  assert.match(html, /<img src="data:image\/png;base64,AAAA"/)
  assert.doesNotMatch(html, /<script|href="javascript:|src="https:/)
})
