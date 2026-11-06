import { tick } from "svelte";
import { examples } from "./examples";
import { layoutTree, type Measure } from "./layout";
import {
  ALL_COMBINATIONS_CAP,
  allCombinations,
  blankTree,
  coveredLeaves,
  exportTree,
  generateAll,
  generateMinimal,
  indexTree,
  label,
  leafClass,
  leavesOf,
  newClassification,
  newTest,
  moveNode,
  prune,
  removeNode,
  ROOT_ID,
  rowInfo,
  sortTests,
  togglePick,
  uid,
  type SortOrder,
  type Store,
  type Tree,
} from "./model";

export type Mode = "tree" | "grid";
export type Dialog = "help" | "io";

const STORE_KEY = "ct-editor-v1";
const DOTS_KEY = "ct-editor-dots";
const HISTORY_LIMIT = 150;
/** Must match --font-ui, or node boxes won't fit their labels. */
const FONT = "system-ui, sans-serif";

export const IO_BUTTON_ID = "btn-io";

function loadStore(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    if (s && Array.isArray(s.trees) && s.trees.length) return s;
  } catch {
    // Unavailable or corrupt storage falls through to the examples.
  }
  const trees = examples();
  return { trees, currentId: trees[0].id };
}

function loadShowDots() {
  try {
    return localStorage.getItem(DOTS_KEY) !== "0";
  } catch {
    return true;
  }
}

function canvasMeasure(): Measure {
  const ctx = document.createElement("canvas").getContext("2d")!;
  return (text, weight) => {
    ctx.font = `${weight} 13px ${FONT}`;
    return ctx.measureText(text).width;
  };
}

export class Editor {
  store = $state<Store>(loadStore());
  sel = $state<string>(ROOT_ID);
  mode = $state<Mode>("tree");
  gridRow = $state(0);
  gridCol = $state(0);
  showDots = $state(loadShowDots());
  dialog = $state<Dialog | null>(null);
  past = $state<string[]>([]);
  future = $state<string[]>([]);
  nameInput = $state.raw<HTMLInputElement>();

  #measure = canvasMeasure();
  #coalescingEdit = false;

  tree = $derived(
    this.store.trees.find((t) => t.id === this.store.currentId) ??
      this.store.trees[0],
  );
  entries = $derived(indexTree(this.tree));
  selected = $derived(this.entries.get(this.sel) ?? this.entries.get(ROOT_ID)!);
  layout = $derived(layoutTree(this.tree, this.#measure));
  rows = $derived(
    this.tree.tests.map((test) => ({
      test,
      info: rowInfo(this.entries, test),
    })),
  );
  covered = $derived(coveredLeaves(this.tree));
  combinations = $derived(allCombinations(this.tree.root));
  gridCursorVisible = $derived(
    this.mode === "grid" &&
      this.tree.tests.length > 0 &&
      this.layout.leaves.length > 0,
  );

  #persist() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.store));
    } catch {
      // Storage full or blocked: the editor keeps working in memory.
    }
  }

  #snapshot() {
    this.past.push(JSON.stringify(this.store));
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
  }

  #settle() {
    if (!this.entries.has(this.sel)) this.sel = ROOT_ID;
    this.#clampGrid();
    this.#persist();
  }

  #clampGrid() {
    const lastRow = this.tree.tests.length - 1;
    const lastCol = leavesOf(this.tree).length - 1;
    this.gridRow = Math.max(0, Math.min(this.gridRow, lastRow));
    this.gridCol = Math.max(0, Math.min(this.gridCol, lastCol));
  }

  commit(change: () => void) {
    this.#snapshot();
    change();
    prune(this.tree);
    this.#settle();
  }

  undo() {
    const previous = this.past.pop();
    if (previous === undefined) return;
    this.future.push(JSON.stringify(this.store));
    this.store = JSON.parse(previous);
    this.#settle();
  }

  redo() {
    const next = this.future.pop();
    if (next === undefined) return;
    this.past.push(JSON.stringify(this.store));
    this.store = JSON.parse(next);
    this.#settle();
  }

  /** Marks the start of a run of keystrokes that undo as one step. */
  beginTextEdit() {
    this.#coalescingEdit = false;
  }

  #textEdit(change: () => void) {
    if (!this.#coalescingEdit) {
      this.#snapshot();
      this.#coalescingEdit = true;
    }
    change();
    this.#persist();
  }

  setSelectedName(name: string) {
    const entry = this.selected;
    this.#textEdit(() => {
      if (entry.kind === "root") this.tree.name = name;
      else entry.node.name = name;
    });
  }

  setNotes(notes: string) {
    this.#textEdit(() => {
      this.tree.notes = notes;
    });
  }

  select(id: string, focusName = false) {
    this.sel = id;
    this.mode = "tree";
    if (focusName) this.focusName(true);
  }

  async focusName(selectAll: boolean) {
    await tick();
    const input = this.nameInput;
    if (!input) return;
    input.focus();
    if (selectAll) input.select();
    else input.setSelectionRange(input.value.length, input.value.length);
  }

  setMode(mode: Mode) {
    const leaves = leavesOf(this.tree);
    if (mode === "grid") {
      const i = leaves.findIndex((l) => l.id === this.sel);
      if (i >= 0) this.gridCol = i;
    } else if (this.mode === "grid" && leaves[this.gridCol]) {
      this.sel = leaves[this.gridCol].id;
    }
    this.mode = mode;
    this.#clampGrid();
  }

  toggleMode() {
    this.setMode(this.mode === "tree" ? "grid" : "tree");
  }

  setShowDots(show: boolean) {
    this.showDots = show;
    try {
      localStorage.setItem(DOTS_KEY, show ? "1" : "0");
    } catch {
      // The preference just won't survive a reload.
    }
  }

  // Tree nodes

  addChild() {
    const entry = this.selected;
    if (entry.kind === "classification") {
      this.#insert(entry.node.classes, leafClass("new class"));
    } else {
      this.#insert(entry.node.children, newClassification());
    }
  }

  addSibling(before = false) {
    const entry = this.selected;
    if (entry.kind === "root") {
      this.#insert(entry.node.children, newClassification());
    } else if (entry.kind === "class") {
      const siblings = entry.parent.node.classes;
      const at = siblings.indexOf(entry.node) + (before ? 0 : 1);
      this.#insert(siblings, leafClass("new class"), at);
    } else {
      const siblings = entry.parent.node.children;
      const at = siblings.indexOf(entry.node) + (before ? 0 : 1);
      this.#insert(siblings, newClassification(), at);
    }
  }

  #insert<T extends { id: string }>(list: T[], node: T, at = list.length) {
    this.commit(() => list.splice(at, 0, node));
    this.select(node.id, true);
  }

  moveSelected(dir: -1 | 1) {
    const entry = this.selected;
    if (entry.kind === "root") return;
    this.commit(() => moveNode(entry, dir));
  }

  deleteSelected() {
    const entry = this.selected;
    if (entry.kind === "root") return;
    this.commit(() => {
      removeNode(entry);
      this.sel = entry.parent.node.id;
    });
  }

  // Trees

  switchTree(id: string) {
    this.store.currentId = id;
    this.sel = ROOT_ID;
    this.gridRow = 0;
    this.gridCol = 0;
    this.#persist();
  }

  cycleTree(delta: number) {
    const { trees } = this.store;
    const i = trees.findIndex((t) => t.id === this.tree.id);
    const n = trees.length;
    this.switchTree(trees[(((i + delta) % n) + n) % n].id);
  }

  #addTree(tree: Tree) {
    this.commit(() => {
      this.store.trees.push(tree);
      this.store.currentId = tree.id;
      this.sel = ROOT_ID;
    });
  }

  newTree() {
    this.#addTree(blankTree());
    this.select(ROOT_ID, true);
  }

  duplicateTree() {
    const copy: Tree = JSON.parse(JSON.stringify(this.tree));
    copy.id = uid();
    copy.name = `${label(copy.name)} copy`;
    this.#addTree(copy);
  }

  importTree(tree: Tree) {
    this.#addTree(tree);
  }

  deleteTree() {
    this.commit(() => {
      this.store.trees = this.store.trees.filter(
        (t) => t.id !== this.store.currentId,
      );
      if (!this.store.trees.length) this.store.trees.push(blankTree());
      this.store.currentId = this.store.trees[0].id;
      this.sel = ROOT_ID;
    });
  }

  exportCurrentTree() {
    return exportTree(this.tree);
  }

  // Test cases

  addTest() {
    this.commit(() => {
      this.tree.tests.push(newTest());
      this.gridRow = this.tree.tests.length - 1;
    });
  }

  fillMinimal() {
    this.commit(() => {
      this.tree.tests = generateMinimal(this.tree.root).map((p) => newTest(p));
    });
  }

  fillAll() {
    if (this.combinations > ALL_COMBINATIONS_CAP) return;
    this.commit(() => {
      this.tree.tests = generateAll(this.tree.root).map((p) => newTest(p));
    });
  }

  clearTests() {
    this.commit(() => {
      this.tree.tests = [];
    });
  }

  sortTests(how: SortOrder) {
    this.commit(() => sortTests(this.tree, how));
  }

  removeTest(id: string) {
    this.commit(() => {
      this.tree.tests = this.tree.tests.filter((t) => t.id !== id);
    });
  }

  moveTest(id: string, to: number) {
    this.commit(() => {
      const tests = this.tree.tests;
      const from = tests.findIndex((t) => t.id === id);
      if (from < 0) return;
      const [test] = tests.splice(from, 1);
      tests.splice(Math.max(0, Math.min(tests.length, to)), 0, test);
    });
  }

  toggleCell(testId: string, leafId: string) {
    const tests = this.tree.tests;
    this.gridRow = Math.max(
      0,
      tests.findIndex((t) => t.id === testId),
    );
    this.gridCol = Math.max(
      0,
      this.layout.leaves.findIndex((l) => l.id === leafId),
    );
    this.commit(() => {
      const test = this.tree.tests.find((t) => t.id === testId);
      if (test) togglePick(test, leafId);
    });
  }

  // Grid cursor

  gridToggle() {
    const test = this.tree.tests[this.gridRow];
    const leaf = this.layout.leaves[this.gridCol];
    if (test && leaf) this.toggleCell(test.id, leaf.id);
  }

  gridNewTest(before: boolean) {
    this.commit(() => {
      const tests = this.tree.tests;
      const at = tests.length ? this.gridRow + (before ? 0 : 1) : 0;
      tests.splice(at, 0, newTest());
      this.gridRow = at;
    });
  }

  gridDeleteTest() {
    if (!this.tree.tests.length) return;
    this.commit(() => {
      this.tree.tests.splice(this.gridRow, 1);
    });
  }

  /** Returns false at either end, so that counted moves stop there. */
  gridMoveTest(dir: -1 | 1) {
    const tests = this.tree.tests;
    const to = this.gridRow + dir;
    if (to < 0 || to >= tests.length) return false;
    const id = tests[this.gridRow].id;
    this.gridRow = to;
    this.moveTest(id, to);
    return true;
  }

  // Tree cursor

  stepSideways(dir: -1 | 1) {
    const { pos } = this.layout;
    const depth = pos[this.sel].depth;
    const ids = Object.keys(pos)
      .filter((id) => pos[id].depth === depth)
      .sort((a, b) => pos[a].x - pos[b].x);
    const next = ids[ids.indexOf(this.sel) + dir];
    if (next) this.sel = next;
  }

  stepDown() {
    const entry = this.selected;
    const kids =
      entry.kind === "classification"
        ? entry.node.classes
        : entry.node.children;
    if (kids.length) this.sel = kids[0].id;
  }

  stepUp() {
    const { parent } = this.selected;
    if (parent) this.sel = parent.node.id;
  }

  // Dialogs

  closeDialog() {
    const closing = this.dialog;
    this.dialog = null;
    if (closing === "io") document.getElementById(IO_BUTTON_ID)?.focus();
  }
}
