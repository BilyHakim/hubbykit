<script lang="ts">
  import { tools, type Tool } from './catalog'
  import { guides } from './guides'
  import { runTool, type Output } from './tools'

  const categories = [...new Set(tools.map(tool => tool.category))]
  const drafts = new Map<string, { input: string; secondary: string; option: number }>()
  let selected = $state(tools[0])
  let input = $state('')
  let secondary = $state('')
  let option = $state(0)
  let result = $state<Output>()
  let error = $state('')
  let status = $state('')
  let pending = $state(false)
  let search = $state('')
  let guideDialog: HTMLDialogElement
  let navigationOpen = $state(true)
  let closedGroups = $state<string[]>([])
  let query = $derived(search.trim().toLowerCase())
  type Theme = 'light' | 'dark'
  const themeKey = 'hubbykit.theme'
  let theme = $state<Theme>(initialTheme())
  let request = 0
  let matches = $derived(tools.filter(tool =>
    (tool.name + ' ' + tool.category).toLowerCase().includes(query),
  ))

  function initialTheme(): Theme {
    try {
      const saved = localStorage.getItem(themeKey)
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      // The system preference still works when storage is unavailable.
    }
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  $effect(() => {
    document.documentElement.dataset.theme = theme
  })

  function chooseTheme(value: Theme) {
    theme = value
    try {
      localStorage.setItem(themeKey, value)
    } catch {
      // Keep the selected theme for the current session.
    }
  }

  function resetResult() {
    request++
    pending = false
    result = undefined
    error = ''
    status = ''
  }

  function toggleGroup(category: string) {
    closedGroups = closedGroups.includes(category)
      ? closedGroups.filter(group => group !== category)
      : [...closedGroups, category]
  }

  function select(tool: Tool) {
    if (tool.id === selected.id) return
    drafts.set(selected.id, { input, secondary, option })
    selected = tool
    const draft = drafts.get(tool.id)
    input = draft?.input ?? (tool.id === 'id' || tool.id === 'password' ? tool.example : '')
    secondary = draft?.secondary ?? (tool.id === 'mock' ? '5' : '')
    option = draft?.option ?? 0
    resetResult()
  }

  function example() {
    input = selected.example
    secondary = selected.secondary ?? ''
    resetResult()
  }

  async function run(action: number) {
    resetResult()
    const current = request
    pending = true
    try {
      const output = await runTool(selected, action, input, secondary, option)
      if (current === request) result = output
    } catch (exception) {
      if (current === request) error = exception instanceof Error ? exception.message : String(exception)
    } finally {
      if (current === request) pending = false
    }
  }

  function diffText(output: Output) {
    return output.diff?.flatMap(part => (part.value.match(/[^\n]*\n|[^\n]+$/g) ?? []).map(line =>
      (part.added ? '+ ' : part.removed ? '- ' : '  ') + (line.endsWith('\n') ? line : line + '\n'),
    )).join('') ?? ''
  }

  async function copy() {
    if (!result) return
    const current = request
    try {
      await navigator.clipboard.writeText(result.text ?? diffText(result))
      if (current === request) status = 'Copied'
    } catch {
      if (current === request) status = 'Clipboard unavailable'
    }
  }

  function shortcut(event: KeyboardEvent) {
    if (guideDialog?.open) return
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      if (!pending) void run(0)
    }
  }
</script>

<svelte:window onkeydown={shortcut} />

<div class="shell" class:navigation-hidden={!navigationOpen}>
  <header class="app-bar">
    <div class="app-bar-start">
      <button class="navigation-toggle" type="button" aria-expanded={navigationOpen}
        aria-controls="sidebar mobile-tools" aria-label={navigationOpen ? 'Hide tools' : 'Show tools'}
        title={navigationOpen ? 'Hide tools' : 'Show tools'} onclick={() => navigationOpen = !navigationOpen}>
        <span class="sidebar-icon" aria-hidden="true"></span>
      </button>
      <div class="identity"><img src={import.meta.env.BASE_URL + 'hubbykit.png'} width="26" height="26" alt="" />HubbyKit</div>
    </div>
    <div class="theme-picker" role="group" aria-label="Color theme">
      <button aria-pressed={theme === 'light'} onclick={() => chooseTheme('light')}>Light</button>
      <button aria-pressed={theme === 'dark'} onclick={() => chooseTheme('dark')}>Dark</button>
    </div>
  </header>

  <label class="mobile-tools" id="mobile-tools">
    Tool
    <select value={selected.id} onchange={(event) => {
      const tool = tools.find(item => item.id === event.currentTarget.value)
      if (tool) select(tool)
    }}>
      {#each categories as category}
        <optgroup label={category}>
          {#each tools.filter(tool => tool.category === category) as tool (tool.id)}
            <option value={tool.id}>{tool.name}</option>
          {/each}
        </optgroup>
      {/each}
    </select>
  </label>

  <aside class="sidebar" id="sidebar">
    <label class="search">
      <input type="search" placeholder="Find a tool…" aria-label="Find a tool" bind:value={search} />
    </label>

    <nav aria-label="Developer tools">
      {#each categories as category, index (category)}
        {@const group = matches.filter(tool => tool.category === category)}
        {@const expanded = Boolean(query) || !closedGroups.includes(category)}
        {#if group.length}
          <div class="nav-group">
            <h2>
              {#if query}
                <span class="group-heading">{category}</span>
              {:else}
                <button type="button" class="group-heading" aria-expanded={expanded} aria-controls={'tools-' + index}
                  onclick={() => toggleGroup(category)}>
                  <span class="group-chevron" aria-hidden="true"></span>{category}
                </button>
              {/if}
            </h2>
            <div id={'tools-' + index} hidden={!expanded}>
              {#each group as tool (tool.id)}
                <button
                  class="tool-button"
                  class:active={selected.id === tool.id}
                  aria-current={selected.id === tool.id ? 'page' : undefined}
                  onclick={() => select(tool)}
                >
                  {tool.name}
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
      {#if !matches.length}<p class="no-matches">No matching tools.</p>{/if}
    </nav>
  </aside>

  <main>
    <section class="workspace" aria-labelledby="tool-title" aria-busy={pending}>
      <div class="tool-heading">
        <div>
          <h1 id="tool-title">{selected.name}</h1>
          <p>{selected.description}</p>
        </div>
        <button class="guide-button" type="button" aria-haspopup="dialog" onclick={() => guideDialog.showModal()}>
          Guide
        </button>
      </div>

      <dialog class="guide-dialog" bind:this={guideDialog} aria-labelledby="guide-title">
        <div class="guide-header">
          <h2 id="guide-title">{selected.name}</h2>
          <form method="dialog"><button class="guide-button">Close</button></form>
        </div>
        <div class="guide-copy" lang="id">
          {#each guides[selected.id] as paragraph}
            <p>{paragraph}</p>
          {/each}
        </div>
      </dialog>

      <div class="toolbar">
        <div class="actions">
          {#each selected.actions as action, index}
            <button class:primary={index === 0} disabled={pending} onclick={() => run(index)}>
              {index === 0 && pending ? 'Working…' : action}
            </button>
          {/each}
        </div>
        {#if selected.options}
          <select bind:value={option} onchange={resetResult} aria-label="Tool setting">
            {#each selected.options as label, i}<option value={i}>{label}</option>{/each}
          </select>
        {/if}
      </div>

      <div class="panels">
        <div class="panel">
          <div class="panel-bar">
            <label for="source">{selected.inputLabel ?? 'Input'}</label>
            <div class="panel-actions">
              {#if selected.example}<button onclick={example}>Example</button>{/if}
              <button onclick={() => { input = ''; secondary = selected.id === 'mock' ? '5' : ''; resetResult() }}>Clear</button>
            </div>
          </div>
          {#if selected.id === 'id' || selected.id === 'password'}
            <input class="count-input" id="source" type="text" inputmode="numeric" bind:value={input}
              oninput={resetResult} placeholder={selected.example} />
          {:else}
            <textarea id="source" bind:value={input} oninput={resetResult} spellcheck="false"
              placeholder={selected.id === 'json' ? 'Paste your JSON here…' : 'Enter input…'}></textarea>
          {/if}
          {#if selected.secondaryLabel}
            <div class="panel-bar secondary-bar"><label for="secondary">{selected.secondaryLabel}</label></div>
            {#if selected.id === 'mock'}
              <input class="count-input" id="secondary" type="text" inputmode="numeric" bind:value={secondary} oninput={resetResult} />
            {:else}
              <textarea id="secondary" bind:value={secondary} oninput={resetResult} spellcheck="false"></textarea>
            {/if}
          {/if}
        </div>

        <div class="panel">
          <div class="panel-bar">
            <span>Output</span>
            <div class="panel-actions">
              {#if result?.image}
                <a href={result.image} download="hubbykit-qr.png">Download PNG</a>
              {:else}
                <button disabled={!result} onclick={copy}>{status || 'Copy'}</button>
              {/if}
            </div>
          </div>
          {#if error}
            <div class="error" role="alert">{error}</div>
          {:else if result?.image}
            <div class="qr"><img src={result.image} alt="Generated QR code" width="240" height="240" /></div>
          {:else if result?.diff}
            <pre class="diff" aria-label="Line differences">{#each result.diff as part}<span class:added={part.added} class:removed={part.removed}>{diffText({ diff: [part] })}</span>{/each}</pre>
          {:else if result}
            <textarea aria-label="Output" value={result.text ?? ''} readonly spellcheck="false"></textarea>
          {:else}
            <div class="empty">
              {pending ? 'Processing…' : 'Run the tool to see its output.'}
            </div>
          {/if}
        </div>
      </div>

      <footer>
        <span><span class="status-dot"></span> Local processing <span class="status-divider">·</span> {input.length.toLocaleString()} characters</span>
        <span><kbd>Ctrl</kbd> <kbd>Enter</kbd> to run</span>
      </footer>
    </section>
  </main>
</div>
