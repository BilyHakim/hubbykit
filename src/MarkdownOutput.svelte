<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import { invoke, isTauri } from '@tauri-apps/api/core'
  import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
  import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
  import { renderMarkdown } from './markdown'

  let { input, pending = $bindable() }: { input: string; pending: boolean } = $props()
  const desktop = isTauri()
  let html = $derived(renderMarkdown(input))
  let article: HTMLElement
  let dialog: HTMLDialogElement
  let canvas: HTMLCanvasElement
  let pdf: PDFDocumentProxy | undefined
  let loading: PDFDocumentLoadingTask | undefined
  let rendering: RenderTask | undefined
  let bytes: Uint8Array<ArrayBuffer> | undefined
  let page = $state(1)
  let pageCount = $state(0)
  let pageLoading = $state(false)
  let exporting = $state(false)
  let error = $state('')
  let pageError = $state('')
  let exportStatus = $state('')

  function releasePdf() {
    rendering?.cancel()
    if (loading) void loading.destroy().catch(() => {})
    pdf = undefined
    loading = undefined
    pageCount = 0
    bytes = undefined
  }

  onDestroy(releasePdf)

  async function preview() {
    pending = true
    error = ''
    pageError = ''
    exportStatus = ''
    releasePdf()
    try {
      await tick()
      await Promise.all(Array.from(article.querySelectorAll('img'), image => image.decode().catch(() => {})))
      if (!desktop) {
        window.print()
        return
      }
      bytes = new Uint8Array(await invoke<ArrayBuffer>('print_pdf'))
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs')
      GlobalWorkerOptions.workerSrc = workerUrl
      loading = getDocument({ data: bytes.slice(), useWasm: false })
      pdf = await loading.promise
      pageCount = pdf.numPages
      dialog.showModal()
      await showPage(1)
    } catch (cause) {
      error = String(cause)
      releasePdf()
    } finally {
      pending = false
    }
  }

  async function showPage(number: number) {
    if (!pdf || pageLoading) return
    pageLoading = true
    pageError = ''
    page = number
    try {
      const documentPage = await pdf.getPage(number)
      if (!dialog.open) return
      const viewport = documentPage.getViewport({ scale: 1.5 })
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      rendering = documentPage.render({ canvas, viewport })
      await rendering.promise
    } catch (cause) {
      if (dialog.open) pageError = String(cause)
    } finally {
      rendering = undefined
      pageLoading = false
    }
  }

  async function exportPdf(action: 'copy_pdf' | 'save_pdf') {
    if (!bytes) return
    exporting = true
    exportStatus = ''
    try {
      const saved = await invoke<string | null>(action, bytes)
      if (action === 'copy_pdf') exportStatus = 'PDF copied. Paste it in File Explorer.'
      else if (saved) exportStatus = `Saved as ${saved.split(/[\\/]/).at(-1)}.`
    } catch (cause) {
      exportStatus = `Could not export the PDF. ${cause}`
    } finally {
      exporting = false
    }
  }
</script>

<svelte:window onclick={(event) => {
  if (event.target instanceof Element && event.target.closest('.markdown-document a')) event.preventDefault()
}} />

<div class="panel markdown-panel">
  <div class="panel-bar">
    <span>Markdown Preview</span>
    <div class="panel-actions">
      <button disabled={pending || !input.trim()} onclick={preview}>
        {pending ? 'Preparing PDF…' : desktop ? 'Preview PDF' : 'Print / Save PDF'}
      </button>
    </div>
  </div>
  {#if error}<div class="error" role="alert">{error}</div>{/if}
  {#if !input.trim()}<div class="empty">Enter Markdown to preview it.</div>{/if}
  <article class="markdown-document" bind:this={article}>
    <!-- MarkdownIt escapes raw HTML and validates link schemes. -->
    {@html html}
  </article>
</div>

<dialog class="pdf-dialog" bind:this={dialog} aria-labelledby="pdf-title" onclose={releasePdf}>
  <div class="guide-header">
    <h2 id="pdf-title">PDF Preview</h2>
    <div class="panel-actions">
      <button disabled={exporting || !pageCount} onclick={() => exportPdf('save_pdf')}>Download PDF</button>
      <button disabled={exporting || !pageCount} onclick={() => exportPdf('copy_pdf')}>Copy as PDF</button>
      <form method="dialog"><button class="guide-button">Close</button></form>
    </div>
  </div>
  <div class="panel-bar">
    <div class="panel-actions">
      <button disabled={pageLoading || page <= 1} onclick={() => showPage(page - 1)}>Previous</button>
      <span>Page {page} of {pageCount}</span>
      <button disabled={pageLoading || page >= pageCount} onclick={() => showPage(page + 1)}>Next</button>
    </div>
    {#if exportStatus}<span role="status">{exportStatus}</span>{/if}
  </div>
  {#if pageError}<div class="error" role="alert">{pageError}</div>{/if}
  <div class="pdf-page" aria-busy={pageLoading}>
    <canvas bind:this={canvas} aria-label={`PDF page ${page}`}></canvas>
  </div>
</dialog>
