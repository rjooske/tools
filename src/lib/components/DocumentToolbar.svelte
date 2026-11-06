<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    IO_BUTTON_ID,
    type AnyDocumentEditor,
  } from "../document-editor.svelte";
  import { theme } from "../theme.svelte";
  import { label } from "../util";

  const ARM_TIMEOUT_MS = 3000;

  let {
    editor,
    title,
    icon,
  }: { editor: AnyDocumentEditor; title: string; icon: Snippet } = $props();

  let armed = $state(false);
  let armTimer: ReturnType<typeof setTimeout> | undefined;

  function deleteDocument() {
    clearTimeout(armTimer);
    if (armed) {
      armed = false;
      editor.deleteDocument();
    } else {
      armed = true;
      armTimer = setTimeout(() => (armed = false), ARM_TIMEOUT_MS);
    }
  }

  function changeDocument(event: Event & { currentTarget: HTMLSelectElement }) {
    editor.switchTo(event.currentTarget.value);
    event.currentTarget.blur();
  }
</script>

<header class="bar">
  <div class="brand">
    {@render icon()}
    <span>{title}</span>
  </div>

  <div class="group">
    <label for="doc-select" class="sr">Current {editor.noun}</label>
    <select id="doc-select" value={editor.current.id} onchange={changeDocument}>
      {#each editor.collection.docs as doc (doc.id)}
        <option value={doc.id}>{label(doc.name)}</option>
      {/each}
    </select>
    <span class="k doc-keys" title="Next / previous {editor.noun}">gt gT</span>
    <button class="btn" onclick={() => editor.newDocument()}>
      New {editor.noun}
    </button>
    <button class="btn" onclick={() => editor.duplicateDocument()}>
      Duplicate
    </button>
    <button class="btn danger" class:armed onclick={deleteDocument}>
      {armed ? "Click again to delete" : `Delete ${editor.noun}`}
    </button>
  </div>

  <div class="spacer"></div>

  <div class="group">
    <button
      class="btn"
      title="Undo (u or Ctrl/⌘ Z)"
      disabled={!editor.past.length}
      onclick={() => editor.undo()}>Undo<span class="k">u</span></button
    >
    <button
      class="btn"
      title="Redo (Ctrl R or Ctrl/⌘ Shift Z)"
      disabled={!editor.future.length}
      onclick={() => editor.redo()}>Redo<span class="k">^R</span></button
    >
    <button
      class="btn"
      id={IO_BUTTON_ID}
      onclick={() => (editor.dialog = "io")}
    >
      Import / Export
    </button>
    <button
      class="btn"
      aria-label="Switch theme"
      onclick={() => theme.toggle()}
    >
      {theme.dark ? "Light mode" : "Dark mode"}
    </button>
    <button class="btn" onclick={() => (editor.dialog = "help")}>
      Keys<span class="k">?</span>
    </button>
  </div>
</header>

<style lang="scss">
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 600;
    font-size: 16px;
    letter-spacing: -0.01em;

    :global(svg) {
      flex: none;
    }
  }

  .group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .doc-keys {
    margin-left: 0;
  }
</style>
