import MarkdownIt from 'markdown-it'

const parser = new MarkdownIt({ html: false })
const renderImage = parser.renderer.rules.image!
const embeddedImage = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/]+=*$/i

parser.renderer.rules.image = (tokens, index, options, env, renderer) => {
  const token = tokens[index]
  const src = token.attrGet('src')
  if (typeof src === 'string' && embeddedImage.test(src)) {
    return renderImage(tokens, index, options, env, renderer)
  }
  return parser.utils.escapeHtml(renderer.renderInlineAsText(token.children ?? [], options, env))
}

export function renderMarkdown(markdown: string) {
  return parser.render(markdown)
}
