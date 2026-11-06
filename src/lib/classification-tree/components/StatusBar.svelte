<script lang="ts">
  import type { Editor, Mode } from "../editor.svelte";
  import type { VimKeys } from "../keys.svelte";

  let { editor, keys }: { editor: Editor; keys: VimKeys } = $props();

  const HINTS: Record<Mode, [string[], string][]> = {
    tree: [
      [["h", "l"], "left / right"],
      [["j", "k"], "child / parent"],
      [["i"], "rename"],
      [["a"], "add child"],
      [["o"], "add sibling"],
      [["dd"], "delete"],
      [["H", "L"], "move"],
      [["t"], "test grid"],
      [["?"], "all keys"],
    ],
    grid: [
      [["h", "l"], "class"],
      [["j", "k"], "test case"],
      [["x"], "toggle dot"],
      [["o"], "new test"],
      [["dd"], "delete test"],
      [["J", "K"], "move test"],
      [["t"], "tree"],
      [["?"], "all keys"],
    ],
  };

  function toggleMode(
    event: MouseEvent & { currentTarget: HTMLButtonElement },
  ) {
    editor.toggleMode();
    event.currentTarget.blur();
  }
</script>

<div class="status">
  <button
    class="mode"
    class:grid={editor.mode === "grid"}
    title="Switch between tree and test grid (t)"
    onclick={toggleMode}
  >
    {editor.mode === "tree" ? "TREE" : "GRID"}
  </button>
  <div class="hints">
    {#each HINTS[editor.mode] as [hintKeys, description] (description)}
      <span class="hint">
        {#each hintKeys as key (key)}<span class="k">{key}</span
          >{/each}{description}
      </span>
    {/each}
  </div>
  <span class="pending" aria-live="polite">{keys.count}{keys.pending}</span>
  <span class="flash" aria-live="polite">{keys.flash}</span>
</div>

<style lang="scss">
  .status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    font-size: 12.5px;
    color: var(--muted);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 6px 10px;
  }

  .mode {
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 11.5px;
    letter-spacing: 0.06em;
    cursor: pointer;
    padding: 3px 9px;
    border-radius: 4px;
    border: 0;
    background: var(--ink);
    color: var(--surface);

    &.grid {
      background: var(--accent);
    }
  }

  .hints {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    flex: 1;
    min-width: 0;
  }

  .hint {
    white-space: nowrap;

    .k {
      margin: 0 3px 0 0;
    }
  }

  .pending {
    font-family: var(--font-mono);
    color: var(--ink);
  }

  .flash {
    color: var(--ink);
  }
</style>
