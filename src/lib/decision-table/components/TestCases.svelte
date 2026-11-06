<script lang="ts">
  import { label } from "../../util";
  import type { TableEditor } from "../editor.svelte";
  import { valueName } from "../model";

  let { editor }: { editor: TableEditor } = $props();

  let table = $derived(editor.current);
</script>

<section class="panel" aria-labelledby="cases-h">
  <h2 id="cases-h">Test cases</h2>
  <p class="explain">
    Each rule is one test case: set up its conditions, expect its actions.
    Conditions left out are don't cares.
  </p>
  <ol>
    {#each table.rules as rule, i (rule.id)}
      <li class:current={editor.col === i}>
        <span class="tc">tc{i + 1}</span>
        <div class="chips">
          {#each table.conditions as condition (condition.id)}
            {#if condition.id in rule.entries}
              <span class="chip">
                <i>{label(condition.name)}:</i>
                {valueName(condition, rule)}
              </span>
            {/if}
          {/each}
          <span class="arrow" aria-label="expect">→</span>
          {#each table.actions as action (action.id)}
            {#if rule.actions.includes(action.id)}
              <span class="chip expected">{label(action.name)}</span>
            {/if}
          {/each}
          {#if !rule.actions.length}
            <span class="none">No action</span>
          {/if}
        </div>
      </li>
    {:else}
      <li class="none">No rules yet.</li>
    {/each}
  </ol>
</section>

<style lang="scss">
  ol {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }

  li:not(.none) {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 8px;
    padding: 6px 4px;
    border-top: 1px solid var(--grid);
    align-items: start;

    &:first-child {
      border-top: 0;
    }

    &.current .tc {
      color: var(--accent);
      font-weight: 500;
    }
  }

  .tc {
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--muted);
    padding-top: 2px;
  }

  .arrow {
    color: var(--muted);
    font-size: 12.5px;
  }

  .expected {
    border-color: var(--accent);
  }
</style>
