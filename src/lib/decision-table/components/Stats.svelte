<script lang="ts">
  import StatPills, { type Stat } from "../../components/StatPills.svelte";
  import type { TableEditor } from "../editor.svelte";

  let { editor }: { editor: TableEditor } = $props();

  let table = $derived(editor.current);
  let analysis = $derived(editor.analysis);

  function coverageStats(): Stat[] {
    const { coverage, total } = analysis;
    if (!coverage) return [];
    const covered = total - coverage.missing.count;
    const contradictions = coverage.overlaps.filter(
      (o) => o.contradiction,
    ).length;
    return [
      {
        label: "Combinations covered",
        value: `${covered}/${total}`,
        tone: covered === total ? "good" : "",
        tip: "Condition combinations matched by at least one rule, out of the product of each condition's number of values",
      },
      {
        label: "Contradictions",
        value: contradictions,
        tone: contradictions ? "bad" : "",
        tip: "Pairs of rules matching the same combination with different actions",
      },
    ];
  }

  let stats: Stat[] = $derived([
    { label: "Conditions", value: table.conditions.length },
    { label: "Actions", value: table.actions.length },
    { label: "Rules", value: table.rules.length },
    ...coverageStats(),
    {
      label: "Rules without action",
      value: analysis.noAction.length,
      tone: analysis.noAction.length ? "bad" : "",
    },
  ]);
</script>

<StatPills {stats} />
