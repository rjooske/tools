<script lang="ts">
  import { Editor } from "../editor.svelte";
  import { VimKeys } from "../keys.svelte";
  import BoardTools from "./BoardTools.svelte";
  import CaseList from "./CaseList.svelte";
  import HelpDialog from "./HelpDialog.svelte";
  import ImportExportDialog from "./ImportExportDialog.svelte";
  import Inspector from "./Inspector.svelte";
  import Stats from "./Stats.svelte";
  import StatusBar from "./StatusBar.svelte";
  import Toolbar from "./Toolbar.svelte";
  import TreeCanvas from "./TreeCanvas.svelte";

  const editor = new Editor();
  const keys = new VimKeys(editor);
</script>

<svelte:document onkeydown={keys.handle} />

<div class="app" data-mode={editor.mode}>
  <Toolbar {editor} />

  <main class="workspace">
    <section class="board">
      <BoardTools {editor} />
      <TreeCanvas {editor} />
      <StatusBar {editor} {keys} />
      <Stats {editor} />
      <CaseList {editor} />
    </section>
    <aside class="inspector" aria-label="Edit selection">
      <Inspector {editor} />
    </aside>
  </main>
</div>

{#if editor.dialog === "io"}
  <ImportExportDialog {editor} />
{:else if editor.dialog === "help"}
  <HelpDialog {editor} />
{/if}

<style lang="scss">
  .app {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 14px;

    &[data-mode="tree"] :global(.k[data-mode="grid"]),
    &[data-mode="grid"] :global(.k[data-mode="tree"]) {
      opacity: 0.35;
    }
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 14px;
    align-items: start;
  }

  .board {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

  .inspector {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: sticky;
    top: calc(env(safe-area-inset-top, 0px) + 12px);
  }

  @media (max-width: 900px) {
    .workspace {
      grid-template-columns: minmax(0, 1fr);
    }

    .inspector {
      position: static;
    }
  }
</style>
