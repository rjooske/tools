import type { ParseResult } from "../document-editor.svelte";
import { label, uid } from "../util";

export type ConditionValue = { id: string; name: string };
export type Condition = { id: string; name: string; values: ConditionValue[] };
export type Action = { id: string; name: string };
/** Condition ids to value ids. A condition left out is a don't care. */
export type Entries = Record<string, string>;
export type Rule = { id: string; entries: Entries; actions: string[] };
export type DecisionTable = {
  id: string;
  name: string;
  notes: string;
  /** The completeness and overlap checks only hold for independent conditions. */
  independent: boolean;
  conditions: Condition[];
  actions: Action[];
  rules: Rule[];
};

export type SortOrder = "conditions" | "actions" | "reverse";

export type Overlap = { first: Rule; second: Rule; contradiction: boolean };
export type Missing = {
  /** Uncovered combinations, compacted with don't cares. */
  cubes: Entries[];
  /** Combinations with no rule, which can exceed what `cubes` lists. */
  count: number;
  truncated: boolean;
};
export type Analysis = {
  total: number;
  /** Null when the conditions are dependent, so these checks don't apply. */
  coverage: { missing: Missing; overlaps: Overlap[] } | null;
  noAction: Rule[];
  unusedActions: Action[];
};

export const MAX_GENERATED_RULES = 400;
export const DONT_CARE = "-";

export const conditionValue = (name: string): ConditionValue => ({
  id: uid(),
  name,
});

export const newCondition = (
  name = "new condition",
  values = ["T", "F"],
): Condition => ({ id: uid(), name, values: values.map(conditionValue) });

export const newAction = (name = "new action"): Action => ({ id: uid(), name });

export const newRule = (
  entries: Entries = {},
  actions: string[] = [],
): Rule => ({ id: uid(), entries, actions });

export const blankTable = (): DecisionTable => ({
  id: uid(),
  name: "Untitled table",
  notes: "",
  independent: true,
  conditions: [newCondition("condition 1")],
  actions: [newAction("action 1")],
  rules: [],
});

/** Drops entries and actions whose condition, value or action was deleted. */
export function prune(table: DecisionTable) {
  const conditions = new Map(
    table.conditions.map((c) => [c.id, new Set(c.values.map((v) => v.id))]),
  );
  const actions = new Set(table.actions.map((a) => a.id));
  for (const rule of table.rules) {
    for (const [conditionId, valueId] of Object.entries(rule.entries)) {
      if (!conditions.get(conditionId)?.has(valueId)) {
        delete rule.entries[conditionId];
      }
    }
    rule.actions = rule.actions.filter((id) => actions.has(id));
  }
}

/** The next entry in the cycle of a condition's values, then don't care. */
export function nextEntry(
  condition: Condition,
  current: string | undefined,
  dir: -1 | 1,
) {
  const order = [...condition.values.map((v) => v.id), undefined];
  const i = order.indexOf(current);
  return order[(i + dir + order.length) % order.length];
}

export function valueName(condition: Condition, rule: Rule) {
  const id = rule.entries[condition.id];
  if (id === undefined) return DONT_CARE;
  return label(condition.values.find((v) => v.id === id)?.name);
}

/** How many combinations a rule stands for: each don't care multiplies it. */
export const ruleCount = (table: DecisionTable, rule: Rule) =>
  table.conditions.reduce(
    (n, c) => (c.id in rule.entries ? n : n * c.values.length),
    1,
  );

export const totalCombinations = (table: DecisionTable) =>
  table.conditions.reduce((n, c) => n * c.values.length, 1);

function matchSameCombination(
  table: DecisionTable,
  a: Entries,
  b: Entries,
): boolean {
  return table.conditions.every(
    ({ id }) => !(id in a) || !(id in b) || a[id] === b[id],
  );
}

const sameActions = (a: Rule, b: Rule) =>
  a.actions.length === b.actions.length &&
  a.actions.every((id) => b.actions.includes(id));

export function findOverlaps(table: DecisionTable): Overlap[] {
  const { rules } = table;
  const overlaps: Overlap[] = [];
  rules.forEach((first, i) => {
    for (const second of rules.slice(i + 1)) {
      if (matchSameCombination(table, first.entries, second.entries)) {
        overlaps.push({
          first,
          second,
          contradiction: !sameActions(first, second),
        });
      }
    }
  });
  return overlaps;
}

/**
 * Walks the combinations condition by condition, splitting only where rules
 * differ. A branch no rule reaches is one missing cube, however many
 * combinations it holds, so a sparse table doesn't need enumerating.
 */
export function findMissing(table: DecisionTable): Missing {
  const { conditions } = table;
  const missing: Missing = { cubes: [], count: 0, truncated: false };

  const remaining = [1];
  for (let i = conditions.length - 1; i >= 0; i--) {
    remaining.unshift(remaining[0] * conditions[i].values.length);
  }

  const walk = (
    i: number,
    rules: Rule[],
    entries: Entries,
    multiplier: number,
  ) => {
    if (!rules.length) {
      missing.count += remaining[i] * multiplier;
      if (missing.cubes.length < MAX_GENERATED_RULES)
        missing.cubes.push(entries);
      else missing.truncated = true;
      return;
    }
    if (i === conditions.length) return;

    const condition = conditions[i];
    if (rules.every((r) => !(condition.id in r.entries))) {
      walk(i + 1, rules, entries, multiplier * condition.values.length);
      return;
    }
    for (const value of condition.values) {
      walk(
        i + 1,
        rules.filter(
          (r) =>
            !(condition.id in r.entries) ||
            r.entries[condition.id] === value.id,
        ),
        { ...entries, [condition.id]: value.id },
        multiplier,
      );
    }
  };
  walk(0, table.rules, {}, 1);
  return missing;
}

export function analyse(table: DecisionTable): Analysis {
  const used = new Set(table.rules.flatMap((r) => r.actions));
  return {
    total: totalCombinations(table),
    coverage: table.independent
      ? { missing: findMissing(table), overlaps: findOverlaps(table) }
      : null,
    noAction: table.rules.filter((r) => !r.actions.length),
    unusedActions: table.actions.filter((a) => !used.has(a.id)),
  };
}

const cloneRule = (rule: Rule): Rule => ({
  id: rule.id,
  entries: { ...rule.entries },
  actions: [...rule.actions],
});

/** Rules that differ only in `conditionId` share a key, if actions match too. */
function mergeKey(table: DecisionTable, rule: Rule, conditionId: string) {
  const entries = table.conditions
    .filter((c) => c.id !== conditionId)
    .map((c) => rule.entries[c.id] ?? DONT_CARE);
  return JSON.stringify([entries, [...rule.actions].sort()]);
}

/** Merges rules listing every value of a condition into one don't care. */
function mergeOnce(table: DecisionTable, rules: Rule[]): Rule[] | null {
  for (const condition of table.conditions) {
    const groups = new Map<string, Rule[]>();
    for (const rule of rules) {
      if (!(condition.id in rule.entries)) continue;
      const key = mergeKey(table, rule, condition.id);
      groups.set(key, [...(groups.get(key) ?? []), rule]);
    }
    for (const group of groups.values()) {
      const values = new Set(group.map((r) => r.entries[condition.id]));
      if (values.size !== condition.values.length) continue;
      const [kept, ...merged] = group;
      delete kept.entries[condition.id];
      return rules.filter((r) => !merged.includes(r));
    }
  }
  return null;
}

/** Whether `general` covers everything `specific` does, with the same actions. */
function subsumes(general: Rule, specific: Rule) {
  return (
    sameActions(general, specific) &&
    Object.entries(general.entries).every(
      ([id, value]) => specific.entries[id] === value,
    )
  );
}

/** The same behaviour in fewer rules. Contradicting rules are left alone. */
export function reducedRules(table: DecisionTable): Rule[] {
  let rules = table.rules.map(cloneRule);
  for (;;) {
    const merged = mergeOnce(table, rules);
    if (merged) {
      rules = merged;
      continue;
    }
    const kept = rules.filter(
      (rule, i) =>
        !rules.some(
          (other, j) =>
            i !== j &&
            subsumes(other, rule) &&
            (j < i || !subsumes(rule, other)),
        ),
    );
    if (kept.length === rules.length) return rules;
    rules = kept;
  }
}

/** One rule per combination, in place of don't cares. */
export function expandedRules(table: DecisionTable): Rule[] {
  return table.rules.flatMap((rule) =>
    table.conditions
      .filter((c) => !(c.id in rule.entries))
      .reduce<Entries[]>(
        (entries, condition) =>
          entries.flatMap((e) =>
            condition.values.map((v) => ({ ...e, [condition.id]: v.id })),
          ),
        [{ ...rule.entries }],
      )
      .map((entries) => newRule(entries, [...rule.actions])),
  );
}

export function sortRules(table: DecisionTable, how: SortOrder) {
  const { rules, conditions, actions } = table;
  if (how === "reverse") {
    rules.reverse();
  } else if (how === "conditions") {
    const rank = (rule: Rule, condition: Condition) => {
      const id = rule.entries[condition.id];
      if (id === undefined) return condition.values.length;
      return condition.values.findIndex((v) => v.id === id);
    };
    rules.sort((a, b) => {
      for (const condition of conditions) {
        const d = rank(a, condition) - rank(b, condition);
        if (d) return d;
      }
      return 0;
    });
  } else {
    const firstAction = (rule: Rule) => {
      const i = actions.findIndex((a) => rule.actions.includes(a.id));
      return i < 0 ? actions.length : i;
    };
    rules.sort((a, b) => firstAction(a) - firstAction(b));
  }
}

export function exportTable(table: DecisionTable) {
  const { name, notes, independent, conditions, actions, rules } = table;
  return JSON.stringify(
    { name, notes, independent, conditions, actions, rules },
    null,
    2,
  );
}

type TableJson = {
  name?: unknown;
  notes?: unknown;
  independent?: unknown;
  conditions: Condition[];
  actions: Action[];
  rules?: unknown;
};

const isNamed = (o: unknown) =>
  !!o && typeof (o as { name: unknown }).name === "string";

const isCondition = (c: unknown) => {
  const values = (c as Condition | null)?.values;
  return (
    isNamed(c) &&
    Array.isArray(values) &&
    values.length > 0 &&
    values.every(isNamed)
  );
};

function isTableJson(o: unknown): o is TableJson {
  const table = o as TableJson | null;
  return (
    Array.isArray(table?.conditions) &&
    table.conditions.every(isCondition) &&
    Array.isArray(table.actions) &&
    table.actions.every(isNamed)
  );
}

/** Imported JSON may repeat ids already in the store, so every id is replaced. */
function withFreshIds(json: TableJson) {
  const ids = new Map<string, string>();
  const fresh = (id: string) => {
    const next = uid();
    ids.set(id, next);
    return next;
  };
  const conditions = json.conditions.map((c) => ({
    id: fresh(c.id),
    name: c.name,
    values: c.values.map((v) => ({ id: fresh(v.id), name: v.name })),
  }));
  const actions = json.actions.map((a) => ({ id: fresh(a.id), name: a.name }));
  const rawRules = Array.isArray(json.rules) ? (json.rules as Rule[]) : [];
  const rules = rawRules.map((rule) => {
    const entries = Object.entries(rule.entries ?? {}).flatMap(([c, v]) => {
      const condition = ids.get(c);
      const value = ids.get(v);
      return condition && value ? [[condition, value]] : [];
    });
    return newRule(
      Object.fromEntries(entries),
      (rule.actions ?? []).flatMap((a) => ids.get(a) ?? []),
    );
  });
  return { conditions, actions, rules };
}

export function parseTable(text: string): ParseResult<DecisionTable> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      error: "That is not valid JSON. Check for a missing bracket or comma.",
    };
  }
  if (!isTableJson(json)) {
    return {
      error:
        'The JSON needs "conditions" with "name" and "values", and "actions" with "name".',
    };
  }
  return {
    doc: {
      id: uid(),
      name:
        typeof json.name === "string"
          ? `${json.name} (imported)`
          : "Imported table",
      notes: typeof json.notes === "string" ? json.notes : "",
      independent: json.independent !== false,
      ...withFreshIds(json),
    },
  };
}
