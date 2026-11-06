<script lang="ts">
  import StatPills, { type Stat } from "../../components/StatPills.svelte";
  import type { TreeEditor } from "../editor.svelte";
  import { minTests } from "../model";

  let { editor }: { editor: TreeEditor } = $props();

  let leaves = $derived(editor.layout.leaves);
  let leavesCovered = $derived(
    leaves.filter((l) => editor.covered.has(l.id)).length,
  );
  let conflicts = $derived(
    editor.rows.filter((r) => r.info.conflicts.length).length,
  );
  let stats: Stat[] = $derived([
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
    { label: "Test cases", value: editor.current.tests.length },
    {
      label: "Min. for leaf coverage",
      value: minTests(editor.current.root),
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

<StatPills {stats} />
