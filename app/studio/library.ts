export type SongResult = {
  title: string;
  key: string;
  tempo: number;
  timeSignature: string;
  chords: string[];
  lyrics: string;
  notes?: {
    scale?: string;
    hookNotes?: string[];
  };
};

export type SavedSong = {
  id: string;
  createdAt: number;
  input: {
    language: "es" | "en";
    topic: string;
    verse: string;
    style: string;
    key: string;
    tempo: number;
  };
  result: SongResult;
};

const STORAGE_KEY = "voces_del_reino_saved_songs_v1";

export function loadSongs(): SavedSong[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveSongs(songs: SavedSong[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

export function addSong(song: SavedSong) {
  const songs = loadSongs();
  songs.unshift(song); // newest first
  saveSongs(songs.slice(0, 50)); // top 50
}

export function deleteSong(id: string) {
  const songs = loadSongs().filter((s) => s.id !== id);
  saveSongs(songs);
}

export function getSong(id: string): SavedSong | null {
  const songs = loadSongs();
  return songs.find((s) => s.id === id) || null;
}

export function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}
