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
