import { Scene } from '@/components/scene/Scene'
import { useViewerStore } from '@/viewer-store'

export function ViewerApp() {
  const track = useViewerStore((state) => state.track)
  const config = useViewerStore((state) => state.config)
  const error = useViewerStore((state) => state.error)

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-slate-100">
        <section className="max-w-md rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/40">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">FPV Track Viewer</p>
          <h1 className="mt-3 text-2xl font-semibold">Track kann nicht geladen werden</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{error}</p>
        </section>
      </main>
    )
  }

  if (!track || !config) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-6 text-slate-100">
        <p>Kein Track geladen.</p>
      </main>
    )
  }

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-slate-950">
      <Scene track={track} configOverride={config} readOnly />
      <a
        href="https://fpvooe.com"
        className="absolute right-3 bottom-3 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-white/60 backdrop-blur transition hover:text-white"
        target="_blank"
        rel="noreferrer"
      >
        fpvooe.com
      </a>
    </main>
  )
}
