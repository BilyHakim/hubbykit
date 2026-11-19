import { parse } from 'shell-quote'

export function curlToCode(input: string, python: boolean): string {
  if (/\x60|\$\(|\$\{|\$[A-Za-z_]/.test(input)) throw new Error('Shell expansions are unsupported. Use literal argument values.')
  const tokens = parse(input.replace(/\\\r?\n/g, ''))
  if (tokens[0] !== 'curl' || tokens.some(token => typeof token !== 'string')) {
    throw new Error('Enter one cURL command with literal arguments.')
  }

  const args = (tokens as string[]).slice(1)
  let url = ''
  let method = ''
  let follow = false
  const headers = new Map<string, string>()
  const body: string[] = []
  let formContentType = false
  const setUrl = (value: string) => {
    if (url) throw new Error('Only one URL is supported.')
    url = value
  }
  const readValue = (option: string) => {
    const value = args.shift()
    if (value === undefined) throw new Error('Missing value for ' + option)
    return value
  }

  while (args.length) {
    const arg = args.shift()!
    switch (arg) {
      case '-X': case '--request':
        method = readValue(arg)
        if (!/^[A-Za-z]+$/.test(method)) throw new Error('Invalid HTTP method.')
        break
      case '-H': case '--header': {
        const header = readValue(arg)
        const colon = header.indexOf(':')
        if (colon < 1 || !/^[\w!#$%&'*+.^~|-]+$/.test(header.slice(0, colon))) throw new Error('Use headers like Name: value.')
        const name = header.slice(0, colon).toLowerCase()
        const value = header.slice(colon + 1).trim()
        if (!value || /[\r\n]/.test(value) || headers.has(name)) throw new Error('Use one nonempty value per header.')
        headers.set(name, value)
        break
      }
      case '-d': case '--data': case '--data-raw': case '--data-binary': {
        const data = readValue(arg)
        if (arg !== '--data-raw' && data.startsWith('@')) throw new Error('File-backed bodies are unsupported.')
        body.push(data)
        formContentType = true
        break
      }
      case '--url': setUrl(readValue(arg)); break
      case '-L': case '--location': follow = true; break
      default:
        if (!/^https?:\/\//i.test(arg)) throw new Error('Unsupported argument: ' + arg)
        setUrl(arg)
    }
  }

  if (!/^https?:\/\//i.test(url)) throw new Error('Enter an HTTP or HTTPS URL.')
  new URL(url)
  method ||= body.length ? 'POST' : 'GET'
  if (formContentType && !headers.has('content-type')) headers.set('content-type', 'application/x-www-form-urlencoded')
  const headerObject = Object.fromEntries(headers)
  if (python) {
    return [
      'import requests',
      '',
      'response = requests.request(',
      '    ' + JSON.stringify(method) + ',',
      '    ' + JSON.stringify(url) + ',',
      ...(headers.size ? ['    headers=' + JSON.stringify(headerObject) + ','] : []),
      ...(body.length ? ['    data=' + JSON.stringify(body.join('&')) + '.encode("utf-8"),'] : []),
      '    allow_redirects=' + (follow ? 'True' : 'False') + ',',
      '    timeout=30,',
      ')',
      'print(response.text)',
    ].join('\n')
  }
  if (body.length && /^(GET|HEAD)$/i.test(method)) throw new Error('Fetch cannot send a body with GET or HEAD. Select Python Requests.')
  const options = { method, headers: headers.size ? headerObject : undefined, body: body.length ? body.join('&') : undefined, redirect: follow ? 'follow' : 'manual' }
  return 'const response = await fetch(' + JSON.stringify(url) + ', ' + JSON.stringify(options, null, 2) + ')\nconsole.log(await response.text())'
}
