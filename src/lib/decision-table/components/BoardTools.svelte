<script lang="ts">
  import type { TableEditor } from "../editor.svelte";
  import { MAX_GENERATED_RULES, type SortOrder } from "../model";

  let { editor }: { editor: TableEditor } = $props();

  let tooManyToExpand = $derived(editor.expandedCount > MAX_GENERATED_RULES);

  function sort(event: Event & { currentTarget: HTMLSelectElement }) {
    const select = event.currentTarget;
    const how = select.value as SortOrder | "";
    select.value = "";
    select.blur();
    if (how) editor.sortRules(how);
  }
</script>

<div class="board-tools">
  <button class="btn primary" onclick={() => editor.addRule()}>
    + Rule<span class="k">a</span>
  </button>
  <button class="btn" onclick={() => editor.addCondition()}>+ Condition</button>
  <button class="btn" onclick={() => editor.addAction()}>+ Action</button>
  <button
    class="btn"
    title="Merge rules that only differ in a condition whose values are all listed, and drop rules another rule already covers"
    disabled={!editor.canReduce}
    onclick={() => editor.reduceRules()}>Reduce rules</button
  >
  <button
    class="btn"
    title={tooManyToExpand
      ? `${editor.expandedCount} rules is too many to expand automatically (limit ${MAX_GENERATED_RULES})`
      : "Replace every don't care with one rule per value"}
    disabled={tooManyToExpand ||
      editor.expandedCount === editor.current.rules.length}
    onclick={() => editor.expandRules()}>Expand don't cares</button
  >
  <label for="sort-select" class="sr">Sort rules</label>
  <select
    id="sort-select"
    disabled={editor.current.rules.length < 2}
    onchange={sort}
  >
    <option value="">Sort rules…</option>
    <option value="conditions">By conditions (dominant first)</option>
    <option value="actions">By action</option>
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
