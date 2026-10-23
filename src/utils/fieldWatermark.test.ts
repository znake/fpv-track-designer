import { describe, expect, it } from 'vitest'

import { calculateFieldWatermarkMetrics } from './fieldWatermark'

const fieldSizes = [
  { name: 'Last OG3 hall (10.5 x 22.7 m)', width: 10.5, height: 22.7 },
  { name: 'default field (30 x 15 m)', width: 30, height: 15 },
  { name: 'narrow long field (3 x 40 m)', width: 3, height: 40 },
  { name: 'large field (200 x 200 m)', width: 200, height: 200 },
]

describe('calculateFieldWatermarkMetrics', () => {
  it.each(fieldSizes)('keeps the branding inside the grass on $name', ({ width, height }) => {
    const metrics = calculateFieldWatermarkMetrics({ width, height })

    expect(metrics.fontSize).toBeGreaterThan(0)
    expect(metrics.estimatedLengthMeters).toBeLessThan(Math.max(width, height))
    expect(metrics.estimatedHeightMeters).toBeLessThan(Math.min(width, height))
  })

  it('runs the branding along the longer field axis', () => {
    expect(calculateFieldWatermarkMetrics({ width: 10.5, height: 22.7 }).alongAxis).toBe('height')
    expect(calculateFieldWatermarkMetrics({ width: 30, height: 15 }).alongAxis).toBe('width')
  })

  it('drops the old 6 m floor so #FPVOOE fits the 10.5 m wide Last OG3 hall', () => {
    const metrics = calculateFieldWatermarkMetrics({ width: 10.5, height: 22.7 })

    expect(metrics.fontSize).toBeLessThan(6)
    expect(metrics.estimatedLengthMeters).toBeLessThan(22.7)
  })
})
