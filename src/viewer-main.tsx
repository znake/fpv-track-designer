import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ViewerApp } from '@/components/viewer/ViewerApp'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useViewerStore } from '@/viewer-store'
import { decodeTrackSharePayload } from '@/utils/shareTrack'

function loadTrackFromHash() {
  const payload = window.location.hash.slice(1)
  const { setTrackData, setError } = useViewerStore.getState()

  if (!payload) {
    setError('Der Link enthält keine Track-Daten. Bitte prüfe den geteilten Link.')
    return
  }

  const result = decodeTrackSharePayload(payload)
  if ('error' in result) {
    setError('Der geteilte Track-Link ist ungültig oder beschädigt.')
    return
  }

  setTrackData(result.track, result.config)
}

loadTrackFromHash()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ViewerApp />
    </ErrorBoundary>
  </StrictMode>,
)
