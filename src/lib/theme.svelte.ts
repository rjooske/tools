import { MediaQuery } from "svelte/reactivity";

const KEY = "tools-theme";

type ThemeName = "light" | "dark";

function readStored(): ThemeName | null {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

class Theme {
  #system = new MediaQuery("(prefers-color-scheme: dark)");
  #chosen = $state(readStored());

  constructor() {
    if (this.#chosen) document.documentElement.dataset.theme = this.#chosen;
  }

  get dark() {
    return this.#chosen ? this.#chosen === "dark" : this.#system.current;
  }

  toggle() {
    const next = this.dark ? "light" : "dark";
    this.#chosen = next;
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // The choice just won't survive a reload.
    }
  }
}

export const theme = new Theme();
