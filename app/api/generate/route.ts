// app/api/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Body = {
  language?: "es" | "en";
  topic?: string;
  verse?: string;
  style?: string;
  key?: string; // tonalidad
  tempo?: number;

  previousLyrics?: string[];
  scriptureFocus?: string | null;
};

const scriptureRules = `
REQUIREMENTS (STRICT):
- The song MUST be deeply biblical and Christ-centered (not generic motivational).
- Use Bible language and theology (repentance, grace, holiness, faith, the cross, resurrection).
- The message MUST align with Scripture and historic Christian doctrine.
- Avoid vague phrases like "positive vibes", "universe", "energy", "manifest", etc.

STYLE & SPIRIT (VERY IMPORTANT):
- Style must combine:
  (1) Pentecostal congregational worship (simple, powerful, repeatable),
  (2) Theological hymn depth (rich doctrine, reverent language),
  (3) Adoration worship atmosphere (reverent, Holy Spirit, holiness).
- The chorus MUST be easy to sing by the whole church (short, repetitive, memorable).
- The verses MUST be doctrinally deep (like a hymn): Gospel, cross, grace, holiness, repentance, Christ-centered.
- Include a worship/adoration bridge that elevates spiritually (themes: "Santo", "Gloria", "Digno", "Cordero", "Rey").
- Avoid overly poetic unclear metaphors; keep it biblical, direct, and usable in church.

CHORUS POWER RULE:
- The chorus MUST explicitly mention Jesus Christ (Jesús / Jesucristo / Señor Jesús).
- The chorus MUST contain at least one of: "gracia", "cruz", "sangre", "salvación", "redención".

ANTI-GENERIC RULE:
- Avoid generic imagery not connected to the requested passage:
  (example: "sombra de tus alas", "valle", "tormenta")
  unless that imagery is explicitly in the requested Bible passage.

SCRIPTURE ANCHOR (MANDATORY):
- If the user provides a Bible passage (example: "1 Tesalonicenses 4:16-18"), you MUST base the entire song on that passage.
- You MUST include the main doctrines and keywords of that passage in the lyrics.
- You MUST NOT ignore the passage and produce generic worship lyrics.
- You MUST paraphrase the passage faithfully and keep theological accuracy.
- You MUST include at least 4 explicit concepts from the passage.
`;

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
    const topic = (body.topic ?? "").trim();
    const verse = (body.verse ?? "").trim();
    const style = (body.style ?? "Pentecostal congregacional + himno teológico profundo + adoración").trim();
    const key = (body.key ?? "D").trim();
    const tempo = Number(body.tempo ?? 74);

    const previousLyrics: string[] = body.previousLyrics ?? [];

    // 📌 Detectar pasaje bíblico desde verse o topic si el usuario lo puso ahí
    const combined = `${topic}\n${verse}`;
    const m = normalize(combined).match(
      /(tesalonicenses|salmo|juan|romanos|apocalipsis|mateo|marcos|lucas|hebreos|corintios|efesios|filipenses|colosenses|timoteo|tito|pedro|santiago|judas)\s*\d+:\d+(-\d+)?/i
    );
    const scriptureFocus = body.scriptureFocus ?? (m ? m[0] : null);

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const prompt =
      language === "es"
        ? `
Eres un compositor cristiano pentecostal y teólogo bíblico.

Genera UNA canción de adoración congregacional (Pentecostal) con profundidad teológica (estilo himno doctrinal).

DATOS:
- Tonalidad: ${key}
- Tempo: ${tempo} BPM
- Estilo: ${style}
- Tema: ${topic || "adoración / fe / gracia"}
- Versículo/pasaje solicitado por el usuario: ${verse || "ninguno"}
- Scripture Focus detectado: ${scriptureFocus || "NONE"}

${scriptureRules}

UNIQUE TITLE RULE:
- El título DEBE ser único y específico del mensaje/pasaje.
- NO repitas títulos como "Tu Gracia Me Sostiene", "Mi Refugio", etc.

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
You are a professional Christian pentecostal worship songwriter with strong biblical theology.

Generate ONE complete worship song with:
- Key: ${key}
- Tempo: ${tempo} BPM
- Style: ${style}
- Topic: ${topic || "worship / faith / grace"}
- Passage requested: ${verse || "none"}
- Scripture focus: ${scriptureFocus || "NONE"}

${scriptureRules}

DO NOT repeat previous lyrics:
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
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    // Parse JSON
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
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en /api/generate" },
      { status: 500 }
    );
  }
}
