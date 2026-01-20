"use client";

import { useMemo, useState } from "react";

type SongResult = {
  title: string;
  key: string;
  tempo: number;
  timeSignature: string;
  chords: string[];
  lyrics: string;
};

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

function normalizeKey(k: string) {
  return k.trim();
}

function transpose(key: string, semitones: number) {
  const idx = KEYS.indexOf(key);
  if (idx === -1) return key;
  const next = (idx + semitones + KEYS.length) % KEYS.length;
  return KEYS[next];
}

const MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE_OFFSETS = [0, 2, 3, 5, 7, 8, 10]; // menor natural

// I ii iii IV V vi vii°
const MAJOR_DEGREE_QUALITIES = ["", "m", "m", "", "", "m", "dim"];

// i ii° III iv v VI VII (menor natural)
const MINOR_DEGREE_QUALITIES = ["m", "dim", "", "m", "m", "", ""];

function buildKeyChords(key: string, mode: "major" | "minor") {
  const K = normalizeKey(key);

  const offsets = mode === "major" ? MAJOR_SCALE_OFFSETS : MINOR_SCALE_OFFSETS;
  const qualities =
    mode === "major" ? MAJOR_DEGREE_QUALITIES : MINOR_DEGREE_QUALITIES;

  const scale = offsets.map((o) => transpose(K, o));

  const chords = scale.map((note, i) => {
    const q = qualities[i];
    if (q === "dim") return `${note}dim`;
    if (q === "m") return `${note}m`;
    return note;
  });

  // progresiones sugeridas
  const suggested =
    mode === "major"
      ? [
          ["I", "V", "vi", "IV"],
          ["I", "IV", "V", "IV"],
          ["vi", "IV", "I", "V"],
        ]
      : [
          ["i", "VII", "VI", "VII"],
          ["i", "VI", "III", "VII"],
          ["i", "iv", "VI", "v"],
        ];

  const romanMapMajor: Record<string, number> = {
    I: 0,
    ii: 1,
    iii: 2,
    IV: 3,
    V: 4,
    vi: 5,
    "vii°": 6,
  };

  const romanMapMinor: Record<string, number> = {
    i: 0,
    "ii°": 1,
    III: 2,
    iv: 3,
    v: 4,
    VI: 5,
    VII: 6,
  };

  const map = mode === "major" ? romanMapMajor : romanMapMinor;

  const romanToChord = (roman: string) => {
    const idx = map[roman];
    if (idx === undefined) return K;
    return chords[idx] ?? K;
  };

  const suggestedChords = suggested.map((p) => p.map(romanToChord));

  return { scale, chords, suggested: suggestedChords };
}

function createPrompt({
  language,
  topic,
  verse,
  style,
  key,
  tempo,
  mode,
  suggestedChords,
}: {
  language: string;
  topic: string;
  verse: string;
  style: string;
  key: string;
  tempo: number;
  mode: "major" | "minor";
  suggestedChords: string[][];
}) {
  const lang = language === "es" ? "Español" : "English";
  const modeLabel = mode === "major" ? "Mayor" : "Menor";

  const lines = [
    `Idioma: ${lang}`,
    `Tema/Mensaje: ${topic || "—"}`,
    `Versículo base: ${verse || "—"}`,
    `Estilo musical: ${style}`,
    `Tonalidad: ${key} (${modeLabel})`,
    `Tempo (BPM): ${tempo}`,
    `Compás: 4/4`,
    ``,
    `Genera una canción cristiana lista para cantar con estructura:`,
    `- Intro`,
    `- Verso 1`,
    `- Pre-coro`,
    `- Coro`,
    `- Verso 2`,
    `- Puente`,
    `- Coro final`,
    ``,
    `Incluye acordes por línea (formato simple).`,
    `Progresiones sugeridas:`,
    ...suggestedChords.map((p) => `- ${p.join(" - ")}`),
    ``,
    `IMPORTANTE: letra reverente, bíblica, congregacional, clara.`,
  ];

  return lines.join("\n");
}

export default function StudioPage() {
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [topic, setTopic] = useState("");
  const [verse, setVerse] = useState("");
  const [style, setStyle] = useState("Worship pentecostal moderno");

  const [mode, setMode] = useState<"major" | "minor">("major");

  const [key, setKey] = useState("D");
  const [tempo, setTempo] = useState(74);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SongResult | null>(null);

  const musicInfo = useMemo(() => buildKeyChords(key, mode), [key, mode]);

  async function onGenerate() {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          topic,
          verse,
          style,
          key,
          tempo,
          mode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error generando canción");
        return;
      }

      setResult(data);
    } catch (err) {
      alert("Error de conexión con la IA");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🎼 Studio
          </h1>
          <p className="mt-2 text-white/70">
            Genera letras + acordes + tonalidad (Mayor o Menor).
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Producción */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
              ⚙️ Producción
            </h2>

            <label className="block text-sm text-white/70">Idioma</label>
            <select
              className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>

            <div className="mt-5">
              <label className="block text-sm text-white/70">
                Tema / mensaje
              </label>
              <input
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder='Ej: "Restauración", "Dios me levanta", "Gracia y perdón"...'
              />
            </div>

            <div className="mt-5">
              <label className="block text-sm text-white/70">
                Versículo base (opcional)
              </label>
              <input
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                value={verse}
                onChange={(e) => setVerse(e.target.value)}
                placeholder='Ej: "Salmo 23", "Isaías 43:2", "Juan 3:16"...'
              />
            </div>

            <div className="mt-5">
              <label className="block text-sm text-white/70">Estilo</label>
              <input
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </div>

            {/* Modo Mayor/Menor */}
            <div className="mt-5">
              <label className="block text-sm text-white/70">Modo</label>
              <select
                className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as "major" | "minor")
                }
              >
                <option value="major">Mayor</option>
                <option value="minor">Menor</option>
              </select>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70">Tonalidad</label>
                <select
                  className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                >
                  {KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70">
                  Tempo (BPM)
                </label>
                <input
                  type="number"
                  className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3"
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                />
              </div>
            </div>

            <button
              onClick={onGenerate}
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-white text-black font-semibold py-4 hover:opacity-90 disabled:opacity-60"
            >
              ✨ {loading ? "Generando..." : "Generar canción"}
            </button>

            {/* Consejo (en vez de Nota) */}
            <p className="mt-4 text-sm text-white/70">
              <b>Consejo:</b> escribe un tema claro + un versículo base. La IA
              responde mejor si das contexto (ej: “adoración”, “exhortación”,
              “arrepentimiento”, “sanidad”).
            </p>
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-5 flex items-center gap-2">
              📄 Resultado
            </h2>

            {/* Acordes del tono */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-4">
              <div className="text-sm text-white/70 mb-2">
                {mode === "major"
                  ? "Acordes del tono (Mayor)"
                  : "Acordes del tono (Menor)"}
              </div>

              <div className="flex flex-wrap gap-2">
                {musicInfo.chords.map((c, idx) => (
                  <span
                    key={idx}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm"
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-4 text-sm text-white/70">Progresiones:</div>
              <div className="mt-2 space-y-2">
                {musicInfo.suggested.map((p, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  >
                    {p.join(" - ")}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-4">
              {!result ? (
                <p className="text-white/60 text-sm">
                  Aquí aparecerá la canción generada.
                </p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-white/60">Título</div>
                    <div className="text-xl font-bold">{result.title}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60">Tono</div>
                      <div className="text-lg font-semibold">{result.key}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60">Tempo</div>
                      <div className="text-lg font-semibold">{result.tempo}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs text-white/60">Compás</div>
                      <div className="text-lg font-semibold">
                        {result.timeSignature}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-white/60">Acordes sugeridos</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {result.chords.map((c, idx) => (
                        <span
                          key={idx}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-sm text-white/60">Letra</div>
                    <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/90">
                      {result.lyrics}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prompt interno (debug opcional, por si quieres) */}
        <div className="mt-8 text-xs text-white/40">
          IA por servidor: <code>/api/generate</code>
        </div>
      </div>
    </main>
  );
}
