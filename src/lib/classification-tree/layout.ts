import { label } from "../util";
import type { Class, Classification, Tree } from "./model";

export const LEFT = 64;
export const ROW_HEIGHT = 32;
const TOP = 26;
const LEVEL_HEIGHT = 58;

export const levelY = (depth: number) => TOP + depth * LEVEL_HEIGHT;

export type Measure = (text: string, weight: number) => number;

type Pos = {
  x: number;
  depth: number;
  /** Classification box width, or a class label's measured text width. */
  width: number;
  empty?: boolean;
  leaf?: boolean;
};

export type Line = { x1: number; y1: number; x2: number; y2: number };

export type Span = { x1: number; x2: number };

export type TreeLayout = {
  pos: Record<string, Pos>;
  edges: Line[];
  leaves: Class[];
  /** Runs of adjacent leaves that share a parent classification. */
  groups: Span[];
  maxDepth: number;
  width: number;
};

export function layoutTree(tree: Tree, measure: Measure): TreeLayout {
  const pos: Record<string, Pos> = {};
  const leaves: Class[] = [];
  const leafParents: string[] = [];
  let x = LEFT;
  let maxDepth = 1;

  const shiftClassification = (c: Classification, dx: number) => {
    if (pos[c.id]) pos[c.id].x += dx;
    c.classes.forEach((k) => shiftClass(k, dx));
  };
  const shiftClass = (k: Class, dx: number) => {
    if (pos[k.id]) pos[k.id].x += dx;
    k.children.forEach((c) => shiftClassification(c, dx));
  };

  function placeClassification(c: Classification, depth: number) {
    maxDepth = Math.max(maxDepth, depth);
    const width = Math.max(48, measure(label(c.name), 500) + 24);
    const need = width + 18;
    const start = x;
    if (!c.classes.length) {
      const w = Math.max(need, 96);
      pos[c.id] = { x: start + w / 2, depth, width, empty: true };
      x += w;
      return;
    }
    c.classes.forEach((k) => placeClass(k, c.id, depth + 1));
    const span = x - start;
    if (span < need) {
      const extra = need - span;
      c.classes.forEach((k) => shiftClass(k, extra / 2));
      x += extra;
    }
    const first = pos[c.classes[0].id];
    const last = pos[c.classes[c.classes.length - 1].id];
    pos[c.id] = { x: (first.x + last.x) / 2, depth, width };
  }

  function placeClass(k: Class, parentId: string, depth: number) {
    maxDepth = Math.max(maxDepth, depth);
    const width = measure(label(k.name), 400);
    const need = width + 20;
    const start = x;
    if (!k.children.length) {
      const w = Math.max(64, need);
      pos[k.id] = { x: start + w / 2, depth, width, leaf: true };
      x += w;
      leaves.push(k);
      leafParents.push(parentId);
      return;
    }
    k.children.forEach((c) => placeClassification(c, depth + 1));
    const span = x - start;
    if (span < need) {
      const extra = need - span;
      k.children.forEach((c) => shiftClassification(c, extra / 2));
      x += extra;
    }
    const first = pos[k.children[0].id];
    const last = pos[k.children[k.children.length - 1].id];
    pos[k.id] = { x: (first.x + last.x) / 2, depth, width };
  }

  const top = tree.root.children;
  top.forEach((c) => placeClassification(c, 1));
  pos[tree.root.id] = {
    x: top.length
      ? (pos[top[0].id].x + pos[top[top.length - 1].id].x) / 2
      : LEFT + 40,
    depth: 0,
    width: 0,
  };

  const edges: Line[] = [];
  const connect = (
    from: Pos,
    fromOffset: number,
    to: Pos,
    toOffset: number,
  ) => {
    edges.push({
      x1: from.x,
      y1: levelY(from.depth) + fromOffset,
      x2: to.x,
      y2: levelY(to.depth) + toOffset,
    });
  };
  const connectClassification = (
    parent: Pos,
    offset: number,
    c: Classification,
  ) => {
    const pc = pos[c.id];
    connect(parent, offset, pc, -13);
    for (const k of c.classes) {
      const pk = pos[k.id];
      connect(pc, 13, pk, -10);
      k.children.forEach((cc) => connectClassification(pk, 9, cc));
    }
  };
  top.forEach((c) => connectClassification(pos[tree.root.id], 5, c));

  const width = Math.max(x, LEFT + 220);
  const groups: Span[] = [];
  leaves.forEach((leaf, i) => {
    if (i > 0 && leafParents[i] === leafParents[i - 1]) return;
    const x1 = i ? (pos[leaves[i - 1].id].x + pos[leaf.id].x) / 2 : LEFT - 8;
    if (groups.length) groups[groups.length - 1].x2 = x1;
    groups.push({ x1, x2: width + 4 });
  });

  return { pos, edges, leaves, groups, maxDepth, width };
}
