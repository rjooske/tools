import { DocumentEditor } from "../document-editor.svelte";
import { examples } from "./examples";
import {
  analyse,
  blankTable,
  conditionValue,
  expandedRules,
  exportTable,
  MAX_GENERATED_RULES,
  newAction,
  newCondition,
  newRule,
  nextEntry,
  parseTable,
  prune,
  reducedRules,
  ruleCount,
  sortRules,
  type Action,
  type Condition,
  type DecisionTable,
  type Entries,
  type SortOrder,
} from "./model";

const STORE_KEY = "dt-editor-v1";

export type Row =
  | { kind: "condition"; node: Condition; index: number }
  | { kind: "action"; node: Action; index: number };

function swap<T>(list: T[], i: number, j: number) {
  [list[i], list[j]] = [list[j], list[i]];
}

export class TableEditor extends DocumentEditor<DecisionTable> {
  readonly noun = "table";

  row = $state(0);
  col = $state(0);
  tableNameInput = $state.raw<HTMLInputElement>();

  rows = $derived<Row[]>([
    ...this.current.conditions.map((node, index): Row => ({
      kind: "condition",
      node,
      index,
    })),
    ...this.current.actions.map((node, index): Row => ({
      kind: "action",
      node,
      index,
    })),
  ]);
  selectedRow = $derived<Row | undefined>(this.rows[this.row]);
  selectedRule = $derived(this.current.rules[this.col]);
  analysis = $derived(analyse(this.current));
  canReduce = $derived(
    reducedRules(this.current).length < this.current.rules.length,
  );
  expandedCount = $derived(
    this.current.rules.reduce((n, r) => n + ruleCount(this.current, r), 0),
  );

  constructor() {
    super(STORE_KEY, examples);
  }

  exportCurrent() {
    return exportTable(this.current);
  }

  parseDocument(text: string) {
    return parseTable(text);
  }

  protected blankDocument() {
    return blankTable();
  }

  protected normalize(table: DecisionTable) {
    prune(table);
  }

  protected settleCursor() {
    const { conditions, actions, rules } = this.current;
    const lastRow = conditions.length + actions.length - 1;
    this.row = Math.max(0, Math.min(this.row, lastRow));
    this.col = Math.max(0, Math.min(this.col, rules.length - 1));
  }

  protected resetCursor() {
    this.row = 0;
    this.col = 0;
  }

  protected focusDocumentName() {
    this.focusInput(() => this.tableNameInput, true);
  }

  setCursor(row: number, col: number) {
    this.row = row;
    this.col = col;
  }

  // Text fields

  setSelectedName(name: string) {
    const row = this.selectedRow;
    if (row) this.textEdit(() => (row.node.name = name));
  }

  setTableName(name: string) {
    this.textEdit(() => (this.current.name = name));
  }

  setNotes(notes: string) {
    this.textEdit(() => (this.current.notes = notes));
  }

  setValueName(condition: Condition, valueId: string, name: string) {
    this.textEdit(() => {
      const value = condition.values.find((v) => v.id === valueId);
      if (value) value.name = name;
    });
  }

  // Entries

  cycleCell(row: number, col: number, dir: -1 | 1 = 1) {
    this.setCursor(row, col);
    const target = this.rows[row];
    const rule = this.current.rules[col];
    if (!target || !rule) return;
    this.commit(() => {
      if (target.kind === "action") {
        const i = rule.actions.indexOf(target.node.id);
        if (i >= 0) rule.actions.splice(i, 1);
        else rule.actions.push(target.node.id);
        return;
      }
      const { id } = target.node;
      const next = nextEntry(target.node, rule.entries[id], dir);
      if (next === undefined) delete rule.entries[id];
      else rule.entries[id] = next;
    });
  }

  clearCell() {
    const target = this.selectedRow;
    const rule = this.selectedRule;
    if (!target || !rule) return;
    this.commit(() => {
      if (target.kind === "action") {
        rule.actions = rule.actions.filter((id) => id !== target.node.id);
      } else {
        delete rule.entries[target.node.id];
      }
    });
  }

  // Rows

  #insertCondition(at: number) {
    this.commit(() => {
      this.current.conditions.splice(at, 0, newCondition());
      this.row = at;
    });
    this.focusName(true);
  }

  #insertAction(at: number) {
    this.commit(() => {
      this.current.actions.splice(at, 0, newAction());
      this.row = this.current.conditions.length + at;
    });
    this.focusName(true);
  }

  addCondition() {
    this.#insertCondition(this.current.conditions.length);
  }

  addAction() {
    this.#insertAction(this.current.actions.length);
  }

  addRowBeside(before = false) {
    const row = this.selectedRow;
    if (!row) this.addCondition();
    else if (row.kind === "condition") {
      this.#insertCondition(row.index + (before ? 0 : 1));
    } else {
      this.#insertAction(row.index + (before ? 0 : 1));
    }
  }

  /** Returns false at either end of the row's section. */
  moveRow(dir: -1 | 1) {
    const row = this.selectedRow;
    if (!row) return false;
    const { conditions, actions } = this.current;
    const size = row.kind === "condition" ? conditions.length : actions.length;
    const to = row.index + dir;
    if (to < 0 || to >= size) return false;
    this.commit(() => {
      if (row.kind === "condition") swap(conditions, row.index, to);
      else swap(actions, row.index, to);
      this.row += dir;
    });
    return true;
  }

  deleteRow() {
    const row = this.selectedRow;
    if (!row) return;
    this.commit(() => {
      if (row.kind === "condition") {
        this.current.conditions.splice(row.index, 1);
      } else {
        this.current.actions.splice(row.index, 1);
      }
    });
  }

  addValue(condition: Condition) {
    this.commit(() => {
      condition.values.push(conditionValue(`v${condition.values.length + 1}`));
    });
  }

  removeValue(condition: Condition, valueId: string) {
    this.commit(() => {
      condition.values = condition.values.filter((v) => v.id !== valueId);
    });
  }

  setIndependent(independent: boolean) {
    this.commit(() => (this.current.independent = independent));
  }

  // Rules

  addRule(at = this.current.rules.length, entries: Entries = {}) {
    this.commit(() => {
      this.current.rules.splice(at, 0, newRule(entries));
      this.col = at;
    });
  }

  duplicateRule() {
    const rule = this.selectedRule;
    if (!rule) return;
    this.commit(() => {
      this.current.rules.splice(
        this.col + 1,
        0,
        newRule({ ...rule.entries }, [...rule.actions]),
      );
      this.col += 1;
    });
  }

  deleteRule(index = this.col) {
    if (!this.current.rules[index]) return;
    this.commit(() => this.current.rules.splice(index, 1));
  }

  /** Returns false at either end. */
  moveRule(dir: -1 | 1) {
    const { rules } = this.current;
    const to = this.col + dir;
    if (to < 0 || to >= rules.length) return false;
    this.commit(() => {
      swap(rules, this.col, to);
      this.col = to;
    });
    return true;
  }

  addMissingRules() {
    const cubes = this.analysis.coverage?.missing.cubes ?? [];
    this.commit(() => {
      this.current.rules.push(...cubes.map((entries) => newRule(entries)));
    });
  }

  reduceRules() {
    this.commit(() => (this.current.rules = reducedRules(this.current)));
  }

  expandRules() {
    if (this.expandedCount > MAX_GENERATED_RULES) return;
    this.commit(() => (this.current.rules = expandedRules(this.current)));
  }

  sortRules(how: SortOrder) {
    this.commit(() => sortRules(this.current, how));
  }
}
