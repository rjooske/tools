<script lang="ts">
  import { label } from "../../util";
  import type { TableEditor } from "../editor.svelte";
  import { ruleCount, type Condition } from "../model";

  const MIN_VALUES = 2;

  let { editor }: { editor: TableEditor } = $props();

  let table = $derived(editor.current);
  let row = $derived(editor.selectedRow);
  let rule = $derived(editor.selectedRule);
  let sectionSize = $derived(
    row?.kind === "condition" ? table.conditions.length : table.actions.length,
  );
  let cols = $derived(table.rules.length);

  function finishEditing(
    event: KeyboardEvent & { currentTarget: HTMLInputElement },
  ) {
    if (event.key === "Enter" || event.key === "Escape") {
      event.currentTarget.blur();
    }
  }
</script>

{#snippet valuesField(condition: Condition)}
  <div class="field">
    <span>Values</span>
    <ul class="values">
      {#each condition.values as value (value.id)}
        <li>
          <input
            type="text"
            autocomplete="off"
            aria-label="Value {label(value.name)}"
            value={value.name}
            onfocusin={() => editor.beginTextEdit()}
            oninput={(event) =>
              editor.setValueName(
                condition,
                value.id,
                event.currentTarget.value,
              )}
            onkeydown={finishEditing}
          />
          <button
            class="remove"
            aria-label="Remove value {label(value.name)}"
            title="Remove value"
            disabled={condition.values.length <= MIN_VALUES}
            onclick={() => editor.removeValue(condition, value.id)}>×</button
          >
        </li>
      {/each}
    </ul>
    <div class="actions">
      <button class="btn" onclick={() => editor.addValue(condition)}>
        Add value
      </button>
    </div>
  </div>
{/snippet}

{#if row}
  <div class="inspector-head">
    <span class="kind">{row.kind}</span>
  </div>
  <label class="field" for="name-input">
    <span>Name <span class="k">i</span></span>
    <input
      type="text"
      id="name-input"
      autocomplete="off"
      value={row.node.name}
      bind:this={editor.nameInput}
      onfocusin={() => editor.beginTextEdit()}
      oninput={(event) => editor.setSelectedName(event.currentTarget.value)}
      onkeydown={finishEditing}
    />
  </label>
  {#if row.kind === "condition"}
    {@render valuesField(row.node)}
  {/if}
  <div class="actions">
    <button class="btn" onclick={() => editor.addRowBeside()}>
      Add {row.kind} below<span class="k">o</span>
    </button>
    <button
      class="btn"
      disabled={row.index === 0}
      onclick={() => editor.moveRow(-1)}
    >
      Move up<span class="k">K</span>
    </button>
    <button
      class="btn"
      disabled={row.index === sectionSize - 1}
      onclick={() => editor.moveRow(1)}
    >
      Move down<span class="k">J</span>
    </button>
    <button class="btn danger" onclick={() => editor.deleteRow()}>
      Delete {row.kind}<span class="k">dd</span>
    </button>
  </div>
{:else}
  <p class="explain">This table has no rows. Add a condition or an action.</p>
{/if}

{#if rule}
  <div class="section">
    <div class="inspector-head">
      <span class="kind">Rule r{editor.col + 1}</span>
    </div>
    {#if table.independent}
      {@const count = ruleCount(table, rule)}
      <p class="explain">
        Stands for {count}
        {count === 1 ? "combination" : "combinations"}.
      </p>
    {/if}
    <div class="actions">
      <button class="btn" onclick={() => editor.duplicateRule()}
        >Duplicate</button
      >
      <button
        class="btn"
        disabled={editor.col === 0}
        onclick={() => editor.moveRule(-1)}
      >
        Move left<span class="k">H</span>
      </button>
      <button
        class="btn"
        disabled={editor.col === cols - 1}
        onclick={() => editor.moveRule(1)}
      >
        Move right<span class="k">L</span>
      </button>
      <button class="btn danger" onclick={() => editor.deleteRule()}>
        Delete rule<span class="k">dr</span>
      </button>
    </div>
  </div>
{/if}

<div class="section">
  <div class="inspector-head"><span class="kind">Table</span></div>
  <label class="field" for="table-name-input">
    <span>Table name</span>
    <input
      type="text"
      id="table-name-input"
      autocomplete="off"
      value={table.name}
      bind:this={editor.tableNameInput}
      onfocusin={() => editor.beginTextEdit()}
      oninput={(event) => editor.setTableName(event.currentTarget.value)}
      onkeydown={finishEditing}
    />
  </label>
  <label class="field" for="notes-input">
    <span>Specification notes</span>
    <textarea
      id="notes-input"
      rows="4"
      placeholder="Paste the informal spec you are modelling"
      value={table.notes}
      onfocusin={() => editor.beginTextEdit()}
      oninput={(event) => editor.setNotes(event.currentTarget.value)}
    ></textarea>
  </label>
  <label class="check">
    <input
      type="checkbox"
      checked={table.independent}
      onchange={(event) => editor.setIndependent(event.currentTarget.checked)}
    />
    <span>
      Conditions are independent, so every combination can happen. Turn this off
      if some combinations are impossible.
    </span>
  </label>
</div>

<style lang="scss">
  .section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-top: 1px solid var(--line);
    padding-top: 12px;
  }

  .values {
    list-style: none;
    margin: 0 0 2px;
    padding: 0;
    display: grid;
    gap: 4px;

    li {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 26px;
      gap: 4px;
    }
  }

  .remove {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: 0;
    cursor: pointer;
    color: var(--muted);

    &:hover:not(:disabled) {
      color: var(--danger);
      border-color: var(--danger);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }
  }

  .check {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px;
    align-items: start;
    font-size: 12.5px;
    color: var(--muted);

    input {
      margin: 2px 0 0;
    }
  }
</style>
