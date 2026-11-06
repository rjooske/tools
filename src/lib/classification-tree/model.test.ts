import { describe, expect, it } from "vitest";
import { examples } from "./examples";
import {
  allCombinations,
  blankTree,
  exportTree,
  generateAll,
  generateMinimal,
  indexTree,
  leavesOf,
  minTests,
  newTest,
  parseTree,
  prune,
  rowInfo,
  sortTests,
  type Tree,
} from "./model";

const [listSearch, shapes, mortgage] = examples();

describe("coverage arithmetic", () => {
  it.each<[string, Tree, number, number]>([
    ["list search", listSearch, 6, 12],
    ["shapes", shapes, 6, 6],
    ["mortgage", mortgage, 12, 12],
  ])("%s", (_, tree, min, all) => {
    expect(minTests(tree.root)).toBe(min);
    expect(allCombinations(tree.root)).toBe(all);
  });

  it("generators produce as many rows as the counts predict", () => {
    for (const tree of [listSearch, shapes, mortgage]) {
      expect(generateMinimal(tree.root)).toHaveLength(minTests(tree.root));
      expect(generateAll(tree.root)).toHaveLength(allCombinations(tree.root));
    }
  });

  it("the minimal set covers every leaf without conflicts", () => {
    for (const tree of [listSearch, shapes, mortgage]) {
      const rows = generateMinimal(tree.root);
      const used = new Set(rows.flat());
      expect(leavesOf(tree).every((l) => used.has(l.id))).toBe(true);
      const entries = indexTree(tree);
      for (const picks of rows) {
        expect(rowInfo(entries, newTest(picks)).conflicts).toEqual([]);
      }
    }
  });
});

describe("rowInfo", () => {
  it("reports two classes of one classification as a conflict", () => {
    const [first, second] = leavesOf(shapes);
    const info = rowInfo(indexTree(shapes), newTest([first.id, second.id]));
    expect(info.conflicts).toEqual(["“size” has two classes: small and large"]);
  });

  it("expands a deep leaf into its ancestors, root first", () => {
    const scalene = leavesOf(shapes).at(-1)!;
    const info = rowInfo(indexTree(shapes), newTest([scalene.id]));
    expect(info.pairs.map(([c, k]) => [c.node.name, k.node.name])).toEqual([
      ["size", "large"],
      ["shape", "triangle"],
      ["type", "scalene"],
    ]);
  });
});

describe("prune", () => {
  it("drops picks of classes that stopped being leaves", () => {
    const tree = blankTree();
    const leaf = leavesOf(tree)[0];
    tree.tests = [newTest([leaf.id])];
    leaf.children.push(blankTree().root.children[0]);
    prune(tree);
    expect(tree.tests[0].picks).toEqual([]);
  });
});

describe("sortTests", () => {
  it("sorts by tree order and puts empty rows last", () => {
    const tree = blankTree();
    const [a, b] = leavesOf(tree);
    tree.tests = [newTest(), newTest([b.id]), newTest([a.id])];
    sortTests(tree, "tree");
    expect(tree.tests.map((t) => t.picks)).toEqual([[a.id], [b.id], []]);
  });
});

describe("parseTree", () => {
  it("round-trips an export with fresh ids", () => {
    const result = parseTree(exportTree(listSearch));
    if ("error" in result) throw new Error(result.error);
    const tree = result.doc;
    expect(tree.name).toBe("List search (example) (imported)");
    expect(tree.id).not.toBe(listSearch.id);
    expect(tree.tests).toHaveLength(listSearch.tests.length);
    expect(tree.tests[0].picks[0]).not.toBe(listSearch.tests[0].picks[0]);
    expect(leavesOf(tree).map((l) => l.name)).toEqual(
      leavesOf(listSearch).map((l) => l.name),
    );
  });

  it("explains invalid input", () => {
    expect(parseTree("{")).toHaveProperty("error");
    expect(parseTree('{"root":{}}')).toHaveProperty("error");
  });
});
