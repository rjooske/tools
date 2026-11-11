import type { KeyHint, KeySection } from "../vim-keys.svelte";
import { SHARED_KEYS, VimKeys } from "../vim-keys.svelte";
import type { Mode, TreeEditor } from "./editor.svelte";
import { ROOT_ID } from "./model";

export const HINTS: Record<Mode, KeyHint[]> = {
  tree: [
    [["h", "l"], "left / right"],
    [["j", "k"], "child / parent"],
    [["i"], "rename"],
    [["a"], "add child"],
    [["o"], "add sibling"],
    [["dd"], "delete"],
    [["H", "L"], "move"],
    [["t"], "test grid"],
    [["?"], "all keys"],
  ],
  grid: [
    [["h", "l"], "class"],
    [["j", "k"], "test case"],
    [["x"], "toggle dot"],
    [["w", "b"], "next / prev dot"],
    [["o"], "new test"],
    [["dd"], "delete test"],
    [["J", "K"], "move test"],
    [["t"], "tree"],
    [["?"], "all keys"],
  ],
};

export const HELP_SECTIONS: KeySection[] = [
  {
    title: "Anywhere",
    keys: [
      [["t"], "Switch between tree and test grid"],
      [["Esc"], "Back to tree mode"],
      [["v"], "Show / hide background dots"],
      ...SHARED_KEYS,
    ],
  },
  {
    title: "Tree mode",
    keys: [
      [["h", "l"], "Node to the left / right"],
      [["j", "k"], "First child / parent (j on a leaf class enters the grid)"],
      [["gg"], "Root"],
      [["i", "↵"], "Rename"],
      [["c"], "Rename, replacing the text"],
      [["a"], "Add child (class or classification)"],
      [["o", "O"], "Add sibling after / before"],
      [["dd"], "Delete node"],
      [["H", "L"], "Move node left / right"],
    ],
  },
  {
    title: "Grid mode",
    keys: [
      [["h", "l"], "Previous / next leaf class"],
      [
        ["j", "k"],
        "Next / previous test case (k on the first returns to the tree)",
      ],
      [["w", "b"], "Next / previous dot"],
      [["0", "$"], "First / last leaf class"],
      [["gg", "G"], "First / last test case"],
      [["x", "␣"], "Toggle dot"],
      [["o", "O"], "New test case below / above"],
      [["dd"], "Delete test case"],
      [["J", "K"], "Move test case down / up"],
    ],
  },
];

/** Room kept around the cursor when scrolling it into view. */
const REVEAL_MARGIN = 32;

/** How far to scroll so that [start, end] fits in [viewStart, viewEnd]. */
function overshoot(
  start: number,
  end: number,
  viewStart: number,
  viewEnd: number,
) {
  if (start < viewStart) return start - viewStart;
  if (end > viewEnd) return Math.min(end - viewEnd, start - viewStart);
  return 0;
}

export class TreeKeys extends VimKeys<TreeEditor> {
  protected cursorElement() {
    const { mode, sel } = this.editor;
    return mode === "grid"
      ? document.getElementById("grid-cursor")
      : document.querySelector(`[data-node="${sel}"]`);
  }

  // Firefox's scrollIntoView on SVG elements can throw the canvas back to its
  // left edge, so the canvas and the page are scrolled by hand.
  protected reveal(cursor: Element) {
    const m = REVEAL_MARGIN;
    const canvas = cursor.closest(".canvas");
    if (canvas) {
      const r = cursor.getBoundingClientRect();
      const left = canvas.getBoundingClientRect().left + canvas.clientLeft;
      canvas.scrollLeft += overshoot(
        r.left - m,
        r.right + m,
        left,
        left + canvas.clientWidth,
      );
    }
    const r = cursor.getBoundingClientRect();
    window.scrollBy(0, overshoot(r.top - m, r.bottom + m, 0, innerHeight));
  }

  protected run(seq: string, n: number) {
    const e = this.editor;
    switch (seq) {
      case "v":
        e.setShowDots(!e.showDots);
        this.showFlash(
          e.showDots ? "Background dots shown" : "Background dots hidden",
        );
        return true;
      case "t":
        e.toggleMode();
        return true;
      case "Escape":
        if (e.mode === "grid") e.setMode("tree");
        return true;
      case "j":
        for (let i = 0; i < n; i++) e.cursorDown();
        return true;
      case "k":
        for (let i = 0; i < n; i++) e.cursorUp();
        return true;
    }
    return e.mode === "tree"
      ? this.#runTreeMode(seq, n)
      : this.#runGridMode(seq, n);
  }

  #runTreeMode(seq: string, n: number) {
    const e = this.editor;
    const repeat = (step: () => void) => {
      for (let i = 0; i < n; i++) step();
    };
    switch (seq) {
      case "h":
        repeat(() => e.stepSideways(-1));
        return true;
      case "l":
        repeat(() => e.stepSideways(1));
        return true;
      case "gg":
        e.sel = ROOT_ID;
        return true;
      case "i":
      case "Enter":
        e.focusName(false);
        return true;
      case "c":
      case "F2":
        e.focusName(true);
        return true;
      case "a":
        e.addChild();
        return true;
      case "o":
      case "O":
        e.addSibling(seq === "O");
        return true;
      case "dd":
      case "Delete":
      case "Backspace":
        if (e.selected.kind === "root") {
          this.showFlash("The root cannot be deleted");
        } else {
          e.deleteSelected();
        }
        return true;
      case "H":
      case "L":
        repeat(() => e.moveSelected(seq === "H" ? -1 : 1));
        return true;
      default:
        return false;
    }
  }

  #runGridMode(seq: string, n: number) {
    const e = this.editor;
    const lastCol = Math.max(0, e.layout.leaves.length - 1);
    const lastRow = Math.max(0, e.current.tests.length - 1);
    const repeat = (step: () => boolean) => {
      for (let i = 0; i < n && step(); i++);
    };
    switch (seq) {
      case "h":
        e.gridCol = Math.max(0, e.gridCol - n);
        return true;
      case "l":
        e.gridCol = Math.min(lastCol, e.gridCol + n);
        return true;
      case "w":
        repeat(() => e.gridJumpToDot(1));
        return true;
      case "b":
        repeat(() => e.gridJumpToDot(-1));
        return true;
      case "0":
        e.gridCol = 0;
        return true;
      case "$":
        e.gridCol = lastCol;
        return true;
      case "gg":
        e.gridRow = 0;
        return true;
      case "G":
        e.gridRow = lastRow;
        return true;
      case "x":
      case " ":
      case "Enter":
        e.gridToggle();
        return true;
      case "o":
      case "O":
        e.gridNewTest(seq === "O");
        return true;
      case "dd":
        e.gridDeleteTest();
        return true;
      case "J":
        repeat(() => e.gridMoveTest(1));
        return true;
      case "K":
        repeat(() => e.gridMoveTest(-1));
        return true;
      default:
        return false;
    }
  }
}
