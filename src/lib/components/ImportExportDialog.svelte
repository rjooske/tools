<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { AnyDocumentEditor } from "../document-editor.svelte";
  import Dialog from "./Dialog.svelte";

  let { editor }: { editor: AnyDocumentEditor } = $props();

  let textarea = $state<HTMLTextAreaElement>();
  let text = $state(untrack(() => editor.exportCurrent()));
  let message = $state("");
  let isError = $state(false);

  onMount(() => textarea?.focus());

  async function copy() {
    isError = false;
    try {
      await navigator.clipboard.writeText(text);
      message = "Copied to clipboard.";
    } catch {
      textarea?.focus();
      textarea?.select();
      message = "Selected. Press Ctrl/⌘ C to copy.";
    }
  }

  function importDocument() {
    const result = editor.parseDocument(text);
    if ("error" in result) {
      isError = true;
      message = result.error;
      return;
    }
    editor.addDocument(result.doc);
    editor.closeDialog();
  }
</script>

<Dialog labelledby="io-h" onclose={() => editor.closeDialog()}>
  <h2 id="io-h">Import / Export</h2>
  <p class="explain">
    The box holds the current {editor.noun} as JSON. Copy it to keep a backup, or
    paste a {editor.noun}'s JSON here and import it as a new {editor.noun}.
  </p>
  <label for="io-text" class="sr">{editor.noun} JSON</label>
  <textarea
    id="io-text"
    spellcheck="false"
    bind:this={textarea}
    bind:value={text}></textarea>
  <div class="msg" class:err={isError}>{message}</div>
  <div class="actions">
    <button class="btn primary" onclick={copy}>Copy JSON</button>
    <button class="btn" onclick={importDocument}>
      Import as new {editor.noun}
    </button>
    <div class="spacer"></div>
    <button class="btn" onclick={() => editor.closeDialog()}>Close</button>
  </div>
</Dialog>

<style lang="scss">
  textarea {
    font-family: var(--font-mono);
    font-size: 12px;
    min-height: 260px;
  }

  .msg {
    font-size: 12.5px;
    color: var(--muted);
    min-height: 1.4em;

    &.err {
      color: var(--danger);
    }
  }
</style>
