import { tick } from "svelte";
import type { AnyDocumentEditor } from "./document-editor.svelte";
import { label } from "./util";

const PENDING_TIMEOUT_MS = 1200;
const FLASH_TIMEOUT_MS = 1800;
const MAX_COUNT = 999;

export type KeyHint = [keys: string[], description: string];
export type KeySection = { title: string; keys: KeyHint[] };

export const SHARED_KEYS: KeyHint[] = [
  [["u"], "Undo"],
  [["^R"], "Redo"],
  [["gt", "gT"], "Next / previous document"],
  [["?"], "This list"],
];

/** Vim-style key handling: counts, two-key sequences and the status flash. */
export abstract class VimKeys<E extends AnyDocumentEditor> {
  pending = $state("");
  count = $state("");
  flash = $state("");

  protected editor: E;
  #pendingTimer?: ReturnType<typeof setTimeout>;
  #flashTimer?: ReturnType<typeof setTimeout>;

  constructor(editor: E) {
    this.editor = editor;
  }

  /** Runs the editor's own keys. Returns whether `seq` meant anything. */
  protected abstract run(seq: string, n: number): boolean;
  protected abstract cursorElement(): Element | null;

  protected showFlash(message: string) {
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
    this.cursorElement()?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }

  #undo() {
    if (this.editor.past.length) {
      this.editor.undo();
      this.showFlash("Undo");
    } else {
      this.showFlash("Nothing to undo");
    }
  }

  #redo() {
    if (this.editor.future.length) {
      this.editor.redo();
      this.showFlash("Redo");
    } else {
      this.showFlash("Nothing to redo");
    }
  }

  #cycleDocument(delta: number) {
    this.editor.cycleDocument(delta);
    this.showFlash(label(this.editor.current.name));
  }

  #runShared(seq: string, n: number) {
    switch (seq) {
      case "?":
        this.editor.dialog = "help";
        return true;
      case "u":
        this.#undo();
        return true;
      case "gt":
        this.#cycleDocument(n);
        return true;
      case "gT":
        this.#cycleDocument(-n);
        return true;
      default:
        return false;
    }
  }

  #handleDialogKey(event: KeyboardEvent) {
    const closesHelp =
      this.editor.dialog === "help" && (event.key === "?" || event.key === "q");
    if (event.key === "Escape" || closesHelp) {
      event.preventDefault();
      this.editor.closeDialog();
    }
  }

  handle = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    if (this.editor.dialog) {
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
      if (event.shiftKey) this.editor.redo();
      else this.editor.undo();
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

    if (this.#runShared(seq, n) || this.run(seq, n)) {
      event.preventDefault();
      // A key that moved on from a tabbed-to node must not leave it focused,
      // or Enter and Space would go on acting on that node.
      if (target.closest("[data-node]")) target.blur();
      this.#scrollToCursor();
    }
  };
}
