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
- The song MUST be deeply biblical and Christ-centered (not generic motivational).
- Use Bible language and theology (repentance, grace, holiness, faith, the cross, resurrection).
- The message MUST align with Scripture and historic Christian doctrine.
- Avoid vague phrases like “positive vibes”, “universe”, “energy”, “manifest”, etc.

- Include AT LEAST 2 Bible verse references in the lyrics (example: Psalm 23:1, John 3:16).
- Optionally paraphrase Scripture lines (do not quote long passages).
- Use worship vocabulary (Spanish): Señor, Jesucristo, Cordero de Dios, Rey, Gloria, Santidad, Misericordia.
- Mention at least ONE of these themes clearly:
  * the Gospel / salvation through Christ
  * the cross and redemption
  * repentance and surrender
  * God's holiness and majesty
  * God's faithfulness and grace

STYLE & SPIRIT (VERY IMPORTANT):
- Style must combine:
  (1) Pentecostal congregational worship (simple, powerful, repeatable),
  (2) Theological hymn depth (rich doctrine, reverent language),
  (3) Adoration worship atmosphere (reverent, Holy Spirit, holiness).
- Chorus MUST be easy to sing by the whole church (short, repetitive, memorable).
- Verses MUST be doctrinally deep (like a hymn): Gospel, cross, grace, holiness, repentance, Christ-centered.
- Include a worship/adoration bridge that elevates spiritually (themes: "Santo", "Gloria", "Digno", "Cordero", "Rey").
- Avoid overly poetic unclear metaphors; keep it biblical, direct, and usable in church.

STRUCTURE (STRICT):
- Intro (optional), Verse 1, Pre-Chorus (optional), Chorus, Verse 2, Bridge, Final Chorus.
- Provide suggested chords per section.
- Use modern chord symbols: D, G, A, Bm, F#m, Em, etc.
- Title MUST be unique and match the user's topic/prompt (do NOT reuse generic titles).
- Lyrics MUST be 100% original and MUST NOT repeat any phrases from previous songs.

BIBLE REFERENCES (NO FAKE REFERENCES):
- Include 2 to 4 Bible references that are REAL and widely used in worship.

CHORUS POWER RULE:
- Chorus MUST explicitly mention Jesus Christ (Jesús / Jesucristo / Señor Jesús).
- Chorus MUST contain at least one of: "gracia", "cruz", "sangre", "salvación", "redención".

SCRIPTURE ANCHOR (MANDATORY):
- If scriptureFocus is provided (example: "tesalonicenses 4:16-18"), you MUST base the entire song on that passage.
- You MUST include doctrines and keywords from that passage in the lyrics.
- You MUST paraphrase the passage faithfully and keep theological accuracy.
- You MUST include at least 4 explicit concepts from that passage.
- Do NOT ignore the passage and produce generic worship lyrics.

ANTI-GENERIC RULE:
- Avoid generic phrases not connected to the requested passage
  (example: "sombra de tus alas", "valle", "tormenta")
  unless that imagery is explicitly in the requested Bible passage.
`;

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
    const style = (body.style ?? "Worship pentecostal congregacional").trim();
    const key = (body.key ?? "D").trim();
    const tempo = Number(body.tempo ?? 74);

    const scriptureFocus =
      typeof body.scriptureFocus === "string" && body.scriptureFocus.trim()
        ? body.scriptureFocus.trim()
        : null;

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    // ✅ Prompt final
    const prompt =
      language === "es"
        ? `
Eres un compositor cristiano profesional (pentecostal, congregacional y bíblico).

Genera UNA canción completa para congregación y escenario, con:
- Título (NO genérico, único)
- Tonalidad: ${key}
- Tempo: ${tempo} BPM
- Estilo: ${style}
- Tema: ${topic || "adoración / fe / gracia"}
- Versículo base: ${verse || "ninguno"}
- Pasaje bíblico solicitado (si existe): ${scriptureFocus || "NINGUNO"}

REQUISITOS (STRICT):
${scriptureRules}

NO REPITAS LETRAS ANTERIORES (PROHIBIDO repetir frases/líneas/estructuras):
${previousLyrics.length ? previousLyrics.join("\n---\n") : "NONE"}

Responde SOLO en JSON con este formato exacto:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...","..."],
  "lyrics": "...",
  "bibleReferences": ["...", "..."],
  "worshipTags": ["Santo", "Gloria", "Digno"],
  "scriptureFocus": "${scriptureFocus || ""}"
}
`
        : `
You are a professional Christian songwriter.

Generate ONE complete worship song with:
- Title (unique, not generic)
- Key: ${key}
- Tempo: ${tempo} BPM
- Style: ${style}
- Topic: ${topic || "worship / faith / grace"}
- Base verse: ${verse || "none"}
- Scripture focus (if any): ${scriptureFocus || "NONE"}

REQUIREMENTS (STRICT):
${scriptureRules}

DO NOT REPEAT previous lyrics:
${previousLyrics.length ? previousLyrics.join("\n---\n") : "NONE"}

Reply ONLY in JSON:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...","..."],
  "lyrics": "...",
  "bibleReferences": ["...", "..."],
  "worshipTags": ["Holy", "Glory", "Worthy"],
  "scriptureFocus": "${scriptureFocus || ""}"
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
      bibleReferences: Array.isArray(data.bibleReferences)
        ? data.bibleReferences.map(String)
        : [],
      worshipTags: Array.isArray(data.worshipTags)
        ? data.worshipTags.map(String)
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
