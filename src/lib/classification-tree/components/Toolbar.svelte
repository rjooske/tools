<script lang="ts">
  import { theme } from "#lib/theme.svelte.ts";
  import { IO_BUTTON_ID, type Editor } from "../editor.svelte";
  import { label } from "../model";

  const ARM_TIMEOUT_MS = 3000;

  let { editor }: { editor: Editor } = $props();

  let armed = $state(false);
  let armTimer: ReturnType<typeof setTimeout> | undefined;

  function deleteTree() {
    clearTimeout(armTimer);
    if (armed) {
      armed = false;
      editor.deleteTree();
    } else {
      armed = true;
      armTimer = setTimeout(() => (armed = false), ARM_TIMEOUT_MS);
    }
  }

  function changeTree(event: Event & { currentTarget: HTMLSelectElement }) {
    editor.switchTree(event.currentTarget.value);
    event.currentTarget.blur();
  }
</script>

<header class="bar">
  <div class="brand">
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle
        cx="11"
        cy="3"
        r="2.2"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
      />
      <rect
        x="5"
        y="7"
        width="12"
        height="5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
      />
      <path
        d="M11 5.2V7M9 12L4 19M13 12l5 7M4 19h14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
      />
    </svg>
    <span>Classification Tree Editor</span>
  </div>

  <div class="group">
    <label for="tree-select" class="sr">Current tree</label>
    <select id="tree-select" value={editor.tree.id} onchange={changeTree}>
      {#each editor.store.trees as tree (tree.id)}
        <option value={tree.id}>{label(tree.name)}</option>
      {/each}
    </select>
    <span class="k tree-keys" title="Next / previous tree">gt gT</span>
    <button class="btn" onclick={() => editor.newTree()}>New tree</button>
    <button class="btn" onclick={() => editor.duplicateTree()}>Duplicate</button
    >
    <button class="btn danger" class:armed onclick={deleteTree}>
      {armed ? "Click again to delete" : "Delete tree"}
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

    svg {
      flex: none;
    }
  }

  .group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }

  .tree-keys {
    margin-left: 0;
  }
</style>
