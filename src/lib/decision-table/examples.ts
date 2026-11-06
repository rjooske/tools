import { uid } from "../util";
import {
  DONT_CARE,
  newAction,
  newCondition,
  newRule,
  type DecisionTable,
  type Entries,
} from "./model";

const ACTION_MARK = "X";

type Preset = {
  name: string;
  notes: string;
  independent: boolean;
  /** Name, values, then one entry per rule, read like the table on the slide. */
  conditions: [name: string, values: string, entries: string][];
  actions: [name: string, entries: string][];
};

function table(preset: Preset): DecisionTable {
  const columns = (entries: string) => entries.split(" ");
  const conditions = preset.conditions.map(([name, values]) =>
    newCondition(name, values.split(" ")),
  );
  const actions = preset.actions.map(([name]) => newAction(name));
  const ruleCount = columns(preset.conditions[0][2]).length;

  const rules = Array.from({ length: ruleCount }, (_, rule) => {
    const entries: Entries = {};
    preset.conditions.forEach(([, , row], i) => {
      const entry = columns(row)[rule];
      if (entry === DONT_CARE) return;
      const value = conditions[i].values.find((v) => v.name === entry);
      entries[conditions[i].id] = value!.id;
    });
    const picked = actions.filter(
      (_, i) => columns(preset.actions[i][1])[rule] === ACTION_MARK,
    );
    return newRule(
      entries,
      picked.map((a) => a.id),
    );
  });

  return {
    id: uid(),
    name: preset.name,
    notes: preset.notes,
    independent: preset.independent,
    conditions,
    actions,
    rules,
  };
}

export const examples = (): DecisionTable[] => [
  table({
    name: "Basic concepts (example)",
    notes:
      "The lecture's abstract table. Its don't cares give the rules counts of 4, 2, 1 and 1, which add up to the 2³ = 8 required, so it is complete. (Slide 31.)",
    independent: true,
    conditions: [
      ["c1", "T F", "F T T T"],
      ["c2", "T F", "- F T T"],
      ["c3", "T F", "- - F T"],
    ],
    actions: [
      ["a1", "X - - -"],
      ["a2", "- X - -"],
      ["a1;a2", "- - X -"],
      ["error", "- - - X"],
    ],
  }),
  table({
    name: "Choosing a technique (example)",
    notes:
      "Which functional testing technique suits a problem, from the lecture's summary table. All four conditions are independent, so 10 rules cover the 16 combinations. (Slide 33.)",
    independent: true,
    conditions: [
      ["variables: Physical or Logical", "P L", "P P P P P L L L L L"],
      ["Independent?", "y n", "y y y y n y y y y n"],
      ["Single fault assum.?", "y n", "y y n n - y y n n -"],
      ["Exception handling?", "y n", "y n y n - y n y n -"],
    ],
    actions: [
      ["BV", "- X - - - - - - - -"],
      ["Robust", "X - - - - - - - - -"],
      ["WC", "- - - X - - - - - -"],
      ["Robust WC", "- - X - - - - - - -"],
      ["EC", "- - - - - - X - - -"],
      ["Strong (Normal) EC", "- - - - - - - - X -"],
      ["(Weak) Robust EC", "- - - - - X - - - -"],
      ["Strong Robust EC", "- - - - - - - X - -"],
      ["Decision Table", "- - - - X - - - - X"],
    ],
  }),
  table({
    name: "Mortgage (example)",
    notes:
      "The mortgage specification as a decision table. The age conditions exclude each other, so the conditions are dependent: most combinations are impossible, and the completeness check does not apply. (Slide 32.)",
    independent: false,
    conditions: [
      ["c7: 0≤salary≤10000?", "y n", "n y y y y y y y y"],
      ["c1: full-time?", "y n", "- - - y y y n n n"],
      ["c2: too young? [..,18]", "y n", "- y - - - - - - -"],
      ["c3: young? m:[18,..,35], f:[18,..,30]", "y n", "- - - y - - y - -"],
      ["c4: mid? m:[36,..,45], f:[31,..,40]", "y n", "- - - - y - - y -"],
      ["c5: old? m:[46,..,55], f:[40,..,50]", "y n", "- - - - - y - - y"],
      ["c6: too old? m:[56,..], f:[51,..]", "y n", "- - y - - - - - -"],
    ],
    actions: [
      ["a1: wrong inputs", "X X X - - - - - -"],
      ["a2: 75*salary", "- - - X - - - - -"],
      ["a3: 70*salary", "- - - - - - X - -"],
      ["a4: 55*salary", "- - - - X - - - -"],
      ["a5: 50*salary", "- - - - - - - X -"],
      ["a6: 35*salary", "- - - - - - - - X"],
      ["a7: 30*salary", "- - - - - X - - -"],
    ],
  }),
];
