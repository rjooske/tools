import { DocumentEditor } from "../document-editor.svelte";
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
  leafClass,
  leavesOf,
  moveNode,
  newClassification,
  newTest,
  parseTree,
  prune,
  removeNode,
  ROOT_ID,
  rowInfo,
  sortTests,
  togglePick,
  type SortOrder,
  type Tree,
} from "./model";

export type Mode = "tree" | "grid";

const STORE_KEY = "ct-editor-v1";
const DOTS_KEY = "ct-editor-dots";
/** Must match --font-ui, or node boxes won't fit their labels. */
const FONT = "system-ui, sans-serif";

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

export class TreeEditor extends DocumentEditor<Tree> {
  readonly noun = "tree";

  sel = $state<string>(ROOT_ID);
  mode = $state<Mode>("tree");
  gridRow = $state(0);
  gridCol = $state(0);
  showDots = $state(loadShowDots());

  #measure = canvasMeasure();

  entries = $derived(indexTree(this.current));
  selected = $derived(this.entries.get(this.sel) ?? this.entries.get(ROOT_ID)!);
  layout = $derived(layoutTree(this.current, this.#measure));
  rows = $derived(
    this.current.tests.map((test) => ({
      test,
      info: rowInfo(this.entries, test),
    })),
  );
  covered = $derived(coveredLeaves(this.current));
  combinations = $derived(allCombinations(this.current.root));
  gridCursorVisible = $derived(
    this.mode === "grid" &&
      this.current.tests.length > 0 &&
      this.layout.leaves.length > 0,
  );

  constructor() {
    super(STORE_KEY, examples);
  }

  exportCurrent() {
    return exportTree(this.current);
  }

  parseDocument(text: string) {
    return parseTree(text);
  }

  protected blankDocument() {
    return blankTree();
  }

  protected normalize(tree: Tree) {
    prune(tree);
  }

  protected settleCursor() {
    if (!this.entries.has(this.sel)) this.sel = ROOT_ID;
    this.#clampGrid();
  }

  protected resetCursor() {
    this.sel = ROOT_ID;
    this.gridRow = 0;
    this.gridCol = 0;
  }

  protected focusDocumentName() {
    this.select(ROOT_ID, true);
  }

  #clampGrid() {
    const lastRow = this.current.tests.length - 1;
    const lastCol = leavesOf(this.current).length - 1;
    this.gridRow = Math.max(0, Math.min(this.gridRow, lastRow));
    this.gridCol = Math.max(0, Math.min(this.gridCol, lastCol));
  }

  setSelectedName(name: string) {
    const entry = this.selected;
    this.textEdit(() => {
      if (entry.kind === "root") this.current.name = name;
      else entry.node.name = name;
    });
  }

  setNotes(notes: string) {
    this.textEdit(() => {
      this.current.notes = notes;
    });
  }

  select(id: string, focusName = false) {
    this.sel = id;
    this.mode = "tree";
    if (focusName) this.focusName(true);
  }

  setMode(mode: Mode) {
    const leaves = leavesOf(this.current);
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

  // Test cases

  addTest() {
    this.commit(() => {
      this.current.tests.push(newTest());
      this.gridRow = this.current.tests.length - 1;
    });
  }

  fillMinimal() {
    this.commit(() => {
      this.current.tests = generateMinimal(this.current.root).map((p) =>
        newTest(p),
      );
    });
  }

  fillAll() {
    if (this.combinations > ALL_COMBINATIONS_CAP) return;
    this.commit(() => {
      this.current.tests = generateAll(this.current.root).map((p) =>
        newTest(p),
      );
    });
  }

  clearTests() {
    this.commit(() => {
      this.current.tests = [];
    });
  }

  sortTests(how: SortOrder) {
    this.commit(() => sortTests(this.current, how));
  }

  removeTest(id: string) {
    this.commit(() => {
      this.current.tests = this.current.tests.filter((t) => t.id !== id);
    });
  }

  moveTest(id: string, to: number) {
    this.commit(() => {
      const tests = this.current.tests;
      const from = tests.findIndex((t) => t.id === id);
      if (from < 0) return;
      const [test] = tests.splice(from, 1);
      tests.splice(Math.max(0, Math.min(tests.length, to)), 0, test);
    });
  }

  toggleCell(testId: string, leafId: string) {
    const tests = this.current.tests;
    this.gridRow = Math.max(
      0,
      tests.findIndex((t) => t.id === testId),
    );
    this.gridCol = Math.max(
      0,
      this.layout.leaves.findIndex((l) => l.id === leafId),
    );
    this.commit(() => {
      const test = this.current.tests.find((t) => t.id === testId);
      if (test) togglePick(test, leafId);
    });
  }

  // Grid cursor

  gridToggle() {
    const test = this.current.tests[this.gridRow];
    const leaf = this.layout.leaves[this.gridCol];
    if (test && leaf) this.toggleCell(test.id, leaf.id);
  }

  gridNewTest(before: boolean) {
    this.commit(() => {
      const tests = this.current.tests;
      const at = tests.length ? this.gridRow + (before ? 0 : 1) : 0;
      tests.splice(at, 0, newTest());
      this.gridRow = at;
    });
  }

  gridDeleteTest() {
    if (!this.current.tests.length) return;
    this.commit(() => {
      this.current.tests.splice(this.gridRow, 1);
    });
  }

  /** Returns false at either end, so that counted moves stop there. */
  gridMoveTest(dir: -1 | 1) {
    const tests = this.current.tests;
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
}
