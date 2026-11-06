<script lang="ts">
  import EditorShell from "../../components/EditorShell.svelte";
  import StatusBar from "../../components/StatusBar.svelte";
  import { TreeEditor } from "../editor.svelte";
  import { HELP_SECTIONS, HINTS, TreeKeys } from "../keys.svelte";
  import BoardTools from "./BoardTools.svelte";
  import CaseList from "./CaseList.svelte";
  import Inspector from "./Inspector.svelte";
  import Stats from "./Stats.svelte";
  import TreeCanvas from "./TreeCanvas.svelte";

  const editor = new TreeEditor();
  const keys = new TreeKeys(editor);
</script>

<EditorShell
  {editor}
  {keys}
  title="Classification Tree Editor"
  mode={editor.mode}
  helpSections={HELP_SECTIONS}
>
  {#snippet icon()}
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle
        cx="11"
        cy="3"
        r="2.2"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
      />
      <rect
        x="5"
        y="7"
        width="12"
        height="5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
      />
      <path
        d="M11 5.2V7M9 12L4 19M13 12l5 7M4 19h14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
      />
    </svg>
  {/snippet}

  {#snippet board()}
    <BoardTools {editor} />
    <TreeCanvas {editor} />
    <StatusBar
      {keys}
      hints={HINTS[editor.mode]}
      mode={{
        label: editor.mode === "tree" ? "TREE" : "GRID",
        active: editor.mode === "grid",
        title: "Switch between tree and test grid (t)",
        onclick: () => editor.toggleMode(),
      }}
    />
    <Stats {editor} />
    <CaseList {editor} />
  {/snippet}

  {#snippet inspector()}
    <Inspector {editor} />
  {/snippet}
</EditorShell>
