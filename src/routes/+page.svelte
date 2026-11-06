<script lang="ts">
  import { resolve } from "$app/paths";
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
  </ul>
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

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  a {
    color: var(--accent);
  }
</style>
