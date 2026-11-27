const words = new Intl.Segmenter(undefined, { granularity: 'word' })
const sentences = new Intl.Segmenter(undefined, { granularity: 'sentence' })
const characters = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function countText(text: string) {
  let wordCount = 0
  let sentenceCount = 0
  let characterCount = 0
  let nonWhitespaceCount = 0
  const lines = text ? text.split(/\r\n|[\r\n\u2028\u2029]/) : []
  let paragraphCount = 0
  let inParagraph = false

  for (const word of words.segment(text)) {
    if (word.isWordLike) wordCount++
  }
  for (const sentence of sentences.segment(text)) {
    if (/[\p{L}\p{N}]/u.test(sentence.segment)) sentenceCount++
  }
  for (const character of characters.segment(text)) {
    characterCount++
    if (character.segment.trim()) nonWhitespaceCount++
  }
  for (const line of lines) {
    const hasText = Boolean(line.trim())
    if (hasText && !inParagraph) paragraphCount++
    inParagraph = hasText
  }

  return {
    Words: wordCount,
    Characters: characterCount,
    'Characters without whitespace': nonWhitespaceCount,
    Sentences: sentenceCount,
    Paragraphs: paragraphCount,
    Lines: lines.length,
  }
}
