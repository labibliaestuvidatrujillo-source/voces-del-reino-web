"use client";

import { useEffect, useMemo, useState } from "react";

type SongResult = {
  title: string;
  key: string;
  tempo: number;
  timeSignature: string;
  chords: string[];
  lyrics: string;
};

// ============================
// Límite GRATIS por día
// ============================
const LIMIT_PER_DAY = 3;

function todayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getUsage() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem("voces_usage");
    if (!raw) return { date: todayKey(), count: 0 };
    const parsed = JSON.parse(raw);

    if (!parsed?.date || typeof parsed?.count !== "number") {
      return { date: todayKey(), count: 0 };
    }

    if (parsed.date !== todayKey()) {
      return { date: todayKey(), count: 0 };
    }

    return parsed;
  } catch {
    return { date: todayKey(), count: 0 };
  }
}

function canGenerateToday() {
  const usage = getUsage();
  if (!usage) return { ok: true, remaining: LIMIT_PER_DAY, limit: LIMIT_PER_DAY };

  const remaining = Math.max(0, LIMIT_PER_DAY - usage.count);
  return { ok: remaining > 0, remaining, limit: LIMIT_PER_DAY };
}

function registerGeneration() {
  const usage = getUsage();
  if (!usage) return;

  const updated = {
    date: todayKey(),
    count: Math.min(LIMIT_PER_DAY, usage.count + 1),
  };
  localStorage.setItem("voces_usage", JSON.stringify(updated));
}

export default function StudioPage() {
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [topic, setTopic] = useState("");
  const [verse, setVerse] = useState("");
  const [style, setStyle] = useState("Worship pentecostal moderno");
  const [key, setKey] = useState("D");
  const [tempo, setTempo] = useState(74);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SongResult | null>(null);

  // ✅ Evita hydration error (solo cliente)
  const [limitPreview, setLimitPreview] = useState<{
    ok: boolean;
    remaining: number;
    limit: number;
  } | null>(null);

  useEffect(() => {
    setLimitPreview(canGenerateToday());
  }, []);

  const keys = useMemo(
    () => ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
    []
  );

  async function onGenerate() {
    try {
      if (loading) return;

      // Límite gratis
      const allowed = canGenerateToday();
      if (!allowed.ok) {
        alert(
          `Has llegado al límite GRATIS de hoy (${allowed.limit}). Intenta mañana 🙌`
        );
        return;
      }

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "Error generando canción");
        return;
      }

      // Guardar resultado
      setResult(data);

      // registrar uso y actualizar contador visual
      registerGeneration();
      setLimitPreview(canGenerateToday());
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
          <h1 className="text-3xl font-bold">🎼 Studio</h1>
          <p className="mt-2 text-white/70">
            Genera letras + acordes + tonalidad usando IA (OpenAI).
          </p>

          {/* Contador GRATIS sin hydration error */}
          <div className="mt-2 text-xs text-white/50">
            {limitPreview ? (
              <span>
                Gratis: {limitPreview.remaining}/{limitPreview.limit} generaciones disponibles hoy.
              </span>
            ) : (
              <span>Gratis: 3 generaciones por día.</span>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Config */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">⚙️ Configuración</h2>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm text-white/70">Idioma</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "es" | "en")}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-white/70">Tema / mensaje</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder='Ej: "Restauración", "Dios me levanta", "Gracia y perdón"...'
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">
                  Versículo base (opcional)
                </label>
                <input
                  value={verse}
                  onChange={(e) => setVerse(e.target.value)}
                  placeholder='Ej: "Salmo 23", "Isaías 43:2", "Juan 3:16"...'
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3"
                />
              </div>

              <div>
                <label className="text-sm text-white/70">Estilo</label>
                <input
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/70">Tonalidad</label>
                  <select
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3"
                  >
                    {keys.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-white/70">Tempo (BPM)</label>
                  <input
                    type="number"
                    value={tempo}
                    onChange={(e) => setTempo(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3"
                  />
                </div>
              </div>

              <button
                onClick={onGenerate}
                disabled={loading}
                className="mt-3 w-full rounded-xl bg-white px-6 py-4 font-semibold text-black disabled:opacity-60"
              >
                ✨ {loading ? "Generando..." : "Generar canción"}
              </button>

              {/* ✅ Cambiado de NOTA a CONSEJO */}
              <p className="text-sm text-white/60">
                <b>Consejo:</b> usa un tema claro (ej. “Restauración”) y un versículo exacto
                (ej. “Juan 3:16”) para que la letra quede más ungida y coherente.
              </p>

              <p className="text-xs text-white/40">
                La IA se genera por servidor (API Route), tu key NO se expone en el navegador.
              </p>
            </div>
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">📄 Resultado</h2>

            {!result ? (
              <p className="mt-6 text-white/60">
                Aquí aparecerá la canción generada.
              </p>
            ) : (
              <div className="mt-6 grid gap-4">
                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-xs text-white/50">Título</div>
                  <div className="text-lg font-semibold">{result.title}</div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs text-white/50">Tono</div>
                    <div className="text-lg font-semibold">{result.key}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs text-white/50">Tempo</div>
                    <div className="text-lg font-semibold">{result.tempo}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                    <div className="text-xs text-white/50">Compás</div>
                    <div className="text-lg font-semibold">
                      {result.timeSignature}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-xs text-white/50">Acordes sugeridos</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.chords.map((c: string, idx: number) => (
                      <span
                        key={`${c}-${idx}`}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                  <div className="text-xs text-white/50">Letra</div>
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
