<script lang="ts">
  import type { Snippet } from "svelte";
  import type { AnyDocumentEditor } from "../document-editor.svelte";
  import type { KeySection, VimKeys } from "../vim-keys.svelte";
  import DocumentToolbar from "./DocumentToolbar.svelte";
  import HelpDialog from "./HelpDialog.svelte";
  import ImportExportDialog from "./ImportExportDialog.svelte";

  let {
    editor,
    keys,
    title,
    mode,
    helpSections,
    icon,
    board,
    inspector,
  }: {
    editor: AnyDocumentEditor;
    keys: VimKeys<AnyDocumentEditor>;
    title: string;
    mode?: string;
    helpSections: KeySection[];
    icon: Snippet;
    board: Snippet;
    inspector: Snippet;
  } = $props();
</script>

<svelte:document onkeydown={keys.handle} />

<div class="app" data-mode={mode}>
  <DocumentToolbar {editor} {title} {icon} />

  <main class="workspace">
    <section class="board">
      {@render board()}
    </section>
    <aside class="inspector" aria-label="Edit selection">
      {@render inspector()}
    </aside>
  </main>
</div>

{#if editor.dialog === "io"}
  <ImportExportDialog {editor} />
{:else if editor.dialog === "help"}
  <HelpDialog {editor} sections={helpSections} />
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
