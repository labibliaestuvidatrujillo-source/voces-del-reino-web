export type StudioSettings = {
  title: string;
  key: string;
  mode: "major" | "minor";
  minorType?: "natural" | "harmonic" | "melodic";
  bpm: number;
  timeSignature: "4/4" | "3/4" | "6/8";
  prompt: string;
};

export type HistoryItem = {
  id: string;
  createdAt: number;
  settings: StudioSettings;
  result: any;
};

const LS_KEY = "voces-history";

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {}
}

export function addToHistory(item: HistoryItem, maxItems = 25): HistoryItem[] {
  const items = loadHistory();
  const next = [item, ...items].slice(0, maxItems);
  saveHistory(next);
  return next;
}

export function removeFromHistory(id: string): HistoryItem[] {
  const items = loadHistory();
  const next = items.filter((x) => x.id !== id);
  saveHistory(next);
  return next;
}

export function clearHistory(): HistoryItem[] {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {}
  return [];
}

export function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}
