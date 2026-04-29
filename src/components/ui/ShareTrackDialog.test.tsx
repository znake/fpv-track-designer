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
    expect(screen.getByText('Der Track öffnet sich über diesen Link im reinen Ansichtsmodus.')).not.toBeNull()
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

  it('shows shortener loading feedback while keeping the long link usable', () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        originalShareUrl="https://sharedtrack.fpvooe.com/#abc"
        isShortening
      />,
    )

    expect(screen.getByDisplayValue('https://sharedtrack.fpvooe.com/#abc')).not.toBeNull()
    expect(screen.getByText(/Kurzlink wird erstellt/)).not.toBeNull()
    expect(screen.queryByRole('link', { name: 'Shortlink erzeugen' })).toBeNull()
  })

  it('shows successful short-link feedback', () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="http://go.fpvooe.com/viMbW"
        originalShareUrl="https://sharedtrack.fpvooe.com/#abc"
      />,
    )

    expect(screen.getByDisplayValue('http://go.fpvooe.com/viMbW')).not.toBeNull()
    expect(screen.getByText('Kurzlink erstellt.')).not.toBeNull()
  })

  it('shows shortener errors while keeping the current link copyable', () => {
    render(
      <ShareTrackDialog
        open
        onOpenChange={vi.fn()}
        shareUrl="https://sharedtrack.fpvooe.com/#abc"
        originalShareUrl="https://sharedtrack.fpvooe.com/#abc"
        shortenError="Der Kurzlink konnte nicht erstellt werden."
      />,
    )

    expect(screen.getByDisplayValue('https://sharedtrack.fpvooe.com/#abc')).not.toBeNull()
    expect(screen.getByText('Der Kurzlink konnte nicht erstellt werden.')).not.toBeNull()
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
