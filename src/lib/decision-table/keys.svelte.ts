import type { KeyHint, KeySection } from "../vim-keys.svelte";
import { SHARED_KEYS, VimKeys } from "../vim-keys.svelte";
import type { TableEditor } from "./editor.svelte";

export const HINTS: KeyHint[] = [
  [["h", "l"], "rule"],
  [["j", "k"], "row"],
  [["x"], "next entry"],
  [["-"], "don't care"],
  [["a"], "add rule"],
  [["o"], "add row"],
  [["i"], "rename"],
  [["dd"], "delete row"],
  [["dr"], "delete rule"],
  [["?"], "all keys"],
];

export const HELP_SECTIONS: KeySection[] = [
  { title: "Anywhere", keys: SHARED_KEYS },
  {
    title: "Moving",
    keys: [
      [["h", "l"], "Previous / next rule"],
      [["j", "k"], "Next / previous row"],
      [["0", "$"], "First / last rule"],
      [["gg", "G"], "First / last row"],
    ],
  },
  {
    title: "Entries",
    keys: [
      [["x", "␣"], "Next value, or toggle an action"],
      [["X"], "Previous value"],
      [["-"], "Don't care, or clear an action"],
    ],
  },
  {
    title: "Rules",
    keys: [
      [["a", "A"], "New rule after / before"],
      [["dr"], "Delete rule"],
      [["H", "L"], "Move rule left / right"],
    ],
  },
  {
    title: "Rows",
    keys: [
      [["o", "O"], "New row after / before"],
      [["i", "↵"], "Rename"],
      [["c"], "Rename, replacing the text"],
      [["dd"], "Delete row"],
      [["J", "K"], "Move row down / up"],
    ],
  },
];

export class TableKeys extends VimKeys<TableEditor> {
  protected cursorElement() {
    return document.getElementById("table-cursor");
  }

  protected run(seq: string, n: number) {
    const e = this.editor;
    const lastCol = Math.max(0, e.current.rules.length - 1);
    const lastRow = Math.max(0, e.rows.length - 1);
    const repeat = (step: () => boolean) => {
      for (let i = 0; i < n && step(); i++);
    };
    switch (seq) {
      case "h":
        e.col = Math.max(0, e.col - n);
        return true;
      case "l":
        e.col = Math.min(lastCol, e.col + n);
        return true;
      case "k":
        e.row = Math.max(0, e.row - n);
        return true;
      case "j":
        e.row = Math.min(lastRow, e.row + n);
        return true;
      case "0":
        e.col = 0;
        return true;
      case "$":
        e.col = lastCol;
        return true;
      case "gg":
        e.row = 0;
        return true;
      case "G":
        e.row = lastRow;
        return true;
      case "x":
      case " ":
        e.cycleCell(e.row, e.col);
        return true;
      case "X":
        e.cycleCell(e.row, e.col, -1);
        return true;
      case "-":
        e.clearCell();
        return true;
      case "a":
        e.addRule(e.current.rules.length ? e.col + 1 : 0);
        return true;
      case "A":
        e.addRule(e.col);
        return true;
      case "o":
      case "O":
        e.addRowBeside(seq === "O");
        return true;
      case "i":
      case "Enter":
        e.focusName(false);
        return true;
      case "c":
      case "F2":
        e.focusName(true);
        return true;
      case "dd":
        e.deleteRow();
        return true;
      case "dr":
        e.deleteRule();
        return true;
      case "H":
        repeat(() => e.moveRule(-1));
        return true;
      case "L":
        repeat(() => e.moveRule(1));
        return true;
      case "J":
        repeat(() => e.moveRow(1));
        return true;
      case "K":
        repeat(() => e.moveRow(-1));
        return true;
      default:
        return false;
    }
  }
}
