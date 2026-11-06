<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import { LEFT, levelY, ROW_HEIGHT } from "../layout";
  import { label, ROOT_ID } from "../model";

  let { editor }: { editor: Editor } = $props();

  let layout = $derived(editor.layout);
  let rootPos = $derived(layout.pos[ROOT_ID]);
  let nodes = $derived(
    [...editor.entries.values()].flatMap((entry) =>
      entry.kind === "root" ? [] : [{ entry, pos: layout.pos[entry.node.id] }],
    ),
  );

  let gridTop = $derived(levelY(layout.maxDepth) + 30);
  let rowY = $derived((row: number) => gridTop + 16 + row * ROW_HEIGHT);
  let gridBottom = $derived(
    editor.rows.length ? rowY(editor.rows.length - 1) + 16 : gridTop + 44,
  );
  let width = $derived(layout.width + 44);
  let height = $derived(gridBottom + 22);

  // A focused node would swallow Enter and Space, which the vim keys need.
  function selectWithMouse(
    event: MouseEvent & { currentTarget: SVGGElement },
    id: string,
  ) {
    editor.select(id);
    event.currentTarget.blur();
  }

  function activateOnKey(event: KeyboardEvent, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      editor.select(id, true);
    }
  }
</script>

<div
  class="canvas"
  class:grid-mode={editor.mode === "grid"}
  class:nodots={!editor.showDots}
  role="region"
  aria-label="Classification tree and combination table"
>
  <svg class="tree" {width} {height} viewBox="0 0 {width} {height}">
    {#each layout.edges as edge, i (i)}
      <line class="edge" {...edge} />
    {/each}

    {#if editor.gridCursorVisible}
      <rect
        class="cursor-band"
        x={LEFT - 48}
        y={rowY(editor.gridRow) - 13}
        width={layout.width - LEFT + 84}
        height="26"
      />
    {/if}

    {#each editor.rows as { test, info }, i (test.id)}
      {@const y = rowY(i)}
      {@const conflict = info.conflicts.length > 0}
      <g
        class="row"
        class:conflict
        class:cur={editor.gridCursorVisible && i === editor.gridRow}
      >
        <line
          class="rowline"
          x1={LEFT - 8}
          y1={y}
          x2={layout.width + 4}
          y2={y}
        />
        <text class="rowlabel" x={LEFT - 14} y={y + 4} text-anchor="end">
          {conflict ? "! " : ""}tc{i + 1}
        </text>
        {#if conflict}
          <title>{info.conflicts.join("; ")}</title>
        {/if}
        <!-- Grid mode's dd is the keyboard route to deleting a test case. -->
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
        <g
          class="deltest"
          role="button"
          aria-label="Delete test case tc{i + 1}"
          onclick={() => editor.removeTest(test.id)}
        >
          <rect x={layout.width + 10} y={y - 11} width="22" height="22" />
          <text x={layout.width + 21} y={y + 5} text-anchor="middle">×</text>
        </g>
      </g>
    {/each}

    {#each layout.leaves as leaf (leaf.id)}
      {@const x = layout.pos[leaf.id].x}
      {@const covered = editor.covered.has(leaf.id)}
      <line
        class="col"
        class:uncov={!covered}
        x1={x}
        y1={levelY(layout.pos[leaf.id].depth) + 9}
        x2={x}
        y2={gridBottom}
      >
        <title>{covered ? "" : "Not used by any test case"}</title>
      </line>
    {/each}

    {#each editor.rows as { test, info }, i (test.id)}
      {@const y = rowY(i)}
      <g class="row" class:conflict={info.conflicts.length > 0}>
        {#each layout.leaves as leaf (leaf.id)}
          {@const x = layout.pos[leaf.id].x}
          <!-- Grid mode is the keyboard route to toggling a cell. -->
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <circle
            class="hit"
            cx={x}
            cy={y}
            r="12"
            onclick={() => editor.toggleCell(test.id, leaf.id)}
          >
            <title>tc{i + 1} · {label(leaf.name)}</title>
          </circle>
          {#if test.picks.includes(leaf.id)}
            <circle class="dot" cx={x} cy={y} r="6" />
          {/if}
        {/each}
      </g>
    {/each}

    {#if editor.gridCursorVisible}
      <rect
        class="cursor-cell"
        id="grid-cursor"
        x={layout.pos[layout.leaves[editor.gridCol].id].x - 14}
        y={rowY(editor.gridRow) - 14}
        width="28"
        height="28"
        rx="5"
      />
    {/if}

    {#if !editor.rows.length}
      <text class="emptynote" x={LEFT - 8} y={gridTop + 26}>
        No test cases yet. Add one (or press t, then o), then click the
        crossings to pick classes.
      </text>
    {/if}

    <g
      class="node"
      class:sel={editor.sel === ROOT_ID}
      data-node={ROOT_ID}
      tabindex="0"
      role="button"
      aria-label="Tree root"
      onclick={(event) => selectWithMouse(event, ROOT_ID)}
      ondblclick={() => editor.select(ROOT_ID, true)}
      onkeydown={(event) => activateOnKey(event, ROOT_ID)}
    >
      <circle class="lbl-bg" cx={rootPos.x} cy={levelY(0)} r="11" />
      <circle class="rootdot" cx={rootPos.x} cy={levelY(0)} r="5" />
    </g>
    {#if !editor.tree.root.children.length}
      <text class="emptynote" x={rootPos.x + 18} y={levelY(0) + 5}>
        Empty tree. Use “Add classification” in the panel.
      </text>
    {/if}

    {#each nodes as { entry, pos } (entry.node.id)}
      {@const id = entry.node.id}
      {@const y = levelY(pos.depth)}
      {@const unnamed = !entry.node.name?.trim()}
      {@const text = label(entry.node.name)}
      <g
        class="node"
        class:sel={editor.sel === id}
        data-node={id}
        tabindex="0"
        role="button"
        aria-label="{entry.kind === 'class'
          ? 'Class'
          : 'Classification'} {text}"
        onclick={(event) => selectWithMouse(event, id)}
        ondblclick={() => editor.select(id, true)}
        onkeydown={(event) => activateOnKey(event, id)}
      >
        {#if entry.kind === "classification"}
          <rect
            class="box"
            class:empty={pos.empty}
            x={pos.x - pos.width / 2}
            y={y - 13}
            width={pos.width}
            height="26"
          />
          <text
            class="cname"
            class:placeholder={unnamed}
            x={pos.x}
            y={y + 4.5}
            text-anchor="middle">{text}</text
          >
        {:else}
          <rect
            class="lbl-bg"
            x={pos.x - (pos.width + 12) / 2}
            y={y - 10}
            width={pos.width + 12}
            height="20"
            rx="4"
          />
          <text
            class:uncov={pos.leaf && !editor.covered.has(id)}
            class:placeholder={unnamed}
            x={pos.x}
            y={y + 4.5}
            text-anchor="middle">{text}</text
          >
        {/if}
      </g>
    {/each}
  </svg>
</div>

<style lang="scss">
  .canvas {
    background-color: var(--surface);
    background-image: radial-gradient(var(--grid) 1px, transparent 1.2px);
    background-size: 18px 18px;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: auto;
    min-height: 320px;

    &.grid-mode {
      border-color: var(--accent);
    }

    &.nodots {
      background-image: none;
    }

    svg {
      display: block;
    }
  }

  .tree text {
    font-family: var(--font-ui);
    font-size: 13px;
    fill: var(--ink);
    user-select: none;

    &.placeholder {
      fill: var(--muted);
      font-style: italic;
    }

    &.uncov {
      fill: var(--muted);
    }

    &.emptynote {
      fill: var(--muted);
    }

    &.rowlabel {
      font-family: var(--font-mono);
      font-size: 12px;
    }
  }

  .edge {
    stroke: var(--ink);
    stroke-width: 1.25;
    fill: none;
  }

  .col {
    stroke: var(--ink);
    stroke-width: 1.25;

    &.uncov {
      stroke: var(--muted);
      stroke-dasharray: 4 4;
    }
  }

  .rowline {
    stroke: var(--ink);
    stroke-opacity: 0.55;
    stroke-width: 1;
  }

  .row {
    &.conflict {
      .rowline {
        stroke: var(--danger);
        stroke-opacity: 0.9;
      }

      .tree & .rowlabel {
        fill: var(--danger);
        font-weight: 500;
      }

      .dot {
        fill: var(--danger);
      }
    }

    &.cur {
      .tree & .rowlabel {
        fill: var(--accent);
        font-weight: 500;
      }
    }
  }

  .node {
    cursor: pointer;
    outline: none;

    .box {
      fill: var(--surface);
      stroke: var(--ink);
      stroke-width: 1.3;

      &.empty {
        stroke-dasharray: 4 3;
      }
    }

    .lbl-bg {
      fill: transparent;
    }

    &:hover .lbl-bg,
    &:hover .box {
      fill: var(--grid);
    }

    &.sel .box,
    &.sel .lbl-bg {
      fill: var(--accent-soft);
      stroke: var(--accent);
      stroke-width: 2;
    }

    &:focus-visible .box,
    &:focus-visible .lbl-bg {
      stroke: var(--accent);
      stroke-width: 2;
    }

    .cname {
      font-weight: 500;
    }
  }

  .rootdot {
    fill: var(--surface);
    stroke: var(--ink);
    stroke-width: 1.5;
  }

  .hit {
    fill: var(--accent);
    fill-opacity: 0;
    cursor: pointer;

    &:hover {
      fill-opacity: 0.18;
      stroke: var(--accent);
      stroke-width: 1;
    }
  }

  .dot {
    fill: var(--ink);
    pointer-events: none;
  }

  .deltest {
    cursor: pointer;

    rect {
      fill: transparent;
    }

    .tree & text {
      fill: var(--muted);
      font-size: 15px;
    }

    .tree &:hover text {
      fill: var(--danger);
    }
  }

  .cursor-band {
    fill: var(--accent);
    fill-opacity: 0.09;
  }

  .cursor-cell {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
    pointer-events: none;
  }
</style>
