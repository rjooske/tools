<script lang="ts">
  import { onMount } from "svelte";
  import type { AnyDocumentEditor } from "../document-editor.svelte";
  import type { KeySection } from "../vim-keys.svelte";
  import Dialog from "./Dialog.svelte";

  let {
    editor,
    sections,
  }: { editor: AnyDocumentEditor; sections: KeySection[] } = $props();

  let closeButton = $state<HTMLButtonElement>();

  onMount(() => closeButton?.focus());
</script>

<Dialog labelledby="help-h" wide onclose={() => editor.closeDialog()}>
  <div class="top">
    <h2 id="help-h">Keyboard shortcuts</h2>
    <button
      class="btn"
      bind:this={closeButton}
      onclick={() => editor.closeDialog()}
    >
      Close<span class="k">Esc</span>
    </button>
  </div>
  <p class="explain">
    Keys work whenever you are not typing in a field. The status bar shows the
    main keys. Moves accept a count, e.g.
    <span class="k">3</span><span class="k">j</span>. While renaming, press
    Enter or Esc to finish.
  </p>
  <div class="keys">
    {#each sections as section (section.title)}
      <section>
        <h3>{section.title}</h3>
        <dl>
          {#each section.keys as [keys, description] (description)}
            <dt>
              {#each keys as key (key)}<span class="k">{key}</span>{/each}
            </dt>
            <dd>{description}</dd>
          {/each}
        </dl>
      </section>
    {/each}
  </div>
</Dialog>

<style lang="scss">
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .keys {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 18px;

    h3 {
      margin: 0 0 8px;
      font-size: 11.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
    }

    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 6px 10px;
      margin: 0;
      align-items: baseline;
    }

    dt {
      white-space: nowrap;

      .k {
        margin: 0 2px 0 0;
      }
    }

    dd {
      margin: 0;
      font-size: 13px;
    }
  }
</style>
