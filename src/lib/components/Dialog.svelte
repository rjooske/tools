<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    labelledby,
    wide = false,
    onclose,
    children,
  }: {
    labelledby: string;
    wide?: boolean;
    onclose: () => void;
    children: Snippet;
  } = $props();

  function closeOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) onclose();
  }
</script>

<!-- Esc is the keyboard equivalent of clicking the backdrop; the owner handles it. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="overlay" onclick={closeOnBackdrop}>
  <div
    class="dialog"
    class:wide
    role="dialog"
    aria-modal="true"
    aria-labelledby={labelledby}
  >
    {@render children()}
  </div>
</div>

<style lang="scss">
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--ink) 35%, transparent);
    padding: max(16px, env(safe-area-inset-top, 0px))
      max(16px, env(safe-area-inset-right, 0px))
      max(16px, env(safe-area-inset-bottom, 0px))
      max(16px, env(safe-area-inset-left, 0px));
  }

  .dialog {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    width: min(640px, 100%);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    &.wide {
      width: min(780px, 100%);
      max-height: 100%;
      overflow: auto;
    }

    :global(h2) {
      margin: 0;
      font-size: 16px;
    }
  }
</style>
