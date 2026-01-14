import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Mode = "congregacional" | "ministracion" | "profetico";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta OPENAI_API_KEY en el servidor" },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });

    const {
      language = "es",
      topic = "",
      verse = "",
      style = "Worship pentecostal moderno",
      mode = "congregacional",
      key = "D",
      tempo = 74,
    }: {
      language: "es" | "en";
      topic: string;
      verse: string;
      style: string;
      mode: Mode;
      key: string;
      tempo: number;
    } = body;

    const modeRules =
      mode === "profetico"
        ? `
Incluye una sección final llamada "MINISTRACIÓN / ESPONTÁNEO" con 8-12 líneas cortas tipo canto espontáneo pentecostal.
Que se pueda repetir en altar. Lenguaje reverente, lleno del Espíritu Santo.
`
        : mode === "ministracion"
        ? `
Haz la canción íntima y profunda. Letras de rendición, presencia de Dios, oración. Puente muy emocional.
`
        : `
Hazla congregacional, fácil de cantar. Coro fuerte, repetible, memorable.
`;

    const prompt = `
Genera una canción cristiana original estilo ${style}.
Idioma: ${language === "es" ? "Español" : "English"}
Tema: ${topic || "Adoración a Dios"}
Versículo base: ${verse || "N/A"}
Modo: ${mode}
Tonalidad: ${key}
Tempo: ${tempo} BPM

Requisitos:
- Estructura: Verso 1, Coro, Verso 2, Coro, Puente, Coro final
- Lírica congregacional, sana doctrina, reverente
- No copiar canciones existentes ni mencionar autores
- Entrega acordes sugeridos que encajen con la tonalidad

${modeRules}

Devuelve SOLO JSON con estructura EXACTA:
{
  "title": "",
  "key": "",
  "tempo": 0,
  "timeSignature": "4/4",
  "chords": ["", "", "", ""],
  "lyrics": ""
}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Eres un compositor cristiano pentecostal. Escribes letras bíblicas y reverentes con estructura de adoración congregacional.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    const data = JSON.parse(raw);

    // normaliza
    const result = {
      title: String(data.title || "Alabanza nueva"),
      key: String(data.key || key),
      tempo: Number(data.tempo || tempo),
      timeSignature: String(data.timeSignature || "4/4"),
      chords: Array.isArray(data.chords) ? data.chords.map(String) : ["G", "D", "Em", "C"],
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
