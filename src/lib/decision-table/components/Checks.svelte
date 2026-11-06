<script lang="ts">
  import { label } from "../../util";
  import type { TableEditor } from "../editor.svelte";
  import type { Entries, Rule } from "../model";

  const LISTED_MISSING = 12;

  let { editor }: { editor: TableEditor } = $props();

  let table = $derived(editor.current);
  let analysis = $derived(editor.analysis);
  let coverage = $derived(analysis.coverage);
  let ruleNumber = $derived(
    new Map(table.rules.map((rule, i) => [rule.id, `r${i + 1}`])),
  );
  let problems = $derived(
    !!coverage?.missing.count ||
      !!coverage?.overlaps.length ||
      analysis.noAction.length > 0 ||
      analysis.unusedActions.length > 0,
  );

  function goTo(
    event: MouseEvent & { currentTarget: HTMLButtonElement },
    rule: Rule,
  ) {
    editor.col = table.rules.findIndex((r) => r.id === rule.id);
    event.currentTarget.blur();
  }

  function describe(entries: Entries) {
    return table.conditions.flatMap((c) => {
      const value = c.values.find((v) => v.id === entries[c.id]);
      return value ? [{ name: label(c.name), value: label(value.name) }] : [];
    });
  }
</script>

{#snippet ruleLink(rule: Rule)}
  <button class="link" onclick={(event) => goTo(event, rule)}>
    {ruleNumber.get(rule.id)}
  </button>
{/snippet}

<section class="panel" aria-labelledby="checks-h">
  <h2 id="checks-h">Checks</h2>

  {#if !coverage}
    <p class="explain">
      The conditions are marked as dependent, so some combinations are
      impossible. The completeness and overlap checks assume every combination
      can happen, so they are off.
    </p>
  {:else if !problems}
    <p class="ok">
      Complete: every one of the {analysis.total} combinations has exactly one rule,
      and every rule and action is used.
    </p>
  {/if}

  {#if coverage?.missing.count}
    {@const { missing } = coverage}
    <div class="group">
      <div class="group-head">
        <h3>
          {missing.count} of {analysis.total} combinations have no rule
        </h3>
        <button class="btn" onclick={() => editor.addMissingRules()}>
          Add {missing.cubes.length}
          {missing.cubes.length === 1 ? "rule" : "rules"}
        </button>
      </div>
      <ul>
        {#each missing.cubes.slice(0, LISTED_MISSING) as entries, i (i)}
          <li class="chips">
            {#each describe(entries) as { name, value } (name)}
              <span class="chip"><i>{name}:</i> {value}</span>
            {:else}
              <span class="none">Any combination</span>
            {/each}
            <button
              class="link"
              onclick={() => editor.addRule(undefined, entries)}
            >
              Add rule
            </button>
          </li>
        {/each}
      </ul>
      {#if missing.cubes.length > LISTED_MISSING || missing.truncated}
        <p class="explain">
          Showing {LISTED_MISSING} groups of the {missing.count} combinations.
        </p>
      {/if}
    </div>
  {/if}

  {#if coverage?.overlaps.length}
    <div class="group">
      <h3>Rules matching the same combination</h3>
      <ul>
        {#each coverage.overlaps as { first, second, contradiction } (first.id + second.id)}
          <li class:bad={contradiction}>
            {@render ruleLink(first)} and {@render ruleLink(second)}:
            {contradiction
              ? "different actions"
              : "same actions, one is redundant"}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if analysis.noAction.length}
    <div class="group">
      <h3>Rules without an action</h3>
      <ul class="inline">
        {#each analysis.noAction as rule (rule.id)}
          <li>{@render ruleLink(rule)}</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if analysis.unusedActions.length}
    <div class="group">
      <h3>Actions no rule uses</h3>
      <ul class="inline">
        {#each analysis.unusedActions as action (action.id)}
          <li class="chip">{label(action.name)}</li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<style lang="scss">
  .ok {
    margin: 0;
    font-size: 13px;
    color: var(--ok);
  }

  .group {
    display: flex;
    flex-direction: column;
    gap: 6px;

    & + & {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--grid);
    }

    h3 {
      margin: 0;
      font-size: 12.5px;
      font-weight: 500;
    }
  }

  .group-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 12px;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 5px;
    font-size: 13px;

    &.inline {
      display: flex;
      flex-wrap: wrap;
    }
  }

  li {
    align-items: center;

    &.bad {
      color: var(--danger);
    }
  }

  .link {
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent);
    font-size: 12.5px;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
