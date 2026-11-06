import { describe, expect, it } from "vitest";
import { examples } from "./examples";
import {
  analyse,
  expandedRules,
  exportTable,
  findMissing,
  findOverlaps,
  newAction,
  newCondition,
  newRule,
  nextEntry,
  parseTable,
  prune,
  reducedRules,
  ruleCount,
  sortRules,
  totalCombinations,
  type DecisionTable,
} from "./model";

const [basics, technique, mortgage] = examples();

function tableOf(...sizes: number[]): DecisionTable {
  return {
    id: "t",
    name: "t",
    notes: "",
    independent: true,
    conditions: sizes.map((n, i) =>
      newCondition(
        `c${i}`,
        Array.from({ length: n }, (_, v) => `v${v}`),
      ),
    ),
    actions: [newAction("a"), newAction("b")],
    rules: [],
  };
}

/** Entries by value index per condition, with null as don't care. */
function entries(table: DecisionTable, ...picks: (number | null)[]) {
  return Object.fromEntries(
    picks.flatMap((v, i) => {
      if (v === null) return [];
      const condition = table.conditions[i];
      return [[condition.id, condition.values[v].id]];
    }),
  );
}

const rule = (
  table: DecisionTable,
  picks: (number | null)[],
  action: "a" | "b" | null = "a",
) => {
  const id = table.actions[action === "a" ? 0 : 1].id;
  return newRule(entries(table, ...picks), action ? [id] : []);
};

describe("completeness", () => {
  it("counts each don't care for every value of its condition", () => {
    expect(basics.rules.map((r) => ruleCount(basics, r))).toEqual([4, 2, 1, 1]);
  });

  it("uses the product of value counts for multi-valued conditions", () => {
    const table = tableOf(2, 3, 4);
    expect(totalCombinations(table)).toBe(24);
    expect(ruleCount(table, rule(table, [0, null, null]))).toBe(12);
  });

  it("accepts the complete tables from the slides", () => {
    for (const table of [basics, technique]) {
      const { coverage } = analyse(table);
      expect(coverage?.missing.count).toBe(0);
      expect(coverage?.overlaps).toEqual([]);
    }
    expect(totalCombinations(technique)).toBe(16);
  });

  it("finds the rule slide 30 is missing", () => {
    const table = { ...basics, rules: basics.rules.slice(0, 3) };
    const { count, cubes } = findMissing(table);
    expect(count).toBe(1);
    expect(cubes).toEqual([{ ...basics.rules[3].entries }]);
  });

  it("reports a table with no rules as one wide-open gap", () => {
    const table = tableOf(3, 3, 3, 3);
    expect(findMissing(table)).toMatchObject({ count: 81, cubes: [{}] });
  });

  it("agrees with enumeration on a mixed table", () => {
    const table = tableOf(2, 3, 2);
    table.rules = [rule(table, [0, null, 1]), rule(table, [null, 2, null])];
    // 3 combinations from r1 + 4 from r2, sharing 1.
    expect(findMissing(table).count).toBe(12 - 6);
  });

  it("stays fast on a table too large to enumerate", () => {
    const table = tableOf(...Array<number>(40).fill(2));
    table.rules = [rule(table, [0, ...Array<null>(39).fill(null)])];
    expect(findMissing(table).count).toBe(2 ** 39);
  });
});

describe("findOverlaps", () => {
  it("tells contradictions from redundancy", () => {
    const table = tableOf(2, 2);
    table.rules = [
      rule(table, [0, null], "a"),
      rule(table, [0, 0], "a"),
      rule(table, [null, 0], "b"),
    ];
    expect(
      findOverlaps(table).map((o) => [
        table.rules.indexOf(o.first),
        table.rules.indexOf(o.second),
        o.contradiction,
      ]),
    ).toEqual([
      [0, 1, false],
      [0, 2, true],
      [1, 2, true],
    ]);
  });
});

describe("analyse", () => {
  it("skips the checks that need independent conditions", () => {
    const analysis = analyse(mortgage);
    expect(analysis.coverage).toBeNull();
    expect(analysis.noAction).toEqual([]);
    expect(analysis.unusedActions).toEqual([]);
  });

  it("reports rules without actions and unused actions", () => {
    const table = tableOf(2);
    table.rules = [rule(table, [0], null), rule(table, [1], "a")];
    const analysis = analyse(table);
    expect(analysis.noAction).toEqual([table.rules[0]]);
    expect(analysis.unusedActions).toEqual([table.actions[1]]);
  });
});

describe("reducedRules and expandedRules", () => {
  it("expands don't cares and reduces back", () => {
    const expanded = { ...basics, rules: expandedRules(basics) };
    expect(expanded.rules).toHaveLength(8);
    expect(analyse(expanded).coverage?.missing.count).toBe(0);

    const reduced = reducedRules(expanded);
    expect(reduced).toHaveLength(4);
    expect(analyse({ ...basics, rules: reduced }).coverage).toEqual({
      missing: { cubes: [], count: 0, truncated: false },
      overlaps: [],
    });
  });

  it("merges only when every value of the condition is listed", () => {
    const table = tableOf(3);
    table.rules = [rule(table, [0]), rule(table, [1])];
    expect(reducedRules(table)).toHaveLength(2);
    table.rules.push(rule(table, [2]));
    expect(reducedRules(table)).toHaveLength(1);
  });

  it("leaves rules with different actions alone", () => {
    const table = tableOf(2);
    table.rules = [rule(table, [0], "a"), rule(table, [1], "b")];
    expect(reducedRules(table)).toHaveLength(2);
  });

  it("drops a rule another rule already covers, and one of two duplicates", () => {
    const table = tableOf(2, 2);
    const general = rule(table, [0, null]);
    const duplicated = rule(table, [1, 0]);
    table.rules = [
      rule(table, [0, 1]),
      general,
      duplicated,
      rule(table, [1, 0]),
    ];
    expect(reducedRules(table).map((r) => r.id)).toEqual([
      general.id,
      duplicated.id,
    ]);
  });

  it("does not modify the table", () => {
    const table = tableOf(2);
    table.rules = [rule(table, [0]), rule(table, [1])];
    reducedRules(table);
    expect(table.rules.every((r) => Object.keys(r.entries).length)).toBe(true);
  });
});

describe("nextEntry", () => {
  it("cycles through the values and don't care", () => {
    const condition = newCondition("c", ["T", "F"]);
    const [t, f] = condition.values.map((v) => v.id);
    expect(nextEntry(condition, undefined, 1)).toBe(t);
    expect(nextEntry(condition, t, 1)).toBe(f);
    expect(nextEntry(condition, f, 1)).toBeUndefined();
    expect(nextEntry(condition, t, -1)).toBeUndefined();
  });
});

describe("prune", () => {
  it("drops entries of deleted values and conditions, and deleted actions", () => {
    const table = tableOf(2, 2);
    table.rules = [rule(table, [0, 1], "b")];
    table.conditions[0].values.shift();
    table.conditions.pop();
    table.actions.pop();
    prune(table);
    expect(table.rules[0].entries).toEqual({});
    expect(table.rules[0].actions).toEqual([]);
  });
});

describe("sortRules", () => {
  it("orders by dominant condition with don't cares last", () => {
    const table = tableOf(2, 2);
    const [a, b, c] = [
      rule(table, [null, 0]),
      rule(table, [1, 0]),
      rule(table, [0, 1]),
    ];
    table.rules = [a, b, c];
    sortRules(table, "conditions");
    expect(table.rules).toEqual([c, b, a]);
  });
});

describe("parseTable", () => {
  it("round-trips an export with fresh ids", () => {
    const result = parseTable(exportTable(mortgage));
    if ("error" in result) throw new Error(result.error);
    const table = result.doc;
    expect(table.name).toBe("Mortgage (example) (imported)");
    expect(table.independent).toBe(false);
    expect(table.conditions[0].id).not.toBe(mortgage.conditions[0].id);
    expect(table.rules.map((r) => ruleCount(table, r))).toEqual(
      mortgage.rules.map((r) => ruleCount(mortgage, r)),
    );
    expect(table.rules.map((r) => r.actions.length)).toEqual(
      mortgage.rules.map((r) => r.actions.length),
    );
  });

  it("explains invalid input", () => {
    expect(parseTable("{")).toHaveProperty("error");
    expect(parseTable('{"conditions":[]}')).toHaveProperty("error");
    expect(
      parseTable('{"conditions":[{"name":"c","values":[]}],"actions":[]}'),
    ).toHaveProperty("error");
  });
});
