import { z } from "zod";
import {
  TABLE_STORE_KEY,
  THEME_KEY,
  TREE_DOTS_KEY,
  TREE_STORE_KEY,
} from "./storage-keys";

const FORMAT = "tools-backup";
const VERSION = 1;

const collection = z.object({
  docs: z.array(z.looseObject({ id: z.string(), name: z.string() })).min(1),
  currentId: z.string(),
});

const backupSchema = z.object({
  format: z.literal(FORMAT),
  version: z.literal(VERSION),
  exportedAt: z.string(),
  // Only these keys are backed up: the origin is shared with other GitHub Pages
  // sites, so the backup can't just take all of localStorage.
  data: z.object({
    [THEME_KEY]: z.enum(["light", "dark"]).optional(),
    [TREE_STORE_KEY]: collection.optional(),
    [TREE_DOTS_KEY]: z.union([z.literal(0), z.literal(1)]).optional(),
    [TABLE_STORE_KEY]: collection.optional(),
  }),
});

type Backup = z.infer<typeof backupSchema>;
type Key = keyof Backup["data"];

const KEYS = Object.keys(backupSchema.shape.data.shape) as Key[];

// Values are stored parsed so the file is readable; a value that isn't JSON
// (such as the theme name) is kept as a plain string.
function decode(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const encode = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);

export function exportAll(): string {
  const data: Backup["data"] = {};
  for (const key of KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) Object.assign(data, { [key]: decode(raw) });
  }
  const backup: Backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(backup, null, 2);
}

/** Replaces all app data with the backup's. Returns an error message on failure. */
export function importAll(text: string): string | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return "That file is not valid JSON.";
  }
  const parsed = backupSchema.safeParse(json);
  if (!parsed.success) {
    return `That file is not a valid backup from this app:\n${z.prettifyError(parsed.error)}`;
  }
  const { data } = parsed.data;
  try {
    for (const key of KEYS) {
      const value = data[key];
      if (value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, encode(value));
    }
  } catch {
    return "Could not write to browser storage.";
  }
  return null;
}
