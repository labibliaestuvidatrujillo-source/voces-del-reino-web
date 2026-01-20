"use client";

import React, { useEffect, useMemo, useState } from "react";
import HistoryPanel from "./components/HistoryPanel";
import {
  addToHistory,
  clearHistory,
  HistoryItem,
  loadHistory,
  makeId,
  removeFromHistory,
  StudioSettings,
} from "./lib/history";

type Mode = "major" | "minor";
type MinorType = "natural" | "harmonic" | "melodic";
type TimeSignature = "4/4" | "3/4" | "6/8";

type GeneratePayload = {
  title?: string;
  bpm: number;
  key: string;
  mode: Mode;
  minorType?: MinorType;
  timeSignature: TimeSignature;
  prompt: string;
};

const KEYS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LS_LAST_RESULT = "voces-last-result"; // ✅ no se borra al refrescar

export default function StudioPage() {
  const [title, setTitle] = useState("Voces del Reino");
  const [key, setKey] = useState<(typeof KEYS)[number]>("D");
  const [mode, setMode] = useState<Mode>("major");
  const [minorType, setMinorType] = useState<MinorType>("natural");
  const [bpm, setBpm] = useState<number>(74);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>("4/4");

  const [prompt, setPrompt] = useState<string>(
    "Crea un worship pentecostal moderno con versos y coro congregacional."
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Historial
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // ---------- LocalStorage: cargar settings + último resultado ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem("voces-studio-settings");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.title) setTitle(saved.title);
        if (saved?.key) setKey(saved.key);
        if (saved?.mode) setMode(saved.mode);
        if (saved?.minorType) setMinorType(saved.minorType);
        if (saved?.bpm) setBpm(saved.bpm);
        if (saved?.timeSignature) setTimeSignature(saved.timeSignature);
        if (saved?.prompt) setPrompt(saved.prompt);
      }

      const last = localStorage.getItem(LS_LAST_RESULT);
      if (last) setResult(JSON.parse(last));
    } catch {}
  }, []);

  // ---------- LocalStorage: guardar settings ----------
  useEffect(() => {
    try {
      localStorage.setItem(
        "voces-studio-settings",
        JSON.stringify({
          title,
          key,
          mode,
          minorType,
          bpm,
          timeSignature,
          prompt,
        })
      );
    } catch {}
  }, [title, key, mode, minorType, bpm, timeSignature, prompt]);

  // ---------- LocalStorage: cargar historial ----------
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const tonalidadTexto = useMemo(() => {
    if (mode === "major") return `${key} Mayor`;
    const t =
      minorType === "natural"
        ? "Menor natural"
        : minorType === "harmonic"
        ? "Menor armónica"
        : "Menor melódica";
    return `${key} ${t}`;
  }, [key, mode, minorType]);

  function getCurrentSettings(): StudioSettings {
    return {
      title,
      key,
      mode,
      minorType: mode === "minor" ? minorType : undefined,
      bpm,
      timeSignature,
      prompt,
    };
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    const payload: GeneratePayload = {
      title,
      bpm,
      key,
      mode,
      minorType: mode === "minor" ? minorType : undefined,
      timeSignature,
      prompt,
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error generando");
      }

      const data = await res.json();
      setResult(data);

      // ✅ guardar el último resultado (para que no se borre al refrescar)
      try {
        localStorage.setItem(LS_LAST_RESULT, JSON.stringify(data));
      } catch {}

      // ✅ Guardar automáticamente en historial
      const item: HistoryItem = {
        id: makeId(),
        createdAt: Date.now(),
        settings: getCurrentSettings(),
        result: data,
      };
      const next = addToHistory(item, 25);
      setHistory(next);
    } catch (e: any) {
      setError(e?.message || "Ocurrió un error");
    } finally {
      setLoading(false);
    }
  }

  function handleLoadFromHistory(item: HistoryItem) {
    const s = item.settings;
    setTitle(s.title || "Voces del Reino");
    setKey((s.key as any) || "C");
    setMode(s.mode);
    setMinorType((s.minorType as any) || "natural");
    setBpm(s.bpm || 90);
    setTimeSignature((s.timeSignature as any) || "4/4");
    setPrompt(s.prompt || "");
    setResult(item.result);

    try {
      localStorage.setItem(LS_LAST_RESULT, JSON.stringify(item.result));
    } catch {}
  }

  function handleDeleteHistory(id: string) {
    const next = removeFromHistory(id);
    setHistory(next);
  }

  function handleClearHistory() {
    const next = clearHistory();
    setHistory(next);
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 grid place-items-center">
              🎼
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Studio
            </h1>
          </div>

          <p className="text-white/70">
            Genera letras + acordes + tonalidad usando IA (OpenAI).
          </p>

          <div className="text-sm text-white/50">
            Tonalidad actual:{" "}
            <span className="text-white/80">{tonalidadTexto}</span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Config */}
          <div className="rounded-3xl p-5 md:p-6 bg-white/5 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 grid place-items-center">
                ⚙️
              </div>
              <h2 className="text-xl md:text-2xl font-bold">producción</h2>
            </div>

            <div className="space-y-4">
              <FieldDark label="Proyecto / Título">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/25"
                  placeholder='Ej: "Espíritu Santo"'
                />
              </FieldDark>

              {/* ✅ móvil definitivo */}
              <FieldDark label="Modo">
                <div className="flex flex-col gap-2">
                  <ModeButtonDark
                    active={mode === "major"}
                    onClick={() => setMode("major")}
                  >
                    Mayor
                  </ModeButtonDark>

                  <ModeButtonDark
                    active={mode === "minor"}
                    onClick={() => setMode("minor")}
                  >
                    Menor
                  </ModeButtonDark>
                </div>

                <div className="text-xs text-white/40 mt-2">
                  Tip: toca “Menor” para activar “Tipo de menor”.
                </div>
              </FieldDark>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldDark label="Tonalidad (Key)">
                  <select
                    value={key}
                    onChange={(e) => setKey(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/25"
                  >
                    {KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </FieldDark>

                <FieldDark label="Tempo (BPM)">
                  <input
                    type="number"
                    value={bpm}
                    min={50}
                    max={220}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/25"
                  />
                </FieldDark>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldDark label="Compás">
                  <select
                    value={timeSignature}
                    onChange={(e) =>
                      setTimeSignature(e.target.value as TimeSignature)
                    }
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/25"
                  >
                    <option value="4/4">4/4</option>
                    <option value="3/4">3/4</option>
                    <option value="6/8">6/8</option>
                  </select>
                </FieldDark>

                {mode === "minor" ? (
                  <FieldDark label="Tipo de menor">
                    <select
                      value={minorType}
                      onChange={(e) =>
                        setMinorType(e.target.value as MinorType)
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-white/25"
                    >
                      <option value="natural">Natural</option>
                      <option value="harmonic">Armónica</option>
                      <option value="melodic">Melódica</option>
                    </select>
                  </FieldDark>
                ) : (
                  <div />
                )}
              </div>

              <FieldDark label="Prompt (Estilo / Mensaje)">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 min-h-[150px] outline-none focus:border-white/25"
                  placeholder="Ej: Que nunca me falte tu Santo Espíritu..."
                />
              </FieldDark>

              <div className="flex gap-2 flex-wrap">
                <PresetButton
                  onClick={() =>
                    setPrompt(
                      "Crea un corito pentecostal alegre (rápido) con coro repetible y fácil para congregación."
                    )
                  }
                >
                  Preset Pentecostal
                </PresetButton>

                <PresetButton
                  onClick={() =>
                    setPrompt(
                      "Crea una canción de adoración en 6/8 con ambiente suave, versos largos y coro profundo."
                    )
                  }
                >
                  Preset Adoración 6/8
                </PresetButton>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full mt-2 rounded-2xl px-5 py-4 font-bold border border-white/10 bg-white text-black hover:bg-white/90 transition disabled:opacity-60"
              >
                {loading ? "Generando..." : "Generar 🎶 (Guardar en historial)"}
              </button>

              {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 text-red-200 px-4 py-3 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Result + Historial */}
          <div className="space-y-6">
            <div className="rounded-3xl p-5 md:p-6 bg-white/5 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              <div className="mb-5">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 grid place-items-center text-sm">
      ⚙️
    </div>
    <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white">
  Producción
</h2>

  </div>
  <div className="text-xs text-white/50 mt-1">
    Configura tonalidad, modo, compás y estilo.
  </div>
</div>


              {!result ? (
                <div className="text-white/60">
                  Aquí aparecerá la canción generada.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <InfoDark
                      label="Título"
                      value={result?.title || title || "-"}
                    />
                    <InfoDark
                      label="Tonalidad"
                      value={
                        result?.key
                          ? `${result.key} ${
                              mode === "major" ? "Mayor" : "Menor"
                            }`
                          : tonalidadTexto
                      }
                    />
                    <InfoDark label="BPM" value={String(result?.tempo ?? bpm)} />
                    <InfoDark
                      label="Compás"
                      value={result?.timeSignature || timeSignature}
                    />
                  </div>

                  <BlockDark title="Acordes">
                    <div className="text-sm font-mono whitespace-pre-wrap leading-6 text-white/90">
                      {(result?.chords || [])
                        .map((c: string) =>
                          String(c).replaceAll(" - ", "  |  ")
                        )
                        .join("\n")}
                    </div>
                  </BlockDark>

                  <BlockDark title="Letra">
                    <div className="text-sm whitespace-pre-wrap leading-6 text-white/90">
                      {String(result?.lyrics || "").replaceAll("\\n", "\n")}
                    </div>
                  </BlockDark>

                  <details className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-white/80">
                      Ver JSON (Debug)
                    </summary>
                    <pre className="text-xs overflow-auto bg-black/70 border border-white/10 text-white p-4 rounded-2xl mt-3">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>

            {/* ✅ HISTORIAL */}
            <HistoryPanel
              history={history}
              onLoad={handleLoadFromHistory}
              onDelete={handleDeleteHistory}
              onClear={handleClearHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- UI Components (Dark) ---------------- */

function FieldDark({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-white/70">{label}</div>
      {children}
    </div>
  );
}

function ModeButtonDark({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-4 py-4 rounded-2xl border text-base font-extrabold transition select-none ${
        active
          ? "bg-white text-black border-white/30"
          : "bg-black/40 text-white border-white/15 hover:border-white/30"
      }`}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      {children}
    </button>
  );
}

function PresetButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-3 py-2 rounded-2xl border border-white/10 bg-black/40 text-white/80 hover:text-white hover:border-white/20 transition"
    >
      {children}
    </button>
  );
}

function InfoDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="text-sm font-semibold text-white/90">{value}</div>
    </div>
  );
}

function BlockDark({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="font-semibold text-white/90 mb-2">{title}</div>
      {children}
    </div>
  );
}