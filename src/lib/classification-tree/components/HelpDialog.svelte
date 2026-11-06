<script lang="ts">
  import Dialog from "#lib/components/Dialog.svelte";
  import { onMount } from "svelte";
  import type { Editor } from "../editor.svelte";

  let { editor }: { editor: Editor } = $props();

  const SECTIONS: { title: string; keys: [string[], string][] }[] = [
    {
      title: "Anywhere",
      keys: [
        [["t"], "Switch between tree and test grid"],
        [["Esc"], "Back to tree mode"],
        [["u"], "Undo"],
        [["^R"], "Redo"],
        [["v"], "Show / hide background dots"],
        [["gt", "gT"], "Next / previous tree"],
        [["?"], "This list"],
      ],
    },
    {
      title: "Tree mode",
      keys: [
        [["h", "l"], "Node to the left / right"],
        [["j", "k"], "First child / parent"],
        [["gg"], "Root"],
        [["i", "↵"], "Rename"],
        [["c"], "Rename, replacing the text"],
        [["a"], "Add child (class or classification)"],
        [["o", "O"], "Add sibling after / before"],
        [["dd"], "Delete node"],
        [["H", "L"], "Move node left / right"],
      ],
    },
    {
      title: "Grid mode",
      keys: [
        [["h", "l"], "Previous / next leaf class"],
        [["j", "k"], "Next / previous test case"],
        [["0", "$"], "First / last leaf class"],
        [["gg", "G"], "First / last test case"],
        [["x", "␣"], "Toggle dot"],
        [["o", "O"], "New test case below / above"],
        [["dd"], "Delete test case"],
        [["J", "K"], "Move test case down / up"],
      ],
    },
  ];

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
    Keys work whenever you are not typing in a field. The bar under the diagram
    shows the current mode and its main keys. Moves accept a count, e.g.
    <span class="k">3</span><span class="k">j</span>. While renaming, press
    Enter or Esc to finish.
  </p>
  <div class="keys">
    {#each SECTIONS as section (section.title)}
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
