<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import { minTests } from "../model";

  let { editor }: { editor: Editor } = $props();

  let leaves = $derived(editor.layout.leaves);
  let leavesCovered = $derived(
    leaves.filter((l) => editor.covered.has(l.id)).length,
  );
  let conflicts = $derived(
    editor.rows.filter((r) => r.info.conflicts.length).length,
  );
  let stats = $derived([
    {
      label: "Leaf classes",
      value: leaves.length,
      tip: "Classes without a refinement; each is a column of the combination table",
    },
    {
      label: "Leaves covered",
      value: `${leavesCovered}/${leaves.length}`,
      tone: leaves.length && leavesCovered === leaves.length ? "good" : "",
      tip: "Leaf classes used by at least one test case",
    },
    { label: "Test cases", value: editor.tree.tests.length },
    {
      label: "Min. for leaf coverage",
      value: minTests(editor.tree.root),
      tip: "Fewest test cases that use every leaf class at least once",
    },
    {
      label: "All combinations",
      value: editor.combinations,
      tip: "Number of valid combinations of leaf classes (the maximum criterion)",
    },
    {
      label: "Conflicts",
      value: conflicts,
      tone: conflicts ? "bad" : "",
      tip: "Test cases that pick two classes from the same classification",
    },
  ]);
</script>

<div class="stats">
  {#each stats as stat (stat.label)}
    <span class="stat {stat.tone}" title={stat.tip}>
      {stat.label} <b>{stat.value}</b>
    </span>
  {/each}
</div>

<style lang="scss">
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .stat {
    display: flex;
    align-items: baseline;
    gap: 7px;
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--line);
    font-size: 12.5px;
    color: var(--muted);

    b {
      color: var(--ink);
      font-family: var(--font-mono);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    &.good {
      border-color: var(--ok);

      b {
        color: var(--ok);
      }
    }

    &.bad {
      border-color: var(--danger);
      background: var(--danger-soft);

      b {
        color: var(--danger);
      }
    }
  }
</style>
