<script lang="ts" module>
  export type ModeButton = {
    label: string;
    active: boolean;
    title: string;
    onclick: () => void;
  };
</script>

<script lang="ts">
  import type { AnyDocumentEditor } from "../document-editor.svelte";
  import type { KeyHint, VimKeys } from "../vim-keys.svelte";

  let {
    keys,
    hints,
    mode,
  }: {
    keys: VimKeys<AnyDocumentEditor>;
    hints: KeyHint[];
    mode?: ModeButton;
  } = $props();

  function clickMode(event: MouseEvent & { currentTarget: HTMLButtonElement }) {
    mode?.onclick();
    event.currentTarget.blur();
  }
</script>

<div class="status">
  {#if mode}
    <button
      class="mode"
      class:active={mode.active}
      title={mode.title}
      onclick={clickMode}
    >
      {mode.label}
    </button>
  {/if}
  <div class="hints">
    {#each hints as [hintKeys, description] (description)}
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

    &.active {
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
