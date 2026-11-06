export const uid = () => Math.random().toString(36).slice(2, 10);

export const label = (s: string | undefined) =>
  s && s.trim() ? s : "(unnamed)";
