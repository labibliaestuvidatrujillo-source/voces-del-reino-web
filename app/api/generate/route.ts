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
  scriptureFocus?: string | null;
};

const ALLOWED_REFERENCES = [
  "Psalm 23:1",
  "Psalm 27:1",
  "Psalm 46:1",
  "Psalm 91:1",
  "Psalm 103:1-5",
  "Isaiah 6:3",
  "Isaiah 40:31",
  "Isaiah 53:5",
  "Isaiah 54:10",
  "Matthew 11:28",
  "Matthew 28:20",
  "John 1:29",
  "John 3:16",
  "John 4:23-24",
  "John 14:6",
  "Romans 5:8",
  "Romans 8:1",
  "Romans 8:28",
  "2 Corinthians 5:17",
  "Galatians 2:20",
  "Ephesians 2:8-9",
  "Ephesians 3:20",
  "Philippians 4:6-7",
  "Philippians 4:13",
  "Colossians 1:13-14",
  "Hebrews 4:16",
  "Hebrews 12:2",
  "Revelation 5:12",
  "Revelation 19:6",
];

function normalizeStr(s: string) {
  return (s || "").replace(/\s+/g, " ").trim();
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

    const language = body.language ?? "es";
    const topic = normalizeStr(body.topic ?? "");
    const verse = normalizeStr(body.verse ?? "");
    const style = normalizeStr(body.style ?? "Worship pentecostal moderno");
    const key = normalizeStr(body.key ?? "D") || "D";
    const tempo = Number(body.tempo ?? 74);

    const previousLyrics: string[] = Array.isArray(body.previousLyrics)
      ? body.previousLyrics.map((x) => String(x)).filter(Boolean)
      : [];

    const scriptureFocus = body.scriptureFocus ? String(body.scriptureFocus) : null;

    // ✅ reglas super estrictas cuando hay pasaje bíblico
    const scriptureRules_es = scriptureFocus
      ? `
ANCLAJE BÍBLICO (MANDATORIO):
- El usuario pidió explícitamente: "${scriptureFocus}".
- TODA la canción debe basarse en ese pasaje (no solo una línea).
- Debes incluir y desarrollar al menos 6 conceptos del pasaje (no genérico), por ejemplo:
  * la trompeta / voz de mando / arcángel (si aplica)
  * resurrección de los muertos en Cristo
  * arrebatamiento / ser levantados juntos
  * encuentro con el Señor en el aire
  * consuelo y esperanza para la iglesia
  * vivir/estar para siempre con el Señor
- NO uses metáforas genéricas ("sombra de tus alas", "valle", "tormenta") si NO aparecen en el pasaje pedido.
- No cambies el tema a "cruz/sangre" si el pasaje no lo menciona.
- El CORO debe repetir y declarar la verdad central del pasaje (debe sonar congregacional y directo).

REGLA ANTI-GENÉRICO:
- Cada sección (Verso 1, Pre-coro, Coro, Verso 2, Puente) debe contener al menos 1 frase directamente conectada al pasaje.
- Prohibido frases “relleno” no conectadas al texto.

REFERENCIAS BÍBLICAS (REAL):
- En "bibleReferences" SOLO puedes usar referencias reales y comunes de esta lista:
${ALLOWED_REFERENCES.map((r) => `  - ${r}`).join("\n")}
- NO inventes referencias bíblicas. NO uses referencias fuera de esta lista.
`
      : `
REQUISITOS BÍBLICOS (STRICT):
- Canción profundamente bíblica y centrada en Cristo.
- Lenguaje de adoración congregacional pentecostal.
- Evitar frases vacías ("energía", "universo", "manifestar").
- El coro debe mencionar explícitamente a Jesús (Jesús / Jesucristo / Señor Jesús).
- Incluir 2 a 4 referencias bíblicas reales en "bibleReferences".
REFERENCIAS PERMITIDAS:
${ALLOWED_REFERENCES.map((r) => `  - ${r}`).join("\n")}
`;

    const scriptureRules_en = scriptureFocus
      ? `
SCRIPTURE ANCHOR (MANDATORY):
- The user explicitly requested: "${scriptureFocus}".
- The ENTIRE song must be based on that passage (not only one line).
- Include at least 6 explicit concepts from that passage (not generic).
- Do NOT introduce unrelated generic imagery ("valley", "storm", "shadow of wings") unless in the passage.
- The CHORUS must clearly declare the main doctrine of the passage (easy for congregation).

BIBLE REFERENCES (REAL):
- In "bibleReferences" you may ONLY use references from this allowed list:
${ALLOWED_REFERENCES.map((r) => `  - ${r}`).join("\n")}
- Do NOT invent references.
`
      : `
STRICT REQUIREMENTS:
- Deeply biblical and Christ-centered worship.
- Congregational pentecostal worship style.
- No vague motivational phrases.
- Chorus must mention Jesus explicitly.
- Include 2-4 real Bible references (from allowed list only).
ALLOWED REFERENCES:
${ALLOWED_REFERENCES.map((r) => `  - ${r}`).join("\n")}
`;

    const antiRepeatBlock = `
NO REPITAS LETRAS ANTERIORES:
${previousLyrics.length ? previousLyrics.join("\n---\n") : "NONE"}
`;

    const systemStyle_es = `
ESTILO & ESPÍRITU (MUY IMPORTANTE):
- Estilo mixto obligatorio:
  (1) Worship pentecostal congregacional (simple, fuerte, repetible)
  (2) Profundidad de himno teológico (doctrina clara, reverencia)
  (3) Atmosfera de adoración (santidad, gloria, rendición)
- Coro: corto, repetible, memorable (cantable por toda la iglesia).
- Versos: doctrina sólida, bíblica, directa, sin metáforas vacías.
- Puente: adoración elevada (Santo / Digno / Cordero / Rey / Gloria).
`;

    const systemStyle_en = `
STYLE & SPIRIT:
- Must combine: pentecostal congregational worship + hymn theological depth + adoration.
- Chorus: short, repeatable, congregational.
- Verses: doctrinally solid, biblical, clear.
- Bridge: pure adoration (Holy, Worthy, Lamb, King).
`;

    const prompt =
      language === "es"
        ? `
Eres un compositor cristiano profesional.

Genera UNA canción completa para congregación y escenario, con:
- Título (único y relacionado al pedido)
- Tonalidad: ${key}
- Tempo: ${tempo} BPM
- Estilo: ${style}
- Tema: ${topic || "adoración / fe / gracia"}
- Versículo base (si lo hay): ${verse || "ninguno"}
- Pasaje bíblico pedido (si lo hay): ${scriptureFocus || "NINGUNO"}

${systemStyle_es}

REQUISITOS (STRICT):
${scriptureRules_es}

${antiRepeatBlock}

Responde SOLO en JSON con este formato exacto:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...","..."],
  "lyrics": "...",
  "bibleReferences": ["...","..."]
}
`
        : `
You are a professional Christian songwriter.

Generate ONE complete worship song with:
- Title (unique and matching request)
- Key: ${key}
- Tempo: ${tempo} BPM
- Style: ${style}
- Topic: ${topic || "worship / faith / grace"}
- Base verse (if any): ${verse || "none"}
- Requested scripture passage (if any): ${scriptureFocus || "NONE"}

${systemStyle_en}

REQUIREMENTS (STRICT):
${scriptureRules_en}

PREVIOUS LYRICS (DO NOT REPEAT):
${previousLyrics.length ? previousLyrics.join("\n---\n") : "NONE"}

Reply ONLY in JSON with this exact format:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...","..."],
  "lyrics": "...",
  "bibleReferences": ["...","..."]
}
`;

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    // parsear JSON
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start >= 0 && end > start) {
        data = JSON.parse(text.slice(start, end + 1));
      } else {
        throw new Error("La IA no devolvió JSON válido.");
      }
    }

    // ✅ normalizar salida
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
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en /api/generate" },
      { status: 500 }
    );
  }
}
