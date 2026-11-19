import { formatJson, jsonToGo } from './json.ts'
import type { Tool } from './catalog.ts'

export type Output = { text?: string; image?: string; diff?: { value: string; added?: boolean; removed?: boolean }[] }

const utf8 = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function decodeBase64(input: string, url: boolean) {
  const value = url ? input.replace(/-/g, '+').replace(/_/g, '/') : input
  return Uint8Array.from(atob(value), char => char.charCodeAt(0))
}

function encodeBase64(input: string, url: boolean) {
  const bytes = utf8.encode(input)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const encoded = btoa(binary)
  return url ? encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : encoded
}

function count(input: string, min: number, max: number) {
  const value = Number(input)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error('Enter a whole number from ' + min + ' to ' + max + '.')
  }
  return value
}

function uuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = toHex(bytes)
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

function ulid() {
  let value = BigInt(Date.now())
  for (const byte of crypto.getRandomValues(new Uint8Array(10))) value = (value << 8n) | BigInt(byte)
  let output = ''
  for (let i = 0; i < 26; i++, value >>= 5n) output = alphabet[Number(value & 31n)] + output
  return output
}

function password(length: number, symbols: boolean) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' + (symbols ? '!@#$%^&*_-+=?' : '')
  const limit = 256 - 256 % chars.length
  let output = ''
  while (output.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit) output += chars[byte % chars.length]
      if (output.length === length) break
    }
  }
  return output
}

function mockJson(input: string, length: number) {
  const schema: unknown = JSON.parse(input)
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) throw new Error('Enter a JSON object describing the fields.')
  const generators = new Map<string, (index: number) => unknown>([
    ['string', () => password(12, false)],
    ['name', index => ['Ada', 'Lin', 'Grace', 'Sam'][index % 4] + ' ' + ['Kim', 'Patel', 'Garcia'][index % 3]],
    ['email', index => 'user' + (index + 1) + '@example.com'],
    ['integer', () => crypto.getRandomValues(new Uint32Array(1))[0] % 10000],
    ['boolean', () => Boolean(crypto.getRandomValues(new Uint8Array(1))[0] & 1)],
    ['date', () => new Date(Date.now() - crypto.getRandomValues(new Uint32Array(1))[0]).toISOString()],
    ['uuid', uuid],
  ])
  const fields = Object.entries(schema)
  for (const [key, type] of fields) {
    if (typeof type !== 'string' || !generators.has(type)) throw new Error('Unknown field type for ' + key + '.')
  }
  return JSON.stringify(Array.from({ length }, (_, i) => Object.fromEntries(
    fields.map(([key, type]) => [key, generators.get(type)!(i)]),
  )), null, 2)
}

function timestamp(input: string, action: number, unit: number) {
  const scale = unit ? 1 : 1000
  if (action === 2) return String(Math.floor(Date.now() / scale))
  const value = input.trim()
  if (action === 1) {
    if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
      throw new Error('Use YYYY-MM-DD or an ISO timestamp with Z or a UTC offset.')
    }
    const epoch = Date.parse(value)
    const day = new Date(value.slice(0, 10) + 'T00:00:00Z')
    if (!Number.isFinite(epoch) || !Number.isFinite(+day) || day.toISOString().slice(0, 10) !== value.slice(0, 10)) {
      throw new Error('Invalid ISO date.')
    }
    return String(Math.floor(epoch / scale))
  }
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(value)) throw new Error('Enter a numeric Unix timestamp.')
  return new Date(Number(value) * scale).toISOString()
}

function validateXml(input: string) {
  const doc = new DOMParser().parseFromString(input, 'application/xml')
  const error = Array.from(doc.getElementsByTagNameNS('*', 'parsererror')).find(node =>
    node.namespaceURI === 'http://www.mozilla.org/newlayout/xml/parsererror.xml' ||
    node.namespaceURI === 'http://www.w3.org/1999/xhtml',
  )
  if (error) throw new Error(error.textContent?.trim() || 'Invalid XML.')
}

function checkNumericValue(_key: string, value: unknown) {
  if (typeof value === 'number' && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) {
    throw new Error('Conversion would lose numeric precision. Quote the number as a string to preserve it.')
  }
  return value
}

function regexTest(pattern: string, input: string, flags: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./regex.worker.ts', import.meta.url), { type: 'module' })
    const timeout = setTimeout(() => {
      worker.terminate()
      reject(new Error('The regex timed out. Try a shorter input or simplify the pattern.'))
    }, 1500)
    worker.onmessage = ({ data }) => {
      clearTimeout(timeout)
      worker.terminate()
      if (data.error) reject(new Error(data.error))
      else resolve(data.text)
    }
    worker.onerror = () => {
      clearTimeout(timeout)
      worker.terminate()
      reject(new Error('Could not start the regex worker.'))
    }
    worker.postMessage({ pattern, input, flags })
  })
}

export async function runTool(tool: Tool, action: number, input: string, secondary: string, option: number): Promise<Output> {
  switch (tool.id) {
    case 'json': {
      if (action === 2) {
        JSON.parse(input)
        return { text: 'Valid JSON.' }
      }
      return { text: formatJson(input, action === 1 ? 0 : option ? 4 : 2) }
    }
    case 'sql': {
      const { format } = await import('sql-formatter')
      const dialects = ['sql', 'postgresql', 'mysql', 'sqlite', 'bigquery', 'transactsql'] as const
      return { text: format(input, { language: dialects[option], keywordCase: 'upper' }) }
    }
    case 'markup': {
      if (action === 1) {
        validateXml(input)
        return { text: 'Well-formed XML.' }
      }
      if (option === 0) {
        validateXml(input)
        const { default: format } = await import('xml-formatter')
        return { text: format(input, { indentation: '  ', collapseContent: true, lineSeparator: '\n' }) }
      }
      const [prettier, html] = await Promise.all([import('prettier/standalone'), import('prettier/plugins/html')])
      return { text: await prettier.format(input, { parser: 'html', plugins: [html.default], htmlWhitespaceSensitivity: 'strict' }) }
    }
    case 'go': return { text: jsonToGo(input) }
    case 'yaml': {
      const yaml = await import('yaml')
      if (action === 1) return { text: yaml.stringify(JSON.parse(input, checkNumericValue)) }
      return { text: JSON.stringify(yaml.parse(input), checkNumericValue, 2) }
    }
    case 'time': return { text: timestamp(input, action, option) }
    case 'jwt': {
      const parts = input.trim().split('.')
      if (parts.length !== 3 || !parts[0] || !parts[1] || parts.some(part => !/^[A-Za-z0-9_-]*$/.test(part))) {
        throw new Error('Enter a JWT with three base64url segments.')
      }
      const [header, claims, signature] = parts.map(part => decodeBase64(part, true))
      return { text: 'Header\n' + formatJson(decoder.decode(header)) + '\n\nClaims\n' +
        formatJson(decoder.decode(claims)) + '\n\nSignature (hex)\n' + (toHex(signature) || '(empty)') }
    }
    case 'base64': return { text: action ? decoder.decode(decodeBase64(input, Boolean(option))) : encodeBase64(input, Boolean(option)) }
    case 'url': return { text: action ? decodeURIComponent(input) : encodeURIComponent(input) }
    case 'hash': {
      const algorithm = tool.options![option]
      return { text: toHex(new Uint8Array(await crypto.subtle.digest(algorithm, utf8.encode(input)))) }
    }
    case 'id': return { text: Array.from({ length: count(input, 1, 1000) }, option ? ulid : uuid).join('\n') }
    case 'mock': return { text: mockJson(input, count(secondary, 1, 1000)) }
    case 'qr': {
      const { toDataURL } = await import('qrcode')
      return { image: await toDataURL(input, { errorCorrectionLevel: option ? 'H' : 'M', width: 320 }) }
    }
    case 'password': return { text: password(count(input, 8, 256), !option) }
    case 'diff': {
      const { diffLines } = await import('diff')
      const diff = diffLines(input, secondary, { timeout: 600 })
      if (!diff) throw new Error('The comparison timed out. Try smaller inputs.')
      return { diff }
    }
    case 'regex': {
      const flags = tool.options![option]
      return { text: await regexTest(input, secondary, flags === 'None' ? '' : flags) }
    }
    case 'curl': {
      const { curlToCode } = await import('./curl.ts')
      return { text: curlToCode(input, Boolean(option)) }
    }
    default: throw new Error('Unknown tool.')
  }
}
