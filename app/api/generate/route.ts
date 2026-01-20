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
};

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
    const topic = (body.topic ?? "").trim();
    const verse = (body.verse ?? "").trim();
    const style = (body.style ?? "Worship pentecostal moderno").trim();
    const key = (body.key ?? "D").trim();
    const tempo = Number(body.tempo ?? 74);

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    const prompt =
      language === "es"
        ? `
Eres un compositor cristiano profesional.

Genera UNA canción completa para congregación y escenario, con:
- Título
- Tonalidad: ${key}
- Tempo: ${tempo} BPM
- Estilo: ${style}
- Tema: ${topic || "adoración / fe / gracia"}
- Versículo base: ${verse || "ninguno"}

REQUISITOS:
- Letra con estructura: Intro (opcional), Verso 1, Pre-coro, Coro, Verso 2, Puente, Coro final.
- Debe ser bíblica, edificante, con lenguaje natural.
- Dame también acordes sugeridos (progresión por sección).
- Usa cifrado moderno: D, G, A, Bm, F#m, Em, etc.

Responde SOLO en JSON con este formato exacto:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...","..."],
  "lyrics": "..."
}
`
        : `
You are a professional Christian songwriter.

Generate ONE complete worship song with:
- Title
- Key: ${key}
- Tempo: ${tempo} BPM
- Style: ${style}
- Topic: ${topic || "worship / faith / grace"}
- Base verse: ${verse || "none"}

REQUIREMENTS (STRICT):
- The song MUST be deeply biblical and Christ-centered (not generic motivational).
- Use Bible language and theology (repentance, grace, holiness, faith, the cross, resurrection).
- The message MUST align with Scripture and historic Christian doctrine.
- Avoid vague phrases like “positive vibes”, “universe”, “energy”, “manifest”, etc.

- Include AT LEAST 2 Bible verse references in the lyrics (example: Psalm 23:1, John 3:16).
- Optionally paraphrase Scripture lines (do not quote long passages).
- Use worship vocabulary: Señor, Jesucristo, Cordero de Dios, Rey, Gloria, Santidad, Misericordia.
- Mention at least ONE of these themes clearly:
  * the Gospel / salvation through Christ
  * the cross and redemption
  * repentance and surrender
  * God's holiness and majesty
  * God's faithfulness and grace

- Structure: Intro (optional), Verse 1, Pre-Chorus (optional), Chorus, Verse 2, Bridge, Final Chorus.
- Provide suggested chords per section.
- Use modern chord symbols: D, G, A, Bm, F#m, Em, etc.
- The title MUST be unique and match the user's topic/prompt (do NOT reuse generic titles).
- The lyrics MUST be 100% original and MUST NOT repeat any phrases from previous songs.


PREVIOUS LYRICS (DO NOT REPEAT):
${previousLyrics?.length ? previousLyrics.join("\n---\n") : "NONE"}

Reply ONLY in JSON with this exact format:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...","..."],
  "lyrics": "..."
  "bibleReferences": ["...","..."]

}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    // Intentar parsear JSON
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Si vino con texto extra, intentamos extraer el JSON
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
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en /api/generate" },
      { status: 500 }
    );
  }
}
