<script lang="ts">
  let { tool }: { tool: string } = $props()

  const paths: Record<string, string> = {
    json: 'M9 4H7a2 2 0 0 0-2 2v3l-2 3 2 3v3a2 2 0 0 0 2 2h2m6-16h2a2 2 0 0 1 2 2v3l2 3-2 3v3a2 2 0 0 1-2 2h-2',
    sql: 'M20 6c0 1.7-3.6 3-8 3S4 7.7 4 6s3.6-3 8-3 8 1.3 8 3ZM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    markup: 'm8 6-6 6 6 6m8-12 6 6-6 6m-2-15-4 18',
    go: 'M11 8a4 4 0 1 0 0 8v-4H8m5 1a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z',
    yaml: 'M3 8h17m-4-4 4 4-4 4m5 4H4m4-4-4 4 4 4',
    time: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
    jwt: 'M12 3 4 6v5c0 4.4 3.4 7.8 8 10 4.6-2.2 8-5.6 8-10V6l-8-3Zm-2 8 2 2 3-3',
    base64: 'M10 7H7l-2 2v6l2 2h2l2-2v-2l-2-2H5m14-4-4 6h6m-2-6v10',
    url: 'm10 14 4-4m-4 7-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2-2 2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',
    hash: 'M5 9h15M4 15h15M10 4 7 20m10-16-3 16',
    id: 'M3 6h18v12H3zm4 4v4m4-4v4m3-4v4m3-4v4',
    mock: 'M5 4h14v16H5zm4 4h6m-6 4h6m-6 4h4',
    qr: 'M3 3h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm12 0h3v3h3v3h-6v-3m6-4v1',
    password: 'M5 11h14v10H5zm3 0V7a4 4 0 1 1 8 0v4m-4 4v2',
    diff: 'M4 8h8M8 4v8m5 5h7M4 17h4',
    regex: 'M6 16h.01M15 5v12m-5-9 10 6M10 14l10-6',
    curl: 'M3 5h18v14H3zm4 4 3 3-3 3m6 0h4',
    wordcount: 'M4 5h16M4 10h16M4 15h10M4 20h6m7-3 2 2 3-4',
    'markdown-pdf': 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-3 0v6m-3-3 3 3 3-3',
  }
</script>

<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
  stroke-linejoin="round" width="24" height="24" aria-hidden="true">
  <path d={paths[tool]} />
</svg>
