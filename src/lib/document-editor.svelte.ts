import { tick } from "svelte";
import { label, uid } from "./util";

export type EditorDocument = { id: string; name: string };
export type EditorDialog = "help" | "io";
export type ParseResult<D> = { doc: D } | { error: string };
export type AnyDocumentEditor = DocumentEditor<EditorDocument>;

type Collection<D> = { docs: D[]; currentId: string };

export const IO_BUTTON_ID = "btn-io";

const HISTORY_LIMIT = 150;

function loadCollection<D extends EditorDocument>(
  key: string,
  seed: () => D[],
): Collection<D> {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null");
    // `trees` is the field name in stores saved before editors shared this class.
    const docs = stored?.docs ?? stored?.trees;
    if (Array.isArray(docs) && docs.length) {
      return { docs, currentId: stored.currentId };
    }
  } catch {
    // Unavailable or corrupt storage falls through to the seed documents.
  }
  const docs = seed();
  return { docs, currentId: docs[0].id };
}

/** A persisted set of documents, one open at a time, with undo across them. */
export abstract class DocumentEditor<D extends EditorDocument> {
  abstract readonly noun: string;

  collection = $state<Collection<D>>({ docs: [], currentId: "" });
  past = $state<string[]>([]);
  future = $state<string[]>([]);
  dialog = $state<EditorDialog | null>(null);
  nameInput = $state.raw<HTMLInputElement>();

  current = $derived(
    this.collection.docs.find((d) => d.id === this.collection.currentId) ??
      this.collection.docs[0],
  );

  #storageKey: string;
  #coalescingEdit = false;

  constructor(storageKey: string, seed: () => D[]) {
    this.#storageKey = storageKey;
    this.collection = loadCollection(storageKey, seed);
  }

  abstract exportCurrent(): string;
  abstract parseDocument(text: string): ParseResult<D>;
  protected abstract blankDocument(): D;
  /** Drops references left dangling by the change just made to `doc`. */
  protected abstract normalize(doc: D): void;
  /** Makes the cursor valid again for the current document. */
  protected abstract settleCursor(): void;
  protected abstract resetCursor(): void;

  protected persist() {
    try {
      localStorage.setItem(this.#storageKey, JSON.stringify(this.collection));
    } catch {
      // Storage full or blocked: the editor keeps working in memory.
    }
  }

  #snapshot() {
    this.past.push(JSON.stringify(this.collection));
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
  }

  #settle() {
    this.settleCursor();
    this.persist();
  }

  commit(change: () => void) {
    this.#snapshot();
    change();
    this.normalize(this.current);
    this.#settle();
  }

  undo() {
    const previous = this.past.pop();
    if (previous === undefined) return;
    this.future.push(JSON.stringify(this.collection));
    this.collection = JSON.parse(previous);
    this.#settle();
  }

  redo() {
    const next = this.future.pop();
    if (next === undefined) return;
    this.past.push(JSON.stringify(this.collection));
    this.collection = JSON.parse(next);
    this.#settle();
  }

  /** Marks the start of a run of keystrokes that undo as one step. */
  beginTextEdit() {
    this.#coalescingEdit = false;
  }

  protected textEdit(change: () => void) {
    if (!this.#coalescingEdit) {
      this.#snapshot();
      this.#coalescingEdit = true;
    }
    change();
    this.persist();
  }

  protected async focusInput(
    input: () => HTMLInputElement | undefined,
    selectAll: boolean,
  ) {
    await tick();
    const el = input();
    if (!el) return;
    el.focus();
    if (selectAll) el.select();
    else el.setSelectionRange(el.value.length, el.value.length);
  }

  focusName(selectAll: boolean) {
    return this.focusInput(() => this.nameInput, selectAll);
  }

  protected focusDocumentName() {
    this.focusName(true);
  }

  switchTo(id: string) {
    this.collection.currentId = id;
    this.resetCursor();
    this.persist();
  }

  cycleDocument(delta: number) {
    const { docs } = this.collection;
    const i = docs.findIndex((d) => d.id === this.current.id);
    const n = docs.length;
    this.switchTo(docs[(((i + delta) % n) + n) % n].id);
  }

  addDocument(doc: D) {
    this.commit(() => {
      this.collection.docs.push(doc);
      this.collection.currentId = doc.id;
      this.resetCursor();
    });
  }

  newDocument() {
    this.addDocument(this.blankDocument());
    this.focusDocumentName();
  }

  duplicateDocument() {
    const copy: D = JSON.parse(JSON.stringify(this.current));
    copy.id = uid();
    copy.name = `${label(copy.name)} copy`;
    this.addDocument(copy);
  }

  deleteDocument() {
    this.commit(() => {
      const { collection } = this;
      collection.docs = collection.docs.filter(
        (d) => d.id !== collection.currentId,
      );
      if (!collection.docs.length) collection.docs.push(this.blankDocument());
      collection.currentId = collection.docs[0].id;
      this.resetCursor();
    });
  }

  closeDialog() {
    const closing = this.dialog;
    this.dialog = null;
    if (closing === "io") document.getElementById(IO_BUTTON_ID)?.focus();
  }
}
