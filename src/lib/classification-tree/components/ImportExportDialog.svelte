<script lang="ts">
  import Dialog from "#lib/components/Dialog.svelte";
  import { onMount, untrack } from "svelte";
  import type { Editor } from "../editor.svelte";
  import { parseTree } from "../model";

  let { editor }: { editor: Editor } = $props();

  let textarea = $state<HTMLTextAreaElement>();
  let text = $state(untrack(() => editor.exportCurrentTree()));
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

  function importTree() {
    const result = parseTree(text);
    if ("error" in result) {
      isError = true;
      message = result.error;
      return;
    }
    editor.importTree(result.tree);
    editor.closeDialog();
  }
</script>

<Dialog labelledby="io-h" onclose={() => editor.closeDialog()}>
  <h2 id="io-h">Import / Export</h2>
  <p class="explain">
    The box holds the current tree as JSON. Copy it to keep a backup, or paste a
    tree's JSON here and import it as a new tree.
  </p>
  <label for="io-text" class="sr">Tree JSON</label>
  <textarea
    id="io-text"
    spellcheck="false"
    bind:this={textarea}
    bind:value={text}></textarea>
  <div class="msg" class:err={isError}>{message}</div>
  <div class="actions">
    <button class="btn primary" onclick={copy}>Copy JSON</button>
    <button class="btn" onclick={importTree}>Import as new tree</button>
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
