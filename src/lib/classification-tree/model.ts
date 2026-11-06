export type Class = { id: string; name: string; children: Classification[] };
export type Classification = { id: string; name: string; classes: Class[] };
export type Root = { id: "root"; children: Classification[] };
export type TestCase = { id: string; picks: string[] };
export type Tree = {
  id: string;
  name: string;
  notes: string;
  root: Root;
  tests: TestCase[];
};
export type Store = { trees: Tree[]; currentId: string };

export type RootEntry = {
  kind: "root";
  node: Root;
  parent: null;
  order: number;
};
export type ClassificationEntry = {
  kind: "classification";
  node: Classification;
  parent: RootEntry | ClassEntry;
  order: number;
};
export type ClassEntry = {
  kind: "class";
  node: Class;
  parent: ClassificationEntry;
  order: number;
};
export type Entry = RootEntry | ClassificationEntry | ClassEntry;
export type TreeIndex = Map<string, Entry>;

export type RowInfo = {
  pairs: [ClassificationEntry, ClassEntry][];
  conflicts: string[];
};

export type SortOrder = "tree" | "fewest" | "most" | "conflicts" | "reverse";

export const ROOT_ID = "root";
export const ALL_COMBINATIONS_CAP = 400;

export const uid = () => Math.random().toString(36).slice(2, 10);

export const classification = (
  name: string,
  classes: Class[] = [],
): Classification => ({ id: uid(), name, classes });

export const leafClass = (
  name: string,
  children: Classification[] = [],
): Class => ({ id: uid(), name, children });

export const newClassification = (name = "new aspect") =>
  classification(name, [leafClass("class 1"), leafClass("class 2")]);

export const blankTree = (): Tree => ({
  id: uid(),
  name: "Untitled tree",
  notes: "",
  root: { id: ROOT_ID, children: [newClassification("aspect")] },
  tests: [],
});

export const newTest = (picks: string[] = []): TestCase => ({
  id: uid(),
  picks,
});

export const label = (s: string | undefined) =>
  s && s.trim() ? s : "(unnamed)";

export function indexTree(tree: Tree): TreeIndex {
  const entries: TreeIndex = new Map();
  const root: RootEntry = {
    kind: "root",
    node: tree.root,
    parent: null,
    order: -1,
  };
  entries.set(root.node.id, root);
  let order = 0;

  const walk = (parent: RootEntry | ClassEntry) => {
    for (const node of parent.node.children) {
      const entry: ClassificationEntry = {
        kind: "classification",
        node,
        parent,
        order: order++,
      };
      entries.set(node.id, entry);
      for (const child of node.classes) {
        const classEntry: ClassEntry = {
          kind: "class",
          node: child,
          parent: entry,
          order: order++,
        };
        entries.set(child.id, classEntry);
        walk(classEntry);
      }
    }
  };
  walk(root);
  return entries;
}

export function leavesOf(tree: Tree): Class[] {
  const out: Class[] = [];
  const walk = (node: Root | Class) => {
    for (const c of node.children) {
      for (const k of c.classes) {
        if (k.children.length) walk(k);
        else out.push(k);
      }
    }
  };
  walk(tree.root);
  return out;
}

export const coveredLeaves = (tree: Tree) =>
  new Set(tree.tests.flatMap((t) => t.picks));

/** Drops picks of classes that are no longer leaves. */
export function prune(tree: Tree) {
  const leaves = new Set(leavesOf(tree).map((l) => l.id));
  for (const test of tree.tests) {
    test.picks = test.picks.filter((id) => leaves.has(id));
  }
}

export function togglePick(test: TestCase, leafId: string) {
  const i = test.picks.indexOf(leafId);
  if (i >= 0) test.picks.splice(i, 1);
  else test.picks.push(leafId);
}

function swapWithNeighbour<T>(list: T[], item: T, dir: -1 | 1) {
  const i = list.indexOf(item);
  const j = i + dir;
  if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
}

export function moveNode(entry: ClassificationEntry | ClassEntry, dir: -1 | 1) {
  if (entry.kind === "class") {
    swapWithNeighbour(entry.parent.node.classes, entry.node, dir);
  } else {
    swapWithNeighbour(entry.parent.node.children, entry.node, dir);
  }
}

export function removeNode(entry: ClassificationEntry | ClassEntry) {
  if (entry.kind === "class") {
    const { classes } = entry.parent.node;
    classes.splice(classes.indexOf(entry.node), 1);
  } else {
    const { children } = entry.parent.node;
    children.splice(children.indexOf(entry.node), 1);
  }
}

export function pathOf(entry: Entry) {
  const names: string[] = [];
  for (let e: Entry = entry; e.kind !== "root"; e = e.parent) {
    names.unshift(label(e.node.name));
  }
  return names.join(" › ");
}

/** The classification/class pairs a leaf implies, from the root down. */
function pairsOf(leaf: ClassEntry) {
  const out: [ClassificationEntry, ClassEntry][] = [];
  let k: ClassEntry | null = leaf;
  while (k) {
    const c: ClassificationEntry = k.parent;
    out.unshift([c, k]);
    k = c.parent.kind === "class" ? c.parent : null;
  }
  return out;
}

export function rowInfo(entries: TreeIndex, test: TestCase): RowInfo {
  const chosen = new Map<ClassificationEntry, ClassEntry>();
  const conflicts: string[] = [];

  for (const id of test.picks) {
    const leaf = entries.get(id);
    if (leaf?.kind !== "class") continue;
    for (const [c, k] of pairsOf(leaf)) {
      const existing = chosen.get(c);
      if (existing && existing !== k) {
        const msg = `“${label(c.node.name)}” has two classes: ${label(existing.node.name)} and ${label(k.node.name)}`;
        if (!conflicts.includes(msg)) conflicts.push(msg);
      } else {
        chosen.set(c, k);
      }
    }
  }

  const pairs = [...chosen].sort((a, b) => a[0].order - b[0].order);
  return { pairs, conflicts };
}

const minOfClassification = (c: Classification): number =>
  c.classes.reduce((sum, k) => sum + minTests(k), 0);

/** Fewest test cases that use every leaf under `node` at least once. */
export const minTests = (node: Root | Class): number =>
  node.children.length
    ? Math.max(0, ...node.children.map(minOfClassification))
    : 1;

const allOfClassification = (c: Classification): number =>
  c.classes.reduce((sum, k) => sum + allCombinations(k), 0);

/** Number of valid combinations of leaves under `node`. */
export const allCombinations = (node: Root | Class): number =>
  node.children.length
    ? node.children.reduce((p, c) => p * (allOfClassification(c) || 1), 1)
    : 1;

export function generateMinimal(node: Root | Class): string[][] {
  if (!node.children.length) return [[node.id]];
  const lists = node.children
    .map((c) => c.classes.flatMap(generateMinimal))
    .filter((l) => l.length);
  const n = Math.max(0, ...lists.map((l) => l.length));
  const out: string[][] = [];
  for (let j = 0; j < n; j++) {
    out.push(lists.flatMap((l) => l[Math.min(j, l.length - 1)]));
  }
  return out;
}

export function generateAll(node: Root | Class): string[][] {
  if (!node.children.length) return [[node.id]];
  const lists = node.children
    .map((c) => c.classes.flatMap(generateAll))
    .filter((l) => l.length);
  return lists.reduce<string[][]>(
    (acc, l) => acc.flatMap((a) => l.map((b) => a.concat(b))),
    [[]],
  );
}

export function sortTests(tree: Tree, how: SortOrder) {
  const entries = indexTree(tree);
  const column = new Map(leavesOf(tree).map((l, i) => [l.id, i]));
  const columns = (t: TestCase) =>
    t.picks.map((p) => column.get(p) ?? 0).sort((a, b) => a - b);
  const size = (t: TestCase) => rowInfo(entries, t).pairs.length;
  const clean = (t: TestCase) => (rowInfo(entries, t).conflicts.length ? 0 : 1);

  switch (how) {
    case "reverse":
      tree.tests.reverse();
      break;
    case "tree":
      tree.tests.sort((a, b) => {
        const ca = columns(a);
        const cb = columns(b);
        if (!ca.length || !cb.length) {
          return (ca.length ? 0 : 1) - (cb.length ? 0 : 1);
        }
        for (let i = 0; i < Math.min(ca.length, cb.length); i++) {
          if (ca[i] !== cb[i]) return ca[i] - cb[i];
        }
        return ca.length - cb.length;
      });
      break;
    case "fewest":
      tree.tests.sort((a, b) => size(a) - size(b));
      break;
    case "most":
      tree.tests.sort((a, b) => size(b) - size(a));
      break;
    case "conflicts":
      tree.tests.sort((a, b) => clean(a) - clean(b));
      break;
  }
}

export function exportTree(tree: Tree) {
  const { name, notes, root, tests } = tree;
  return JSON.stringify({ name, notes, root, tests }, null, 2);
}

type TreeJson = {
  name?: unknown;
  notes?: unknown;
  root: Root;
  tests?: unknown;
};

function isClassification(c: unknown): c is Classification {
  const v = c as Classification | null;
  return (
    !!v &&
    typeof v.name === "string" &&
    Array.isArray(v.classes) &&
    v.classes.every(isClass)
  );
}

function isClass(k: unknown): k is Class {
  const v = k as Class | null;
  return (
    !!v &&
    typeof v.name === "string" &&
    Array.isArray(v.children) &&
    v.children.every(isClassification)
  );
}

function isTreeJson(o: unknown): o is TreeJson {
  const v = o as TreeJson | null;
  return (
    !!v &&
    !!v.root &&
    Array.isArray(v.root.children) &&
    v.root.children.every(isClassification)
  );
}

/** Imported JSON may repeat ids already in the store, so every id is replaced. */
function reId(json: TreeJson): TestCase[] {
  const classIds = new Map<string, string>();
  const walk = (node: Root | Class) => {
    for (const c of node.children) {
      c.id = uid();
      for (const k of c.classes) {
        const id = uid();
        classIds.set(k.id, id);
        k.id = id;
        walk(k);
      }
    }
  };
  walk(json.root);
  json.root.id = ROOT_ID;

  const tests = Array.isArray(json.tests) ? (json.tests as TestCase[]) : [];
  return tests.map((t) =>
    newTest(
      (t.picks ?? []).flatMap((p) => {
        const id = classIds.get(p);
        return id ? [id] : [];
      }),
    ),
  );
}

export function parseTree(text: string): { tree: Tree } | { error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      error: "That is not valid JSON. Check for a missing bracket or comma.",
    };
  }
  if (!isTreeJson(json)) {
    return {
      error:
        'The JSON needs a "root" with "children" classifications, each with "name" and "classes".',
    };
  }
  const tests = reId(json);
  return {
    tree: {
      id: uid(),
      name:
        typeof json.name === "string"
          ? `${json.name} (imported)`
          : "Imported tree",
      notes: typeof json.notes === "string" ? json.notes : "",
      root: json.root,
      tests,
    },
  };
}
