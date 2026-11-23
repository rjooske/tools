<script lang="ts">
  import { resolve } from "$app/paths";
  import { exportAll, importAll } from "#lib/backup.ts";

  let fileInput = $state<HTMLInputElement>();
  let error = $state("");

  function exportData() {
    const url = URL.createObjectURL(
      new Blob([exportAll()], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `tools-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(
    event: Event & { currentTarget: HTMLInputElement },
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!confirm("Replace all current data with this backup?")) return;
    const failure = importAll(await file.text());
    if (failure) error = failure;
    // Reload so the theme, which is read once at startup, picks up the backup.
    else location.reload();
  }
</script>

<svelte:head>
  <title>Tools</title>
</svelte:head>

<main>
  <h1>Tools</h1>
  <ul>
    <li>
      <a href={resolve("/classification-tree")}>Classification Tree Editor</a>
    </li>
    <li><a href={resolve("/decision-table")}>Decision Table Editor</a></li>
  </ul>

  <h2>Backup</h2>
  <p class="explain">
    Save every tree, table and setting as one JSON file, or restore from one.
    Restoring replaces everything currently here.
  </p>
  <div class="actions">
    <button class="btn" onclick={exportData}>Export all data</button>
    <button class="btn" onclick={() => fileInput?.click()}>
      Import all data
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept="application/json,.json"
      hidden
      onchange={importData}
    />
  </div>
  {#if error}<p class="err" role="alert">{error}</p>{/if}
</main>

<style lang="scss">
  main {
    max-width: 1400px;
    margin: 0 auto;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
  }

  h2 {
    margin: 24px 0 4px;
    font-size: 14px;
    font-weight: 600;
  }

  .err {
    color: var(--danger);
    white-space: pre-line;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  a {
    color: var(--accent);
  }
</style>
