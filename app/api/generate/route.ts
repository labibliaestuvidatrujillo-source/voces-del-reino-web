// app/api/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  findPassageByReference,
  searchBibleByKeywords,
  buildScriptureFocusFromMatches,
  formatMatchesToPromptBlock,
} from "../../studio/lib/bible/search";




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
  prompt?: string; // 👈 lo usaremos para detectar texto libre del usuario
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

    const language = body.language ?? "es";
    const topic = (body.topic ?? "").trim();
    const verse = (body.verse ?? "").trim();
    const style = (body.style ?? "Worship pentecostal moderno").trim();
    const key = (body.key ?? "D").trim();
    const tempo = Number(body.tempo ?? 74);
    const previousLyrics: string[] = body.previousLyrics ?? [];

    // ✅ prompt principal (mensaje del usuario)
    const userPrompt = String(body.prompt ?? "").trim();

    // ✅ scriptureFocus: referencia explícita si viene desde frontend
    const scriptureFocus = (body.scriptureFocus ?? "").trim() || null;

    // ------------------------------------------------------------
    // ✅ BIBLE SEARCH / ANCHOR
    // ------------------------------------------------------------
    // 1) Si el usuario pone referencia tipo "1 Tesalonicenses 4:16-18"
    // intentamos traer el pasaje exacto.
    // 2) Si no, buscamos por keywords dentro de la Biblia (JSON local)
    // ------------------------------------------------------------

    let bibleBlock = "";
    let resolvedFocus = scriptureFocus;

    // 1) Intentar pasaje por referencia (si existe)
    if (resolvedFocus) {
      const passage = findPassageByReference(resolvedFocus);
      if (passage) {
        bibleBlock = `
PASO BÍBLICO BASE (OBLIGATORIO):
Referencia: ${resolvedFocus}

Texto (RVR):
${passage}
`;
      }
    }

    // 2) Si no hubo pasaje, buscar por keywords del prompt del usuario
    if (!bibleBlock && userPrompt.length >= 3) {
      const matches = await searchBibleByKeywords(userPrompt, 10); // top 10 coincidencias

      if (matches.length > 0) {
        resolvedFocus = buildScriptureFocusFromMatches(matches);

        bibleBlock = `
ENCONTRÉ ESTOS TEXTOS BÍBLICOS RELACIONADOS (ÚSALOS COMO BASE):
${formatMatchesToPromptBlock(matches)}
`;
      }
    }

    // ------------------------------------------------------------
    // ✅ SCRIPTURE RULES (STRICT) - MÁS BÍBLICO + ANCLAJE
    // ------------------------------------------------------------
    const scriptureRules = `
- La canción DEBE ser profundamente bíblica, Cristocéntrica y congregacional (no motivacional genérica).
- La letra DEBE sonar a himno teológico + adoración + pentecostal congregacional.
- NO uses imágenes genéricas como "tormenta", "sombra de tus alas", "valle" si no aparecen en los textos base.
- La letra debe contener doctrina: evangelio, cruz, sangre, redención, santidad, arrepentimiento, resurrección, gloria.
- Coro fácil de cantar por toda la iglesia (repetible, simple, poderoso).
- El PUENTE debe ser ADORACIÓN bíblica intensa: Santo, Gloria, Digno, Cordero, Rey, Trono, Aleluya, Majestad.
- El coro debe mencionar explícitamente: Jesús / Jesucristo / Señor Jesús.
- El coro debe incluir al menos UNA palabra clave: "cruz" o "sangre" o "redención" o "salvación".
- Si se detecta un pasaje bíblico base, la canción debe seguir ese pasaje y NO desviarse.
`;

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });

    // ------------------------------------------------------------
    // ✅ PROMPT FINAL (ES / EN)
    // ------------------------------------------------------------
    const prompt =
      language === "es"
        ? `
Eres un compositor cristiano profesional (pentecostal congregacional + adoración + himno teológico profundo).

OBJETIVO:
Genera UNA canción COMPLETA para iglesia, basada en Biblia.

CONFIGURACIÓN:
- Tonalidad: ${key}
- Tempo: ${tempo} BPM
- Estilo: ${style}
- Tema: ${topic || "adoración / fe / gracia"}
- Prompt del usuario: ${userPrompt || "N/A"}

${bibleBlock || ""}

REQUISITOS (STRICT):
${scriptureRules}

NO REPITAS LETRAS ANTERIORES (prohibido repetir frases, líneas o estructuras):
${previousLyrics.length ? previousLyrics.join("\n---\n") : "NONE"}

RESPONDE SOLO EN JSON con este formato EXACTO:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...","..."],
  "lyrics": "...",
  "bibleReferences": ["...", "..."],
  "scriptureFocus": "${resolvedFocus || ""}"
}
`
        : `
You are a professional Christian songwriter.

Generate ONE complete worship song:
- Key: ${key}
- Tempo: ${tempo} BPM
- Style: ${style}
- Topic: ${topic || "worship / faith / grace"}
- User prompt: ${userPrompt || "N/A"}

REQUIREMENTS (STRICT):
- Must be deeply biblical and Christ-centered.
- Chorus must explicitly mention Jesus Christ.
- Must include 2-4 real Bible references.

Return ONLY JSON:
{
  "title": "...",
  "key": "${key}",
  "tempo": ${tempo},
  "timeSignature": "4/4",
  "chords": ["...","..."],
  "lyrics": "...",
  "bibleReferences": ["...", "..."],
  "scriptureFocus": "${resolvedFocus || ""}"
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      messages: [{ role: "user", content: prompt }],
    });

    const text = completion.choices?.[0]?.message?.content ?? "";

    // ✅ parse JSON
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
      scriptureFocus: String(data.scriptureFocus || resolvedFocus || ""),
    };

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en /api/generate" },
      { status: 500 }
    );
  }
}
