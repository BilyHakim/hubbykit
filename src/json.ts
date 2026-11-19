export function formatJson(input: string, spaces = 2): string {
  JSON.parse(input)
  const tokens = input.match(/"(?:\\[\s\S]|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:"]+/g) ?? []
  if (!spaces) return tokens.join('')

  const indent = ' '.repeat(spaces)
  let depth = 0
  const line = () => '\n' + indent.repeat(depth)
  return tokens.map((token, i) => {
    switch (token) {
      case '{':
      case '[':
        depth++
        return token + (tokens[i + 1] === '}' || tokens[i + 1] === ']' ? '' : line())
      case '}':
      case ']':
        depth--
        return (tokens[i - 1] === '{' || tokens[i - 1] === '[' ? '' : line()) + token
      case ',': return token + line()
      case ':': return ': '
      default: return token
    }
  }).join('')
}

export function jsonToGo(input: string): string {
  const value: unknown = JSON.parse(input)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Enter a JSON object.')

  function infer(value: unknown, depth: number): string {
    if (depth > 32) return 'any'
    if (value === null) return 'any'
    if (typeof value === 'string') return 'string'
    if (typeof value === 'boolean') return 'bool'
    if (typeof value === 'number') return Number.isSafeInteger(value) ? 'int64' : 'float64'
    if (Array.isArray(value)) {
      const types = new Set(value.map(item => infer(item, depth)))
      return '[]' + (types.size === 1 ? [...types][0] : 'any')
    }
    const used = new Set<string>()
    const fields = Object.entries(value as object).map(([key, item]) => {
      if (!key || key === '-' || /[,"\\\p{C}]/u.test(key)) return null
      const words = key.match(/[\p{L}\p{Nd}]+/gu) ?? []
      const label = words.map(word => word[0].toUpperCase() + word.slice(1)).join('')
      const base = /^\p{Lu}/u.test(label) ? label : 'Field' + label
      let name = base
      let suffix = 2
      while (used.has(name)) name = base + suffix++
      used.add(name)
      const tag = '`json:' + JSON.stringify(key) + '`'
      return '\t'.repeat(depth + 1) + name + ' ' + infer(item, depth + 1) + ' ' + tag
    })
    if (fields.includes(null) || Object.keys(value as object).some(key => /[\x60]/.test(key))) return 'map[string]any'
    return fields.length ? 'struct {\n' + fields.join('\n') + '\n' + '\t'.repeat(depth) + '}' : 'struct{}'
  }

  return 'type Root ' + infer(value, 0)
}
