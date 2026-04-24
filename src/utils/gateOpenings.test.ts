import { describe, expect, it } from 'vitest'
import { createDefaultGateOpenings } from './gateOpenings'

describe('createDefaultGateOpenings', () => {
  it('creates two side-pass openings for flags', () => {
    const openings = createDefaultGateOpenings('flag', 1)

    expect(openings).toHaveLength(2)
    expect(openings.map((opening) => opening.id)).toEqual(['left', 'right'])
    expect(openings[0].position.x).toBeLessThan(0)
    expect(openings[1].position.x).toBeGreaterThan(0)
  })

  it('creates top and bottom openings for double gates', () => {
    const openings = createDefaultGateOpenings('double', 1)

    expect(openings).toHaveLength(2)
    expect(openings.map((opening) => opening.id)).toEqual(['lower', 'upper'])
    expect(openings[0].position.y).toBeLessThan(openings[1].position.y)
  })

  it('creates a lower fly-through and backrest pass for h-gates', () => {
    const openings = createDefaultGateOpenings('h-gate', 1)

    expect(openings).toHaveLength(2)
    expect(openings.map((opening) => opening.id)).toEqual(['lower', 'backrest-pass'])
    expect(openings.find((opening) => opening.id === 'upper')).toBeUndefined()
    expect(openings[0].position.x).toBe(0)
    expect(openings[1].rotation).toBe(openings[0].rotation)
  })

  it('centers h-gate backrest pass above the lower opening', () => {
    const openings = createDefaultGateOpenings('h-gate', 1)
    const backrestPass = openings.find((opening) => opening.id === 'backrest-pass')

    expect(backrestPass?.position.x).toBe(0)
  })

  it('aligns h-gate entry and exit sides across both openings', () => {
    const openings = createDefaultGateOpenings('h-gate', 1)
    const lower = openings.find((opening) => opening.id === 'lower')
    const backrestPass = openings.find((opening) => opening.id === 'backrest-pass')

    expect(backrestPass?.rotation).toBe(lower?.rotation)
  })
})
