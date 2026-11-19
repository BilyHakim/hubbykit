self.onmessage = ({ data: { pattern, input, flags } }) => {
  try {
    const regex = new RegExp(pattern, flags)
    const first = flags.includes('g') ? input.matchAll(regex) : [regex.exec(input)].filter(Boolean)
    const matches = []
    for (const match of first) {
      if (matches.length === 500) break
      if (match) matches.push({
        index: match.index,
        match: match[0],
        groups: match.slice(1),
        namedGroups: match.groups,
      })
    }
    const summary = matches.length === 500 ? 'First 500 matches' : matches.length + ' match(es)'
    self.postMessage({ text: summary + '\n\n' + JSON.stringify(matches, null, 2) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) })
  }
}
export {}
