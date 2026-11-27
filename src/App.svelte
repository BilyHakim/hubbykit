<script lang="ts">
  import { tick } from 'svelte'
  import ModuleIcon from './ModuleIcon.svelte'
  import MarkdownOutput from './MarkdownOutput.svelte'
  import { tools, type Tool } from './catalog'
  import { guides } from './guides'
  import { runTool, type Output } from './tools'
  import { countText } from './wordcount'

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
  let guideDialog = $state<HTMLDialogElement>()
  let showModules = $state(true)
  let query = $derived(search.trim().toLowerCase())
  let wordCounts = $derived(selected.id === 'wordcount' ? countText(input) : undefined)
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

  async function openModule(tool: Tool) {
    select(tool)
    showModules = false
    await tick()
    document.getElementById('tool-title')?.focus()
  }

  async function backToModules() {
    showModules = true
    await tick()
    document.getElementById('module-' + selected.id)?.focus()
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
    if (!selected.actions.length) return
    if (event.key !== 'Enter' || event.isComposing || event.altKey || event.shiftKey) return
    const field = event.currentTarget
    if (event.ctrlKey || event.metaKey) {
      if (field instanceof HTMLTextAreaElement) {
        event.preventDefault()
        field.setRangeText('\n', field.selectionStart, field.selectionEnd, 'end')
        if (field.id === 'source') input = field.value
        else secondary = field.value
        resetResult()
      }
      return
    }
    event.preventDefault()
    if (!pending && !event.repeat) void run(0)
  }
</script>

<header class="app-bar">
  <div class="identity"><img src={import.meta.env.BASE_URL + 'hubbykit.png'} width="32" height="32" alt="" />HubbyKit</div>
  <div class="theme-picker" role="group" aria-label="Color theme">
    <button aria-pressed={theme === 'light'} onclick={() => chooseTheme('light')}>Light</button>
    <button aria-pressed={theme === 'dark'} onclick={() => chooseTheme('dark')}>Dark</button>
  </div>
</header>

<main>
  {#if showModules}
    <section class="library" aria-labelledby="modules-title">
      <div class="library-heading">
        <h1 id="modules-title">Modules</h1>
        <input type="search" placeholder="Find a tool…" aria-label="Find a tool" bind:value={search} />
      </div>

      {#if matches.length}
        <ul class="module-grid">
          {#each matches as tool (tool.id)}
            <li>
              <button class="module-card" id={'module-' + tool.id} onclick={() => openModule(tool)}>
                <span class="module-icon"><ModuleIcon tool={tool.id} /></span>
                <span class="module-name">{tool.name}</span>
                <span class="module-category">{tool.category}</span>
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="no-matches" role="status">No matching tools.</p>
      {/if}
    </section>
  {:else}
    <section class="workspace" aria-labelledby="tool-title" aria-busy={pending}>
      <button class="back-button" disabled={pending} onclick={backToModules}><span aria-hidden="true">←</span> Modules</button>
      <div class="tool-heading">
        <div>
          <h1 id="tool-title" tabindex="-1">{selected.name}</h1>
          <p>{selected.description}</p>
        </div>
        <button class="guide-button" type="button" disabled={pending} aria-haspopup="dialog" onclick={() => guideDialog?.showModal()}>
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

      {#if selected.actions.length}
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
      {/if}

      <div class="panels">
        <div class="panel">
          <div class="panel-bar">
            <label for="source">{selected.inputLabel ?? 'Input'}</label>
            <div class="panel-actions">
              {#if selected.example}<button disabled={pending && !selected.actions.length} onclick={example}>Example</button>{/if}
              <button disabled={pending && !selected.actions.length} onclick={() => { input = ''; secondary = selected.id === 'mock' ? '5' : ''; resetResult() }}>Clear</button>
            </div>
          </div>
          {#if selected.id === 'id' || selected.id === 'password'}
            <input class="count-input" id="source" type="text" inputmode="numeric" bind:value={input}
              oninput={resetResult} onkeydown={shortcut} placeholder={selected.example} />
          {:else}
            <textarea id="source" bind:value={input} oninput={resetResult} onkeydown={shortcut} spellcheck="false"
              readonly={pending && !selected.actions.length}
              placeholder={selected.id === 'json' ? 'Paste your JSON here…' : 'Enter input…'}></textarea>
          {/if}
          {#if selected.secondaryLabel}
            <div class="panel-bar secondary-bar"><label for="secondary">{selected.secondaryLabel}</label></div>
            {#if selected.id === 'mock'}
              <input class="count-input" id="secondary" type="text" inputmode="numeric" bind:value={secondary} oninput={resetResult} onkeydown={shortcut} />
            {:else}
              <textarea id="secondary" bind:value={secondary} oninput={resetResult} onkeydown={shortcut} spellcheck="false"></textarea>
            {/if}
          {/if}
        </div>

        {#if selected.id === 'markdown-pdf'}
          <MarkdownOutput {input} bind:pending />
        {:else if wordCounts}
          <div class="panel">
            <div class="panel-bar">Statistics</div>
            <dl class="word-stats" aria-live="polite">
              {#each Object.entries(wordCounts) as [label, count]}
                <div><dt>{label}</dt><dd>{count.toLocaleString()}</dd></div>
              {/each}
            </dl>
          </div>
        {:else}
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
        {/if}
      </div>

      <footer>
        <span>
          <span class="status-dot"></span> Local processing
          {#if !wordCounts}<span class="status-divider">·</span> {input.length.toLocaleString()} characters{/if}
        </span>
        {#if selected.actions.length}
          <span>
            <kbd>Enter</kbd> to run
            {#if selected.id !== 'id' && selected.id !== 'password'}
              <span class="status-divider">·</span> <kbd>Ctrl</kbd> <kbd>Enter</kbd> for a new line
            {/if}
          </span>
        {/if}
      </footer>
    </section>
  {/if}
</main>
