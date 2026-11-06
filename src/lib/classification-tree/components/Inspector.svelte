<script lang="ts">
  import type { TreeEditor } from "../editor.svelte";
  import { pathOf } from "../model";

  let { editor }: { editor: TreeEditor } = $props();

  let entry = $derived(editor.selected);
  let siblings = $derived.by(() => {
    if (entry.kind === "class") return entry.parent.node.classes;
    if (entry.kind === "classification") return entry.parent.node.children;
    return [];
  });
  let position = $derived(siblings.findIndex((s) => s.id === entry.node.id));
  let isLast = $derived(position === siblings.length - 1);

  function finishRename(
    event: KeyboardEvent & { currentTarget: HTMLInputElement },
  ) {
    if (event.key === "Enter" || event.key === "Escape") {
      event.currentTarget.blur();
    }
  }
</script>

{#snippet nameField(title: string, value: string)}
  <label class="field" for="name-input">
    <span>{title} <span class="k" data-mode="tree">i</span></span>
    <input
      type="text"
      id="name-input"
      autocomplete="off"
      {value}
      bind:this={editor.nameInput}
      onfocusin={() => editor.beginTextEdit()}
      oninput={(event) => editor.setSelectedName(event.currentTarget.value)}
      onkeydown={finishRename}
    />
  </label>
{/snippet}

{#snippet moveButtons()}
  <button
    class="btn"
    disabled={position === 0}
    onclick={() => editor.moveSelected(-1)}
  >
    Move left<span class="k" data-mode="tree">H</span>
  </button>
  <button class="btn" disabled={isLast} onclick={() => editor.moveSelected(1)}>
    Move right<span class="k" data-mode="tree">L</span>
  </button>
{/snippet}

{#if entry.kind === "root"}
  <div class="inspector-head"><span class="kind">Tree</span></div>
  {@render nameField("Tree name", editor.current.name)}
  <label class="field" for="notes-input">
    <span>Specification notes</span>
    <textarea
      id="notes-input"
      rows="6"
      placeholder="Paste the informal spec you are modelling"
      value={editor.current.notes ?? ""}
      onfocusin={() => editor.beginTextEdit()}
      oninput={(event) => editor.setNotes(event.currentTarget.value)}
    ></textarea>
  </label>
  <div class="actions">
    <button class="btn primary" onclick={() => editor.addChild()}>
      Add classification<span class="k" data-mode="tree">a</span>
    </button>
  </div>
  <p class="explain">
    Top-level classifications apply to every input. Click a box or a label in
    the drawing to edit it.
  </p>
{:else if entry.kind === "classification"}
  {@const classCount = entry.node.classes.length}
  <div class="inspector-head">
    <span class="kind">Classification</span>
    <span class="crumbs">{pathOf(entry)}</span>
  </div>
  {@render nameField("Name", entry.node.name)}
  <p class="explain">
    {classCount
      ? `Its ${classCount} classes should together cover the whole domain of the parent.`
      : "Has no classes yet. Add at least two."}
  </p>
  <div class="actions">
    <button class="btn primary" onclick={() => editor.addChild()}>
      Add class<span class="k" data-mode="tree">a</span>
    </button>
    <button class="btn" onclick={() => editor.addSibling()}>
      Add sibling classification<span class="k" data-mode="tree">o</span>
    </button>
    {@render moveButtons()}
    <button class="btn danger" onclick={() => editor.deleteSelected()}>
      Delete classification<span class="k" data-mode="tree">dd</span>
    </button>
  </div>
{:else}
  {@const refinements = entry.node.children.length}
  <div class="inspector-head">
    <span class="kind">Class</span>
    <span class="crumbs">{pathOf(entry)}</span>
  </div>
  {@render nameField("Name", entry.node.name)}
  <p class="explain">
    {refinements
      ? `Refined by ${refinements} classification${refinements > 1 ? "s" : ""}.`
      : "Leaf class: it is a column in the combination table. Refining it replaces the column with the new classes, and its dots are removed."}
  </p>
  <div class="actions">
    <button class="btn primary" onclick={() => editor.addChild()}>
      Refine with a classification<span class="k" data-mode="tree">a</span>
    </button>
    <button class="btn" onclick={() => editor.addSibling()}>
      Add sibling class<span class="k" data-mode="tree">o</span>
    </button>
    {@render moveButtons()}
    <button class="btn danger" onclick={() => editor.deleteSelected()}>
      Delete class<span class="k" data-mode="tree">dd</span>
    </button>
  </div>
{/if}

<div class="legend">
  <div>
    <svg width="34" height="18">
      <rect
        x="1"
        y="2"
        width="32"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
      />
    </svg>
    <span>Classification: an aspect of the input.</span>
  </div>
  <div>
    <svg width="34" height="18">
      <text
        x="17"
        y="13"
        text-anchor="middle"
        fill="currentColor"
        font-size="12"
      >
        abc
      </text>
    </svg>
    <span>Class: one partition of that aspect.</span>
  </div>
  <div>
    <svg width="34" height="18">
      <line x1="0" y1="9" x2="34" y2="9" stroke="currentColor" />
      <circle cx="17" cy="9" r="5" fill="currentColor" />
    </svg>
    <span>
      Test case row. Click crossings to pick at most one class per
      classification.
    </span>
  </div>
  <div>
    <svg width="34" height="18">
      <line
        x1="17"
        y1="0"
        x2="17"
        y2="18"
        stroke="currentColor"
        stroke-dasharray="4 4"
      />
    </svg>
    <span>Dashed column: leaf class no test case uses yet.</span>
  </div>
</div>

<style lang="scss">
  .legend {
    border-top: 1px solid var(--line);
    padding-top: 12px;
    font-size: 12.5px;
    color: var(--muted);
    display: grid;
    gap: 7px;

    div {
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 8px;
      align-items: center;
    }

    svg {
      overflow: visible;
    }
  }
</style>
