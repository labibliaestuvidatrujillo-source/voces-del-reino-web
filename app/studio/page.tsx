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

export default function StudioPage() {
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("Worship pentecostal moderno");
  const [bibleVerse, setBibleVerse] = useState("");
  const [key, setKey] = useState("D");
  const [tempo, setTempo] = useState(74);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SongResult | null>(null);

  const keys = useMemo(
    () => ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
    []
  );

  function createTemplateSong(): SongResult {
    // Esto es una demo local (sin IA todavía)
    const title =
      language === "es" ? "Tu Presencia Me Renueva" : "Your Presence Renews Me";

    const chords =
      key === "D"
        ? ["D", "Bm", "G", "A"]
        : key === "C"
        ? ["C", "Am", "F", "G"]
        : [key, `${key}m`, "IV", "V"];

    const lyricsES = `# ${title}
Tonalidad: ${key} | Tempo: ${tempo} BPM | Compás: 4/4

## Verso 1
En medio del desierto Tú me haces florecer,
Tu Espíritu me guía, me enseña a obedecer.
Tu palabra es mi fuerza, mi pan y mi verdad,
en Ti mi alma descansa, en Ti hay libertad.

## Coro
// (${chords.join(" - ")})
Santo, Santo, mi Dios,
Tu gloria llena el corazón.
Yo cantaré, no callaré,
Jesús, mi Rey, te exaltaré.

## Puente
Aviva el fuego en mi interior,
derrama tu poder Señor.
`;

    const lyricsEN = `# ${title}
Key: ${key} | Tempo: ${tempo} BPM | Time: 4/4

## Verse 1
In the middle of the desert You make me bloom again,
Your Spirit gently leads me, teaching me to stand.
Your Word becomes my strength, my bread, my living truth,
in You my soul finds rest, in You I’m made new.

## Chorus
// (${chords.join(" - ")})
Holy, Holy, my God,
Your glory fills my heart in awe.
I will sing, I won’t be still,
Jesus my King, Your name I will lift.

## Bridge
Revive the fire in me,
pour out Your power, Lord, I believe.
`;

    return {
      title,
      key,
      tempo,
      timeSignature: "4/4",
      chords,
      lyrics: language === "es" ? lyricsES : lyricsEN,
    };
  }

  async function onGenerate() {
    setLoading(true);
    setResult(null);

    // DEMO: simulación
    await new Promise((r) => setTimeout(r, 700));
    setResult(createTemplateSong());

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">🎼 Studio</h1>
          <p className="mt-2 text-white/70">
            Genera letras + acordes + tonalidad. (Ahora demo local, luego IA real)
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* FORM */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">⚙️ Configuración</h2>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-white/70">Idioma</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-white/70">Tema / mensaje</span>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder='Ej: "Restauración", "Dios me levanta", "Gracia y perdón"...'
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-white/70">Versículo base</span>
                <input
                  value={bibleVerse}
                  onChange={(e) => setBibleVerse(e.target.value)}
                  placeholder='Ej: "Salmo 23", "Isaías 43:2", "Juan 3:16"...'
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-white/70">Estilo</span>
                <input
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="rounded-xl border border-white/10 bg-black px-4 py-3"
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-2">
                  <span className="text-sm text-white/70">Tonalidad</span>
                  <select
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black px-4 py-3"
                  >
                    {keys.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-white/70">Tempo (BPM)</span>
                  <input
                    type="number"
                    value={tempo}
                    onChange={(e) => setTempo(Number(e.target.value))}
                    className="rounded-xl border border-white/10 bg-black px-4 py-3"
                    min={50}
                    max={160}
                  />
                </label>
              </div>

              <button
                onClick={onGenerate}
                disabled={loading}
                className="mt-2 rounded-xl bg-white px-6 py-3 font-semibold text-black disabled:opacity-60"
              >
                {loading ? "Generando..." : "✨ Generar canción"}
              </button>

              <p className="text-xs text-white/50">
                Nota: aún no usa IA real. En el siguiente paso conectaremos OpenAI
                para generar letras y acordes automáticamente.
              </p>
            </div>
          </div>

          {/* RESULT */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold">📄 Resultado</h2>

            {!result ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-6 text-white/60">
                Aquí aparecerá la canción generada.
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-sm text-white/60">Título</div>
                  <div className="text-xl font-bold">{result.title}</div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-sm text-white/60">Tono</div>
                    <div className="text-lg font-semibold">{result.key}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-sm text-white/60">Tempo</div>
                    <div className="text-lg font-semibold">{result.tempo}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-sm text-white/60">Compás</div>
                    <div className="text-lg font-semibold">
                      {result.timeSignature}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-sm text-white/60">Acordes sugeridos</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.chords.map((c) => (
                      <span
                        key={c}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-sm text-white/60">Letra</div>
                  <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/80">
                    {result.lyrics}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
