import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareTrackDialog } from './ShareTrackDialog'

const writeText = vi.fn<(_: string) => Promise<void>>()

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  configurable: true,
})

describe('ShareTrackDialog', () => {
  beforeEach(() => {
    writeText.mockReset()
    writeText.mockResolvedValue(undefined)
  })

  it('shows the share URL in a readonly input', () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
      />,
    )

    expect(screen.getByText('Track teilen')).not.toBeNull()
    expect(screen.getByLabelText('Teilbarer Link')).toHaveProperty('readOnly', true)
    expect(screen.getByDisplayValue('https://sharedtrack.fpvooe.com/#abc')).not.toBeNull()
    expect(screen.getByText(/Bewahre den Original-Link zusätzlich auf/)).not.toBeNull()
  })

  it('copies the link and shows feedback', async () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Link kopieren' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('https://sharedtrack.fpvooe.com/#abc'))
    expect(screen.getByRole('button', { name: 'Kopiert!' })).not.toBeNull()
  })

  it('links to is.gd with the encoded share URL', () => {
    const shareUrl = 'https://sharedtrack.fpvooe.com/#z.payload+with&symbols'

    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl={shareUrl}
      />,
    )

    const shortlink = screen.getByRole('link', { name: 'Shortlink erzeugen' })

    expect(shortlink.getAttribute('href')).toBe(
      `https://is.gd/create.php?format=web&url=${encodeURIComponent(shareUrl)}`,
    )
    expect(shortlink.getAttribute('target')).toBe('_blank')
    expect(shortlink.getAttribute('rel')).toBe('noreferrer')
  })

  it('closes via the Schließen button', () => {
    const onOpenChange = vi.fn()

    render(
      <ShareTrackDialog
        open
        onOpenChange={onOpenChange}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
