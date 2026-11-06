import { tick } from "svelte";
import type { Editor } from "./editor.svelte";
import { label, ROOT_ID } from "./model";

const PENDING_TIMEOUT_MS = 1200;
const FLASH_TIMEOUT_MS = 1800;
const MAX_COUNT = 999;

/** Vim-style key handling: counts, two-key sequences and the status flash. */
export class VimKeys {
  pending = $state("");
  count = $state("");
  flash = $state("");

  #editor: Editor;
  #pendingTimer?: ReturnType<typeof setTimeout>;
  #flashTimer?: ReturnType<typeof setTimeout>;

  constructor(editor: Editor) {
    this.#editor = editor;
  }

  #showFlash(message: string) {
    this.flash = message;
    clearTimeout(this.#flashTimer);
    this.#flashTimer = setTimeout(() => (this.flash = ""), FLASH_TIMEOUT_MS);
  }

  #setPending(pending: string) {
    this.pending = pending;
    clearTimeout(this.#pendingTimer);
    this.#pendingTimer = setTimeout(() => {
      this.pending = "";
      this.count = "";
    }, PENDING_TIMEOUT_MS);
  }

  async #scrollToCursor() {
    await tick();
    const { mode, sel } = this.#editor;
    const cursor =
      mode === "grid"
        ? document.getElementById("grid-cursor")
        : document.querySelector(`[data-node="${sel}"]`);
    cursor?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  #undo() {
    if (this.#editor.past.length) {
      this.#editor.undo();
      this.#showFlash("Undo");
    } else {
      this.#showFlash("Nothing to undo");
    }
  }

  #redo() {
    if (this.#editor.future.length) {
      this.#editor.redo();
      this.#showFlash("Redo");
    } else {
      this.#showFlash("Nothing to redo");
    }
  }

  #cycleTree(delta: number) {
    this.#editor.cycleTree(delta);
    this.#showFlash(label(this.#editor.tree.name));
  }

  #runAnyMode(seq: string, n: number) {
    const e = this.#editor;
    switch (seq) {
      case "?":
        e.dialog = "help";
        return true;
      case "u":
        this.#undo();
        return true;
      case "v":
        e.setShowDots(!e.showDots);
        this.#showFlash(
          e.showDots ? "Background dots shown" : "Background dots hidden",
        );
        return true;
      case "t":
        e.toggleMode();
        return true;
      case "Escape":
        if (e.mode === "grid") e.setMode("tree");
        return true;
      case "gt":
        this.#cycleTree(n);
        return true;
      case "gT":
        this.#cycleTree(-n);
        return true;
      default:
        return false;
    }
  }

  #runTreeMode(seq: string, n: number) {
    const e = this.#editor;
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
      case "j":
        repeat(() => e.stepDown());
        return true;
      case "k":
        repeat(() => e.stepUp());
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
          this.#showFlash("The root cannot be deleted");
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
    const e = this.#editor;
    const lastCol = Math.max(0, e.layout.leaves.length - 1);
    const lastRow = Math.max(0, e.tree.tests.length - 1);
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
      case "k":
        e.gridRow = Math.max(0, e.gridRow - n);
        return true;
      case "j":
        e.gridRow = Math.min(lastRow, e.gridRow + n);
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

  #handleDialogKey(event: KeyboardEvent) {
    const e = this.#editor;
    const helpClose =
      e.dialog === "help" && (event.key === "?" || event.key === "q");
    if (event.key === "Escape" || helpClose) {
      event.preventDefault();
      e.closeDialog();
    }
  }

  handle = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    const e = this.#editor;
    if (e.dialog) {
      this.#handleDialogKey(event);
      return;
    }

    const target = event.target as HTMLElement;
    if (
      /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) ||
      target.isContentEditable
    ) {
      return;
    }

    const mod = event.ctrlKey || event.metaKey;
    const lower = event.key.toLowerCase();
    if (mod && lower === "z") {
      event.preventDefault();
      if (event.shiftKey) e.redo();
      else e.undo();
      return;
    }
    if (
      mod &&
      (lower === "y" || (lower === "r" && event.ctrlKey && !event.metaKey))
    ) {
      event.preventDefault();
      this.#redo();
      return;
    }
    if (mod || event.altKey) return;

    const key = event.key;
    if (key === "Shift" || key === "CapsLock") return;
    if (
      (key === "Enter" || key === " ") &&
      target.closest("button, a, select")
    ) {
      return;
    }
    if (/^[1-9]$/.test(key) || (key === "0" && this.count)) {
      event.preventDefault();
      this.count += key;
      this.#setPending(this.pending);
      return;
    }
    if (!this.pending && (key === "g" || key === "d")) {
      event.preventDefault();
      this.#setPending(key);
      return;
    }

    const seq = this.pending + key;
    const n = Math.max(1, Math.min(parseInt(this.count || "1", 10), MAX_COUNT));
    this.pending = "";
    this.count = "";
    clearTimeout(this.#pendingTimer);

    const handled =
      this.#runAnyMode(seq, n) ||
      (e.mode === "tree"
        ? this.#runTreeMode(seq, n)
        : this.#runGridMode(seq, n));
    if (handled) {
      event.preventDefault();
      // A key that moved on from a tabbed-to node must not leave it focused,
      // or Enter and Space would go on acting on that node.
      if (target.closest("[data-node]")) target.blur();
      this.#scrollToCursor();
    }
  };
}
