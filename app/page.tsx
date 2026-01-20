import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white grid place-items-center px-6">
      <div className="w-full max-w-xl text-center space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 grid place-items-center text-xl">
            🎼
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Voces del Reino
          </h1>
        </div>

        <p className="text-white/70">
          Studio musical con IA para generar letras, acordes y tonalidad (Mayor/Menor).
        </p>

        <Link
          href="/studio"
          className="inline-block rounded-2xl px-6 py-4 font-bold bg-white text-black hover:bg-white/90 transition border border-white/10"
        >
          Ir al Studio 🎶
        </Link>

        <div className="text-xs text-white/40 pt-2">
          Powered by Next.js + Vercel + OpenAI
        </div>
      </div>
    </main>
  );
}
