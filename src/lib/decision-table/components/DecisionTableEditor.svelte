<script lang="ts">
  import EditorShell from "../../components/EditorShell.svelte";
  import StatusBar from "../../components/StatusBar.svelte";
  import { TableEditor } from "../editor.svelte";
  import { HELP_SECTIONS, HINTS, TableKeys } from "../keys.svelte";
  import BoardTools from "./BoardTools.svelte";
  import Checks from "./Checks.svelte";
  import Inspector from "./Inspector.svelte";
  import Stats from "./Stats.svelte";
  import TableGrid from "./TableGrid.svelte";
  import TestCases from "./TestCases.svelte";

  const editor = new TableEditor();
  const keys = new TableKeys(editor);
</script>

<EditorShell
  {editor}
  {keys}
  title="Decision Table Editor"
  helpSections={HELP_SECTIONS}
>
  {#snippet icon()}
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path
        d="M2.5 3.5h17v15h-17zM2.5 8h17M2.5 13h17M8 3.5v15M9.2 3.5v15"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
      />
    </svg>
  {/snippet}

  {#snippet board()}
    <BoardTools {editor} />
    <TableGrid {editor} />
    <StatusBar {keys} hints={HINTS} />
    <Stats {editor} />
    <Checks {editor} />
    <TestCases {editor} />
  {/snippet}

  {#snippet inspector()}
    <Inspector {editor} />
  {/snippet}
</EditorShell>
