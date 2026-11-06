import {
  classification as C,
  leafClass,
  newTest,
  ROOT_ID,
  uid,
  type Class,
  type Classification,
  type Tree,
} from "./model";

function preset(
  name: string,
  notes: string,
  build: (
    K: (name: string, children?: Classification[], tag?: string) => Class,
  ) => Classification[],
  testTags: string[][],
): Tree {
  const tags = new Map<string, string>();
  const K = (name: string, children: Classification[] = [], tag?: string) => {
    const k = leafClass(name, children);
    if (tag) tags.set(tag, k.id);
    return k;
  };
  return {
    id: uid(),
    name,
    notes,
    root: { id: ROOT_ID, children: build(K) },
    tests: testTags.map((row) => newTest(row.map((t) => tags.get(t)!))),
  };
}

export const examples = (): Tree[] => [
  preset(
    "List search (example)",
    "search(list, el): returns the indices of all occurrences of el in list, or -1 if el does not occur or the list is empty. The list can be empty, sorted, unsorted or reverse-sorted. (Lecture example, slides 37–38.)",
    (K) => [
      C("length", [
        K("0", [], "l0"),
        K("1", [
          C("is searched element", [K("no", [], "s1n"), K("yes", [], "s1y")]),
        ]),
        K(">1", [
          C("element occurs", [
            K("no", [], "on"),
            K("once", [], "o1"),
            K(">1", [], "om"),
          ]),
          C("sorting", [
            K("sorted", [], "ss"),
            K("unsorted", [], "su"),
            K("r-sorted", [], "sr"),
          ]),
        ]),
      ]),
    ],
    [["l0"], ["s1n"], ["s1y"], ["on"], ["o1"], ["om"], ["ss"], ["su"], ["sr"]],
  ),
  preset(
    "Shape classifier (example)",
    "A vision system classifies shapes by size (small or large). Large shapes are classified as circle, square or triangle; triangles as equilateral, isosceles or scalene. Exercise: extend the tree so every shape is also classified by colour (red, green, blue). (Slides 39–40.)",
    (K) => [
      C("size", [
        K("small", [], "sm"),
        K("large", [
          C("shape", [
            K("circle", [], "ci"),
            K("square", [], "sq"),
            K("triangle", [
              C("type", [
                K("equilateral", [], "eq"),
                K("isosceles", [], "is"),
                K("scalene", [], "sc"),
              ]),
            ]),
          ]),
        ]),
      ]),
    ],
    [["sm"], ["ci"], ["sq"], ["eq"], ["is"], ["sc"]],
  ),
  preset(
    "Mortgage (example)",
    "Mortgage amount depends on salary (valid range 0–10000), whether the applicant works full time, and age. The age bands depend on full time: full-time [18–35], [36–45], [46–55]; part-time [18–30], [31–40], [41–50]. (Slides 32, 41–42.)",
    (K) => [
      C("salary", [
        K("-1", [], "neg"),
        K(">10000", [], "hi"),
        K("[0, 10000]", [
          C("full time", [
            K("true", [
              C("age", [
                K("<18", [], "t1"),
                K("[18, 35]", [], "t2"),
                K("[36, 45]", [], "t3"),
                K("[46, 55]", [], "t4"),
                K(">55", [], "t5"),
              ]),
            ]),
            K("false", [
              C("age", [
                K("<18", [], "f1"),
                K("[18, 30]", [], "f2"),
                K("[31, 40]", [], "f3"),
                K("[41, 50]", [], "f4"),
                K(">50", [], "f5"),
              ]),
            ]),
          ]),
        ]),
      ]),
    ],
    [
      ["neg"],
      ["hi"],
      ["t1"],
      ["t2"],
      ["t3"],
      ["t4"],
      ["t5"],
      ["f1"],
      ["f2"],
      ["f3"],
      ["f4"],
      ["f5"],
    ],
  ),
];
