import assert from 'node:assert/strict'
import test from 'node:test'
import { tools } from '../src/catalog.ts'
import { guides } from '../src/guides.ts'
import { curlToCode } from '../src/curl.ts'
import { formatJson, jsonToGo } from '../src/json.ts'
import { runTool } from '../src/tools.ts'

const run = (id: string, input: string, action = 0, option = 0, secondary = '') =>
  runTool(tools.find(tool => tool.id === id)!, action, input, secondary, option)

test('each tool has its own guide', () => {
  assert.deepEqual(Object.keys(guides).sort(), tools.map(tool => tool.id).sort())
  for (const paragraphs of Object.values(guides)) assert.ok(paragraphs.length >= 2)
})

test('JSON formatting preserves source tokens and rejects invalid JSON', () => {
  const input = '{"big":9007199254740993,"escaped":"a\\u0062","n":1e999,"list":[{},[]]}'
  assert.equal(formatJson(formatJson(input, 4), 0), input)
  assert.throws(() => formatJson('{"bad":}'), SyntaxError)
})

test('Go conversion produces exported unique fields and nested types', () => {
  const output = jsonToGo('{"first_name":"Ada","first-name":"Lin","items":[{"ok":true}]}')
  assert.match(output, /FirstName string/)
  assert.match(output, /FirstName2 string/)
  assert.match(output, /Items \[\]struct/)
  assert.match(output, /Ok bool/)
})

test('converters handle YAML and UTC timestamps', async () => {
  assert.deepEqual(JSON.parse((await run('yaml', 'one: true')).text!), { one: true })
  assert.match((await run('yaml', '{"value":1}', 1)).text!, /value: 1/)
  await assert.rejects(run('yaml', 'value: 9007199254740993'), /numeric precision/)
  assert.equal((await run('time', '0')).text, '1970-01-01T00:00:00.000Z')
  assert.equal((await run('time', '1970-01-01T01:00:00+01:00', 1)).text, '0')
  await assert.rejects(run('time', '2025-02-29', 1))
})

test('encoding, JWT inspection, and SHA-256 use the expected values', async () => {
  const input = 'Halo ☕'
  const encoded = (await run('base64', input, 0, 1)).text!
  assert.equal((await run('base64', encoded, 1, 1)).text, input)
  assert.equal((await run('url', 'a%2Fb', 1)).text, 'a/b')
  assert.match((await run('jwt', 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJBIiB9.')).text!, /"sub": "A"/)
  assert.equal((await run('hash', 'abc')).text, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('generators produce the requested data', async () => {
  assert.match((await run('id', '1')).text!, /^[a-f0-9-]{14}4[a-f0-9-]{21}$/)
  assert.match((await run('id', '1', 0, 1)).text!, /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/)
  assert.match((await run('password', '32', 0, 1)).text!, /^[A-Za-z0-9]{32}$/)
  assert.deepEqual(JSON.parse((await run('mock', '{"email":"email"}', 0, 0, '1')).text!), [{ email: 'user1@example.com' }])
  assert.match((await run('qr', 'hello')).image!, /^data:image\/png;base64,/)
})

test('SQL, HTML, diff, and cURL produce usable outputs', async () => {
  assert.match((await run('sql', 'select id from users')).text!, /SELECT\s+id\s+FROM/)
  assert.match((await run('markup', '<div><span>sample</span></div>', 0, 1)).text!, /<span>sample<\/span>/)
  const diff = (await run('diff', 'old\n', 0, 0, 'new\n')).diff!
  assert.equal(diff.find(part => part.added)?.value, 'new\n')
  assert.equal(diff.find(part => part.removed)?.value, 'old\n')
  assert.match(curlToCode("curl https://example.com -d 'x=1'", false), /"method": "POST"/)
  assert.match(curlToCode('curl https://example.com -L', true), /allow_redirects=True/)
  assert.throws(() => curlToCode('curl https://example.com | cat', false))
  assert.throws(() => curlToCode('curl https://example.com -d @secret.txt', false))
})
