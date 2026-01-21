// app/api/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Body = {
  language?: "es" | "en";
  topic?: string;
  verse?: string;
  style?: string;
  key?: string;
  tempo?: number;
  previousLyrics?: string[];
  scriptureFocus?: string | null; // ej: "marcos 10:46-52"
};

function normalizeScriptureFocus(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.]/g, "")
    .replace(/—/g, "-")
    .replace(/–/g, "-");
}

// Convierte "marcos 10:46-52" a "Mark 10:46-52"
function mapBookToEnglish(bookEs: string) {
  const map: Record<string, string> = {
    genesis: "Genesis",
    exodo: "Exodus",
    levitico: "Leviticus",
    numeros: "Numbers",
    deuteronomio: "Deuteronomy",

    josue: "Joshua",
    jueces: "Judges",
    rut: "Ruth",
    samuel: "Samuel",
    reyes: "Kings",
    cronicas: "Chronicles",
    esdras: "Ezra",
    nehemias: "Nehemiah",
    ester: "Esther",
    job: "Job",
    salmo: "Psalms",
    salmos: "Psalms",
    proverbios: "Proverbs",
    eclesiastes: "Ecclesiastes",
    cantares: "Song of Solomon",
    isaias: "Isaiah",
    jeremias: "Jeremiah",
    lamentaciones: "Lamentations",
    ezequiel: "Ezekiel",
    daniel: "Daniel",

    oseas: "Hosea",
    joel: "Joel",
    amos: "Amos",
    abdias: "Obadiah",
    jonas: "Jonah",
    miqueas: "Micah",
    nahum: "Nahum",
    habacuc: "Habakkuk",
    sofonias: "Zephaniah",
    hageo: "Haggai",
    zacarias: "Zechariah",
    malaquias: "Malachi",

    mateo: "Matthew",
    marcos: "Mark",
    lucas: "Luke",
    juan: "John",
    hechos: "Acts",
    romanos: "Romans",
    corintios: "Corinthians",
    galatas: "Galatians",
    efesios: "Ephesians",
    filipenses: "Philippians",
    colosenses: "Colossians",
    tesalonicenses: "Thessalonians",
    timoteo: "Timothy",
    tito: "Titus",
    filemon: "Philemon",
    hebreos: "Hebrews",
    santiago: "James",
    pedro: "Peter",
    judas: "Jude",
    apocalipsis: "Revelation",
  };

  return map[bookEs] || null;
}

// Extrae "marcos" y "10:46-52"
function parseScriptureFocus(s: string) {
  const cleaned = normalizeScriptureFocus(s);

  // soporta: "1 tesalonicenses 4:16-18"
  const match = cleaned.match(
    /^(?:(\d)\s*)?([a-záéíóúñ]+)\s+(\d+:\d+(?:-\d+)?)$/i
  );
  if (!match) return null;

  const num = match[1] ? `${match[1]} ` : "";
  const book = match[2];
  const ref = match[3];

  const englishBook = mapBookToEnglish(book);
  if (!englishBook) return null;

  // Si es libro con número, lo pegamos (ej: 1 Thessalonians)
  const fullEnglish = `${num}${englishBook}`.trim();

  return { bookEs: `${num}${book}`.trim(), bookEn: fullEnglish, ref };
}

async function fetchScripturePassage(scriptureFocus: string) {
  const parsed = parseScriptureFocus(scriptureFocus);
  if (!parsed) return null;

  // bible-api: "Mark 10:46-52"
  const query = encodeURIComponent(`${parsed.bookEn} ${parsed.ref}`);

  // translation web = World English Bible (libre)
  const url = `https://bible-api.com/${query}?translation=web`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();

  const text: string = String(data?.text || "").trim();
  const reference: string = String(data?.reference || "").trim(); // ej "Mark 10:46-52"
  const translation: string = String(data?.translation_name || "WEB");

  if (!text) return null;

  return {
    reference,
    translation,
    text,
    parsed,
  };
}

export async function POST(req: Request) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Falta OPENAI_API_KEY en el servidor" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as Body;

    const previousLyrics: string[] = body.previousLyrics ?? [];

    const language = body.language ?? "es";
    const style = (body.style ?? "Worship pentecostal congregacional").trim();
    const key = (body.key ?? "D").trim();
    const tempo = Number(body.tempo ?? 74);
    const topic = (body.topic ?? "").trim();
    const verse = (body.verse ?? "").trim();
    const scriptureFocus = (body.scriptureFocus ?? null)?.trim() || null;

    // ✅ Descargar pasaje bíblico REAL si detectó referencia
    const scripture =
      scriptureFocus ? await fetchScripturePassage(scriptureFocus) : null;

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const scriptureBlock = scripture
      ? `
SCRIPTURE PASSAGE (MANDATORY):
Reference (user): ${scriptureFocus}
Reference (api): ${scripture.reference}
Translation: ${scripture.translation}
Text:
${scripture.text}

STRICT RULE:
- You MUST anchor the whole song to the passage above.
- Include a bridge that strongly paraphrases the key lines of this passage.
- Do NOT add generic imagery that is not in the passage.
`
      : `
SCRIPTURE PASSAGE:
NONE
(If user gave a Bible reference, you MUST ask implicitly by generating based on it. But here none was provided.)
`;

    const prompt =
      language === "es"
        ? `
Eres un compositor cristiano pentecostal y teológico profesional.

Genera UNA canción completa para congregación y escenario, con:
- Título (debe ser ÚNICO y acorde a la petición del usuario)
- Tonalidad: ${key}
- Tempo: ${tempo} BPM
- Estilo: ${style}
- Tema: ${topic || "adoración / fe / gracia"}
- Versículo base: ${verse || "ninguno"}

REQUISITOS (STRICT):
- Debe ser bíblica, cristocéntrica, doctrinalmente sólida.
- No uses frases genéricas tipo: "sombra de tus alas", "valle", "tormenta" si no están en el pasaje solicitado.
- Debe sonar a:
  (1) congregacional pentecostal (coro fácil, repetible)
  (2) himno teológico profundo (versos con doctrina)
  (3) adoración reverente (puente con santidad, gloria, Cordero)
- CORO obligatorio:
  - debe mencionar explícitamente Jesús / Jesucristo / Señor Jesús
  - debe incluir al menos una palabra: "gracia" o "cruz" o "sangre" o "redención" o "salvación"
- PUENTE:
  - NO puede ser básico
  - debe ser bíblico y fuerte
  - debe incluir 4+ conceptos del pasaje (si hay pasaje)

${scriptureBlock}

NO REPITAS LETRAS ANTERIORES:
${previousLyrics.length ? previousLyrics.join("\n---\n") : "NONE"}

Responde SOLO en JSON con este formato exacto:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...", "..."],
  "lyrics": "...",
  "bibleReferences": ["...", "..."],
  "scriptureFocus": "${scriptureFocus || ""}"
}
`
        : `
You are a professional Christian songwriter (Pentecostal + hymn theological depth).

Generate ONE complete worship song with:
- Title (must be UNIQUE)
- Key: ${key}
- Tempo: ${tempo} BPM
- Style: ${style}
- Topic: ${topic || "worship / faith / grace"}
- Base verse: ${verse || "none"}

REQUIREMENTS (STRICT):
- Must be deeply biblical and Christ-centered.
- The chorus must be congregational and clearly mention Jesus Christ.
- The bridge MUST be strong and scripture-heavy (not generic).

${scriptureBlock}

PREVIOUS LYRICS (DO NOT REPEAT):
${previousLyrics.length ? previousLyrics.join("\n---\n") : "NONE"}

Reply ONLY in JSON:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...", "..."],
  "lyrics": "...",
  "bibleReferences": ["...", "..."],
  "scriptureFocus": "${scriptureFocus || ""}"
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    // parse JSON
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) data = JSON.parse(text.slice(start, end + 1));
      else throw new Error("La IA no devolvió JSON válido.");
    }

    const result = {
      title: String(data.title || "Canción generada"),
      key: String(data.key || key),
      tempo: Number(data.tempo || tempo),
      timeSignature: String(data.timeSignature || "4/4"),
      chords: Array.isArray(data.chords) ? data.chords.map(String) : [],
      lyrics: String(data.lyrics || ""),
      bibleReferences: Array.isArray(data.bibleReferences)
        ? data.bibleReferences.map(String)
        : [],
      scriptureFocus: String(data.scriptureFocus || scriptureFocus || ""),
      scriptureText: scripture ? scripture.text : null, // ✅ opcional útil para debug UI
      scriptureReference: scripture ? scripture.reference : null,
      scriptureTranslation: scripture ? scripture.translation : null,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en /api/generate" },
      { status: 500 }
    );
  }
}
