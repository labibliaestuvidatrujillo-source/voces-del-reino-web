"use client";

import React from "react";
import { formatDate, HistoryItem } from "../lib/history";

export default function HistoryPanel({
    history,
    onLoad,
    onDelete,
    onClear,
}: {
    history: HistoryItem[];
    onLoad: (item: HistoryItem) => void;
    onDelete: (id: string) => void;
    onClear: () => void;
}) {
    return (
        <div className="rounded-3xl p-5 md:p-6 bg-white/5 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-bold">Historial</h3>
                    <p className="text-white/60 text-sm mt-1">
                        Se guardan automáticamente tus últimas generaciones.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClear}
                    className="text-xs px-3 py-2 rounded-2xl border border-white/10 bg-black/40 text-white/80 hover:text-white hover:border-white/20 transition"
                >
                    Vaciar
                </button>
            </div>

            {history.length === 0 ? (
                <div className="mt-6 text-white/60 text-sm">
                    Aún no hay historial. Genera una canción y aparecerá aquí.
                </div>
            ) : (
                <div className="mt-5 space-y-3">
                    {history.map((item) => {
                        const s = item.settings;
                        const tonalidad =
                            s.mode === "major"
                                ? `${s.key} Mayor`
                                : `${s.key} Menor (${s.minorType || "natural"})`;

                        return (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-white/10 bg-black/30 p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-white/90 truncate">
                                            {s.title || "Sin título"}
                                        </div>
                                        <div className="text-xs text-white/60 mt-1">
                                            {formatDate(item.createdAt)}
                                        </div>
                                        <div className="text-xs text-white/60 mt-2">
                                            <span className="text-white/80">{tonalidad}</span> · BPM{" "}
                                            <span className="text-white/80">{s.bpm}</span> ·{" "}
                                            <span className="text-white/80">{s.timeSignature}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onLoad(item);
                                            }}
                                            className="px-3 py-2 rounded-2xl border border-white/10 bg-white text-black font-bold hover:bg-white/90 transition text-xs"
                                        >
                                            Cargar
                                        </button>

                                        type="button"
                                        onClick={() => onDelete(item.id)}
                                        className="px-3 py-2 rounded-2xl border border-white/10 bg-black/40 text-white/80 hover:text-white hover:border-white/20 transition text-xs"
                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>

                {
                            s.prompt ? (
                                <div className="mt-3 text-xs text-white/50 line-clamp-2">
                                    {s.prompt}
                                </div>
                            ) : null
                        }
              </div>
            );
          })}
        </div>
    )
}
    </div >
  );
}
