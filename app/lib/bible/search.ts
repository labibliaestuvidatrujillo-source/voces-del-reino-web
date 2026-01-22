// app/lib/bible/search.ts

export type BibleVerse = {
  book: string; // ej: "Génesis"
  chapter: number;
  verse: number;
  text: string;
};

type BibleData = {
  version: string;
  verses: BibleVerse[];
};

let cachedBible: BibleData | null = null;

async function loadBible(): Promise<BibleData> {
  if (cachedBible) return cachedBible;

  // ✅ Import JSON local (NO Internet)
  const mod = await import("./rvr1909.json");
  cachedBible = (mod.default || mod) as BibleData;

  if (!cachedBible || !Array.isArray(cachedBible.verses)) {
    cachedBible = { version: "RVR1909", verses: [] };
  }

  return cachedBible;
}

// Limpia texto para match simple
function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ✅ Busca pasaje exacto si el usuario escribe "1 tesalonicenses 4:16-18"
export async function findPassageByReference(reference: string) {
  const bible = await loadBible();
  const ref = normalize(reference);

  // intenta sacar "libro cap:verso-verso"
  const m = ref.match(
    /^(1|2|3)?\s*([a-zñ\s]+)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/
  );
  if (!m) return null;

  const nBook = (m[1] ? `${m[1]} ` : "") + m[2];
  const chapter = Number(m[3]);
  const vStart = Number(m[4]);
  const vEnd = Number(m[5] || m[4]);

  // match libro por includes
  const bookNorm = normalize(nBook);

  const verses = bible.verses.filter((v) => {
    return (
      normalize(v.book).includes(bookNorm) &&
      v.chapter === chapter &&
      v.verse >= vStart &&
      v.verse <= vEnd
    );
  });

  if (!verses.length) return null;

  const text = verses.map((v) => `${v.verse}. ${v.text}`).join("\n");
  const focus = `${verses[0].book} ${chapter}:${vStart}${vEnd !== vStart ? `-${vEnd}` : ""
    }`;

  return { focus, verses, text };
}

// ✅ Busca por tema: "creación", "redención", "arrepentimiento", etc.
export async function searchBibleByKeywords(query: string, limit = 10) {
  const bible = await loadBible();
  const q = normalize(query);

  if (!q || q.length < 3) return [];

  const words = q.split(" ").filter((w) => w.length >= 3);
  if (!words.length) return [];

  const scored: { v: BibleVerse; score: number }[] = [];

  for (const v of bible.verses) {
    const txt = normalize(v.text);
    let score = 0;
    for (const w of words) {
      if (txt.includes(w)) score += 1;
    }
    if (score > 0) scored.push({ v, score });
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((x) => x.v);
}

export function buildScriptureFocusFromMatches(matches: BibleVerse[]) {
  if (!matches.length) return null;

  const top = matches[0];
  return `${top.book} ${top.chapter}:${top.verse}`;
}

export function formatMatchesToPromptBlock(matches: BibleVerse[]) {
  if (!matches.length) return "NONE";

  return matches
    .map(
      (v) => `- ${v.book} ${v.chapter}:${v.verse} — ${v.text}`
    )
    .join("\n");
}
