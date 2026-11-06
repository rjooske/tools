<script lang="ts" module>
  export type Stat = {
    label: string;
    value: string | number;
    tone?: "good" | "bad" | "";
    tip?: string;
  };
</script>

<script lang="ts">
  let { stats }: { stats: Stat[] } = $props();
</script>

<div class="stats">
  {#each stats as stat (stat.label)}
    <span class="stat {stat.tone ?? ''}" title={stat.tip}>
      {stat.label} <b>{stat.value}</b>
    </span>
  {/each}
</div>

<style lang="scss">
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .stat {
    display: flex;
    align-items: baseline;
    gap: 7px;
    padding: 5px 10px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--line);
    font-size: 12.5px;
    color: var(--muted);

    b {
      color: var(--ink);
      font-family: var(--font-mono);
      font-weight: 500;
      font-variant-numeric: tabular-nums;
    }

    &.good {
      border-color: var(--ok);

      b {
        color: var(--ok);
      }
    }

    &.bad {
      border-color: var(--danger);
      background: var(--danger-soft);

      b {
        color: var(--danger);
      }
    }
  }
</style>
