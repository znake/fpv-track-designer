import { useEffect, useState } from 'react'
import { CircleHelp } from 'lucide-react'
import { Scene } from '@/components/scene/Scene'
import { Button } from '@/components/ui/button'
import { useViewerStore } from '@/viewer-store'
import { ViewerHelpDialog } from './ViewerHelpDialog'

const VIEWER_HELP_COOKIE = 'fpv-track-viewer-help-seen'
const VIEWER_HELP_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function hasViewerHelpCookie() {
  if (typeof document === 'undefined') return true

  return document.cookie
    .split('; ')
    .some((cookie) => cookie.startsWith(`${VIEWER_HELP_COOKIE}=`))
}

function setViewerHelpCookie() {
  if (typeof document === 'undefined') return

  document.cookie = `${VIEWER_HELP_COOKIE}=true; max-age=${VIEWER_HELP_COOKIE_MAX_AGE}; path=/; SameSite=Lax`
}

export function ViewerApp() {
  const track = useViewerStore((state) => state.track)
  const config = useViewerStore((state) => state.config)
  const error = useViewerStore((state) => state.error)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    if (!track || !config || hasViewerHelpCookie()) return

    setViewerHelpCookie()
    const timeoutId = window.setTimeout(() => setHelpOpen(true), 0)

    return () => window.clearTimeout(timeoutId)
  }, [config, track])

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
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute top-3 right-3 rounded-full border-white/15 bg-black/25 text-white/70 backdrop-blur hover:bg-white/10 hover:text-white"
        onClick={() => setHelpOpen(true)}
        aria-label="Viewer-Hilfe öffnen"
      >
        <CircleHelp className="size-4" />
      </Button>
      <a
        href="https://fpvooe.com"
        className="absolute right-3 bottom-3 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-medium text-white/60 backdrop-blur transition hover:text-white"
        target="_blank"
        rel="noreferrer"
      >
        fpvooe.com
      </a>
      <ViewerHelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </main>
  )
}
