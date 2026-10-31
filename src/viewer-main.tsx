import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ViewerApp } from '@/components/viewer/ViewerApp'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useViewerStore } from '@/viewer-store'
import { decodeTrackSharePayload } from '@/utils/shareTrack'
import { translateOutsideReact } from '@/i18n'

/**
 * The shared payload carries the sender's view toggles. The viewer opens the
 * ground grid off regardless: it is a layout aid, and most exported tracks have
 * it on because the sender snapped gates with it.
 */
const VIEWER_CONFIG_OVERRIDES = { showGrid: false } as const

function loadTrackFromHash() {
  const payload = window.location.hash.slice(1)
  const { setTrackData, setError } = useViewerStore.getState()

  if (!payload) {
    setError(translateOutsideReact('viewerMissingPayload'))
    return
  }

  const result = decodeTrackSharePayload(payload)
  if ('error' in result) {
    setError(translateOutsideReact('viewerInvalidPayload'))
    return
  }

  setTrackData(result.track, { ...result.config, ...VIEWER_CONFIG_OVERRIDES })
}

loadTrackFromHash()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ViewerApp />
    </ErrorBoundary>
  </StrictMode>,
)
