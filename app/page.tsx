export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-widest text-white/60">
            Voces del Reino Studio
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Crea alabanzas con Inteligencia Artificial
          </h1>

          <p className="mt-5 max-w-2xl text-lg text-white/70">
            Genera letras, acordes y tonalidades. Próximamente: pista musical,
            exportación y transposición automática.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/studio"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
            >
              🎼 Crear canción
            </a>

            <a
              href="https://github.com/labibliaestuvidatrujillo-source/voces-del-reino-web"
              className="rounded-xl border border-white/20 px-6 py-3 font-semibold text-white"
            >
              Ver proyecto
            </a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">✍️ Letras cristianas</h2>
            <p className="mt-2 text-white/70">
              IA con estilo pentecostal/worship. Verso, coro, puente y cierre.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">🎹 Acordes y tono</h2>
            <p className="mt-2 text-white/70">
              Progresiones sugeridas + soporte para transposición (próximamente).
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">🎧 Pista musical</h2>
            <p className="mt-2 text-white/70">
              Generación de instrumental con IA (en desarrollo).
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">🌎 Bilingüe</h2>
            <p className="mt-2 text-white/70">
              Español / English. Ideal para iglesias y compositores.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}