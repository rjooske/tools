<script lang="ts">
  import { label } from "../../util";
  import type { Row, TableEditor } from "../editor.svelte";
  import { DONT_CARE, ruleCount, valueName, type Rule } from "../model";

  let { editor }: { editor: TableEditor } = $props();

  let table = $derived(editor.current);
  let conditionRows = $derived(
    editor.rows.filter((r) => r.kind === "condition"),
  );
  let actionRows = $derived(editor.rows.filter((r) => r.kind === "action"));
  let contradicting = $derived(
    new Set(
      editor.analysis.coverage?.overlaps
        .filter((o) => o.contradiction)
        .flatMap((o) => [o.first.id, o.second.id]),
    ),
  );

  const rowIndex = (row: Row) =>
    row.kind === "condition" ? row.index : table.conditions.length + row.index;

  // A focused button would swallow Enter and Space, which the keys need.
  function moveCursor(
    event: MouseEvent & { currentTarget: HTMLButtonElement },
    move: () => void,
  ) {
    move();
    event.currentTarget.blur();
  }

  function cellText(row: Row, rule: Rule) {
    if (row.kind === "condition") return valueName(row.node, rule);
    return rule.actions.includes(row.node.id) ? "X" : DONT_CARE;
  }

  function ruleProblem(rule: Rule) {
    if (contradicting.has(rule.id)) {
      return "Overlaps a rule with different actions";
    }
    return rule.actions.length ? "" : "No action";
  }
</script>

{#snippet tableRow(row: Row)}
  {@const r = rowIndex(row)}
  <tr class:cur={editor.row === r}>
    <th scope="row" class="stub">
      <button
        class="stub-name"
        class:unnamed={!row.node.name.trim()}
        onclick={(event) => moveCursor(event, () => (editor.row = r))}
        ondblclick={() => editor.focusName(true)}
      >
        {label(row.node.name)}
      </button>
    </th>
    {#each table.rules as rule, c (rule.id)}
      {@const text = cellText(row, rule)}
      {@const cursor = editor.row === r && editor.col === c}
      <td
        id={cursor ? "table-cursor" : undefined}
        class:cursor
        class:curcol={editor.col === c}
        class:blank={text === DONT_CARE}
        class:mark={text === "X"}
        onclick={() => editor.cycleCell(r, c)}
      >
        {text}
      </td>
    {/each}
  </tr>
{/snippet}

<div class="sheet" role="region" aria-label="Decision table">
  <table>
    <thead>
      <tr>
        <th scope="col" class="stub">Stub</th>
        {#each table.rules as rule, c (rule.id)}
          {@const problem = ruleProblem(rule)}
          <th
            scope="col"
            class="rule"
            class:curcol={editor.col === c}
            class:bad={contradicting.has(rule.id)}
            title={problem}
          >
            <button
              onclick={(event) => moveCursor(event, () => (editor.col = c))}
            >
              {problem ? "! " : ""}r{c + 1}
            </button>
          </th>
        {:else}
          <th scope="col" class="empty">Entry</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each conditionRows as row (row.node.id)}
        {@render tableRow(row)}
      {/each}
    </tbody>
    <tbody class="actions-part">
      {#each actionRows as row (row.node.id)}
        {@render tableRow(row)}
      {/each}
    </tbody>
    {#if table.independent}
      <tfoot>
        <tr>
          <th
            scope="row"
            class="stub"
            title="Combinations each rule stands for: every don't care multiplies it by the number of values"
          >
            Rule count
          </th>
          {#each table.rules as rule, c (rule.id)}
            <td class:curcol={editor.col === c}>{ruleCount(table, rule)}</td>
          {/each}
        </tr>
      </tfoot>
    {/if}
  </table>
  {#if !table.rules.length}
    <p class="note">No rules yet. Press <span class="k">a</span> to add one.</p>
  {/if}
</div>

<style lang="scss">
  .sheet {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: auto;
    min-height: 200px;
  }

  table {
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
  }

  th,
  td {
    padding: 0;
    border-bottom: 1px solid var(--grid);
    white-space: nowrap;
  }

  thead th {
    border-bottom: 1px solid var(--ink);
    font-weight: 600;
    padding: 6px 10px;
  }

  .stub {
    position: sticky;
    left: 0;
    z-index: 1;
    background: var(--surface);
    text-align: left;
    border-right: 3px double var(--ink);
    font-weight: 500;
    padding: 0;
    max-width: 320px;
  }

  thead .stub {
    padding: 6px 10px;
  }

  tfoot .stub {
    padding: 5px 10px;
    color: var(--muted);
    font-weight: 400;
  }

  .stub-name {
    display: block;
    width: 100%;
    padding: 5px 10px;
    background: none;
    border: 0;
    text-align: left;
    font-weight: 500;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;

    &.unnamed {
      color: var(--muted);
      font-style: italic;
      font-weight: 400;
    }
  }

  tr.cur .stub-name {
    color: var(--accent);
  }

  .rule {
    min-width: 40px;
    padding: 0;

    button {
      width: 100%;
      padding: 6px 8px;
      background: none;
      border: 0;
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 500;
    }

    &.bad button {
      color: var(--danger);
    }
  }

  .empty {
    color: var(--muted);
    font-weight: 400;
  }

  td {
    min-width: 40px;
    height: 30px;
    padding: 0 10px;
    text-align: center;
    font-family: var(--font-mono);
    cursor: pointer;
    user-select: none;

    &:hover {
      background: var(--accent-soft);
    }

    &.blank {
      color: var(--muted);
    }

    &.mark {
      font-weight: 500;
    }

    &.cursor {
      outline: 2px solid var(--accent);
      outline-offset: -3px;
      border-radius: 5px;
    }
  }

  .curcol,
  tr.cur td {
    background: color-mix(in srgb, var(--accent) 9%, transparent);
  }

  .actions-part tr:first-child > * {
    border-top: 3px double var(--ink);
  }

  tfoot {
    th,
    td {
      border-top: 1px solid var(--ink);
      border-bottom: 0;
    }

    td {
      color: var(--muted);
      font-size: 12px;
      cursor: default;

      &:hover {
        background: none;
      }
    }
  }

  .note {
    margin: 0;
    padding: 12px;
    font-size: 13px;
    color: var(--muted);
  }
</style>
