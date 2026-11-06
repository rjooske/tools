<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import { ALL_COMBINATIONS_CAP, type SortOrder } from "../model";

  let { editor }: { editor: Editor } = $props();

  let tooManyCombinations = $derived(
    editor.combinations > ALL_COMBINATIONS_CAP,
  );

  function sort(event: Event & { currentTarget: HTMLSelectElement }) {
    const select = event.currentTarget;
    const how = select.value as SortOrder | "";
    select.value = "";
    select.blur();
    if (how) editor.sortTests(how);
  }
</script>

<div class="board-tools">
  <button class="btn primary" onclick={() => editor.addTest()}>
    + Test case<span class="k" data-mode="grid">o</span>
  </button>
  <button
    class="btn"
    title="Replace the test cases with the smallest set that uses every leaf class at least once"
    onclick={() => editor.fillMinimal()}>Fill minimal set</button
  >
  <button
    class="btn"
    title={tooManyCombinations
      ? `${editor.combinations} combinations is too many to fill automatically (limit ${ALL_COMBINATIONS_CAP})`
      : "Replace the test cases with every valid combination of leaf classes"}
    disabled={tooManyCombinations || editor.combinations === 0}
    onclick={() => editor.fillAll()}>Fill all combinations</button
  >
  <button
    class="btn"
    disabled={!editor.tree.tests.length}
    onclick={() => editor.clearTests()}>Clear test cases</button
  >
  <button
    class="btn"
    aria-pressed={!editor.showDots}
    onclick={() => editor.setShowDots(!editor.showDots)}
  >
    {editor.showDots ? "Hide background" : "Show background"}<span class="k"
      >v</span
    >
  </button>
  <label for="sort-select" class="sr">Sort test cases</label>
  <select
    id="sort-select"
    disabled={editor.tree.tests.length < 2}
    onchange={sort}
  >
    <option value="">Sort test cases…</option>
    <option value="tree">By tree order (left to right)</option>
    <option value="fewest">Fewest classes first</option>
    <option value="most">Most classes first</option>
    <option value="conflicts">Conflicts first</option>
    <option value="reverse">Reverse current order</option>
  </select>
</div>

<style lang="scss">
  .board-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;

    select {
      font-size: 13px;
      padding: 5px 8px;
    }
  }
</style>
