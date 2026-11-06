<script lang="ts">
  import { tick } from "svelte";
  import type { Editor } from "../editor.svelte";
  import { label } from "../model";

  let { editor }: { editor: Editor } = $props();

  let list = $state<HTMLOListElement>();
  let dragId = $state<string | null>(null);
  let dropTarget = $state<{ id: string; after: boolean } | null>(null);

  async function move(id: string, index: number, dir: -1 | 1) {
    editor.moveTest(id, index + dir);
    await tick();
    const button = (d: number) =>
      list?.querySelector<HTMLButtonElement>(
        `li[data-id="${id}"] [data-move="${d}"]`,
      );
    const same = button(dir);
    (same && !same.disabled ? same : button(-dir))?.focus();
  }

  function dragStart(event: DragEvent, id: string) {
    dragId = id;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
    }
  }

  function dragOver(
    event: DragEvent & { currentTarget: HTMLLIElement },
    id: string,
  ) {
    if (!dragId) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    dropTarget = { id, after: event.clientY > rect.top + rect.height / 2 };
  }

  function drop(event: DragEvent, id: string) {
    const dragged = dragId;
    if (!dragged) return;
    event.preventDefault();
    const tests = editor.tree.tests;
    const from = tests.findIndex((t) => t.id === dragged);
    let to = tests.findIndex((t) => t.id === id) + (dropTarget?.after ? 1 : 0);
    if (from < to) to -= 1;
    dragEnd();
    if (to !== from) editor.moveTest(dragged, to);
  }

  function dragEnd() {
    dragId = null;
    dropTarget = null;
  }
</script>

<section class="cases" aria-labelledby="cases-h">
  <h2 id="cases-h">Test cases</h2>
  <ol bind:this={list}>
    {#each editor.rows as { test, info }, i (test.id)}
      {@const tc = `tc${i + 1}`}
      <li
        class="case"
        class:conflict={info.conflicts.length > 0}
        class:dragging={dragId === test.id}
        class:drop-before={dropTarget?.id === test.id && !dropTarget.after}
        class:drop-after={dropTarget?.id === test.id && dropTarget.after}
        draggable="true"
        data-id={test.id}
        ondragstart={(event) => dragStart(event, test.id)}
        ondragover={(event) => dragOver(event, test.id)}
        ondrop={(event) => drop(event, test.id)}
        ondragend={dragEnd}
      >
        <span class="grip" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
        <span class="tc">{tc}</span>
        <div class="chips">
          {#each info.pairs as [c, k] (c.node.id)}
            <span class="chip"
              ><i>{label(c.node.name)}:</i> {label(k.node.name)}</span
            >
          {:else}
            <span class="none">Nothing picked</span>
          {/each}
          {#each info.conflicts as conflict (conflict)}
            <span class="warn">Conflict: {conflict}</span>
          {/each}
        </div>
        <div class="case-ctl">
          <button
            class="mini"
            data-move="-1"
            aria-label="Move {tc} up"
            title="Move up"
            disabled={i === 0}
            onclick={() => move(test.id, i, -1)}>▲</button
          >
          <button
            class="mini"
            data-move="1"
            aria-label="Move {tc} down"
            title="Move down"
            disabled={i === editor.rows.length - 1}
            onclick={() => move(test.id, i, 1)}>▼</button
          >
          <button
            class="mini del"
            aria-label="Delete {tc}"
            title="Delete"
            onclick={() => editor.removeTest(test.id)}>×</button
          >
        </div>
      </li>
    {:else}
      <li class="none">No test cases yet.</li>
    {/each}
  </ol>
</section>

<style lang="scss">
  .cases {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 12px 14px;

    h2 {
      margin: 0 0 8px;
      font-size: 14px;
      font-weight: 600;
    }

    ol {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 2px;
    }
  }

  .case {
    display: grid;
    grid-template-columns: 18px 44px minmax(0, 1fr) auto;
    gap: 8px;
    padding: 6px 4px;
    border-top: 1px solid var(--grid);
    align-items: start;
    border-radius: 4px;

    &:first-child {
      border-top: 0;
    }

    &.dragging {
      opacity: 0.4;
    }

    &.drop-before {
      box-shadow: inset 0 2px 0 var(--accent);
    }

    &.drop-after {
      box-shadow: inset 0 -2px 0 var(--accent);
    }

    &.conflict .tc {
      color: var(--danger);
      font-weight: 500;
    }
  }

  .grip {
    cursor: grab;
    color: var(--muted);
    padding-top: 1px;
    user-select: none;
    font-size: 13px;
    line-height: 1.4;
    text-align: center;
  }

  .tc {
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--muted);
    padding-top: 2px;
  }

  .case-ctl {
    display: flex;
    gap: 4px;
  }

  .mini {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 5px;
    width: 26px;
    height: 24px;
    padding: 0;
    cursor: pointer;
    font-size: 11px;
    color: var(--muted);

    &:hover:not(:disabled) {
      color: var(--ink);
      border-color: var(--muted);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    &.del:hover:not(:disabled) {
      color: var(--danger);
      border-color: var(--danger);
    }
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    min-width: 0;
  }

  .chip {
    font-size: 12.5px;
    padding: 1px 8px;
    border-radius: 4px;
    background: var(--bg);
    border: 1px solid var(--grid);

    i {
      font-style: normal;
      color: var(--muted);
    }
  }

  .warn {
    flex-basis: 100%;
    font-size: 12.5px;
    color: var(--danger);
  }

  .none {
    color: var(--muted);
    font-size: 12.5px;
  }
</style>
