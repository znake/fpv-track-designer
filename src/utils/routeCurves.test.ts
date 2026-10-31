import { describe, it, expect } from 'vitest'
import {
  MAX_TRANSITION_RADIUS,
  MIN_TRANSITION_RADIUS,
  normalizeAngle,
  planSmoothTransition,
  planTransitionTurns,
  samplePlan,
  transitionPoseParams,
} from './routeCurves'
import type { RoutePose, RouteSample } from './routeCurves'

const pose = (x: number, z: number, heading: number): RoutePose => ({ x, z, heading })

function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function headingDelta(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

function minimumSampleRadius(points: readonly RouteSample[]): number {
  let tightest = Number.POSITIVE_INFINITY

  for (let index = 2; index < points.length; index++) {
    const first = { x: points[index - 1].x - points[index - 2].x, z: points[index - 1].z - points[index - 2].z }
    const second = { x: points[index].x - points[index - 1].x, z: points[index].z - points[index - 1].z }
    const firstLength = Math.hypot(first.x, first.z)
    const secondLength = Math.hypot(second.x, second.z)
    if (firstLength < 1e-9 || secondLength < 1e-9) continue

    const turn = Math.acos(Math.min(1, Math.max(-1, (first.x * second.x + first.z * second.z) / (firstLength * secondLength))))
    if (turn < 1e-9) continue
    tightest = Math.min(tightest, (firstLength + secondLength) / 2 / turn)
  }

  return tightest
}

describe('transitionPoseParams', () => {
  it('measures headings relative to the chord', () => {
    const straight = transitionPoseParams(pose(0, 0, 0), pose(5, 0, 0))
    expect(straight.distance).toBeCloseTo(5, 9)
    expect(straight.alpha).toBeCloseTo(0, 9)
    expect(straight.beta).toBeCloseTo(0, 9)

    const quarterTurn = transitionPoseParams(pose(0, 0, 0), pose(0, 5, Math.PI / 2))
    expect(quarterTurn.distance).toBeCloseTo(5, 9)
    expect(normalizeAngle(quarterTurn.alpha)).toBeCloseTo((3 * Math.PI) / 2, 9)
    expect(quarterTurn.beta).toBeCloseTo(0, 9)
  })
})

describe('planTransitionTurns', () => {
  it('keeps an aligned transition a single straight run', () => {
    const plans = planTransitionTurns(0, 0, 5)
    const shortest = plans[0]

    expect(shortest.variant).toBe('LSL')
    expect(shortest.total).toBeCloseTo(5, 9)
    expect(shortest.turns.filter((turn) => turn.kind === 'straight')).toHaveLength(1)

    const sampled = samplePlan(shortest, pose(0, 0, 0), 1)
    expect(sampled.pose.x).toBeCloseTo(5, 6)
    expect(sampled.pose.z).toBeCloseTo(0, 6)
    expect(sampled.pose.heading).toBeCloseTo(0, 6)
  })

  it('reaches the requested pose for every variant at random geometry', () => {
    const random = createRandom(20261031)
    let checked = 0

    for (let run = 0; run < 400; run++) {
      const from = pose((random() - 0.5) * 12, (random() - 0.5) * 12, random() * Math.PI * 2)
      const to = pose((random() - 0.5) * 12, (random() - 0.5) * 12, random() * Math.PI * 2)
      const { distance, alpha, beta } = transitionPoseParams(from, to)
      if (distance < 1e-6) continue

      for (const plan of planTransitionTurns(alpha, beta, distance)) {
        const sampled = samplePlan(plan, from, 1)
        expect(sampled.pose.x).toBeCloseTo(to.x, 5)
        expect(sampled.pose.z).toBeCloseTo(to.z, 5)
        expect(headingDelta(sampled.pose.heading, to.heading)).toBeLessThan(1e-5)
        checked++
      }
    }

    expect(checked).toBeGreaterThan(1000)
  })
})

describe('planSmoothTransition', () => {
  it('never goes below the minimum radius and stays inside the length budget', () => {
    const result = planSmoothTransition(pose(0, 0, 0), pose(4, 4, Math.PI / 2))

    expect(result).not.toBeNull()
    if (!result) return
    expect(result.radius).toBeGreaterThanOrEqual(MIN_TRANSITION_RADIUS)
    expect(result.radius).toBeLessThanOrEqual(MAX_TRANSITION_RADIUS)
    expect(result.length).toBeLessThanOrEqual(Math.hypot(4, 4) * 1.3 + 1e-9)
    expect(minimumSampleRadius(result.points)).toBeGreaterThanOrEqual(result.radius * 0.9)
    expect(result.points.at(-1)?.x).toBeCloseTo(4, 5)
    expect(result.points.at(-1)?.z).toBeCloseTo(4, 5)
  })

  it('turns a gate reversal into a wide arc instead of a hook', () => {
    const result = planSmoothTransition(pose(0, 0.45, 0), pose(0, -0.45, Math.PI))

    expect(result).not.toBeNull()
    if (!result) return
    expect(result.radius).toBeGreaterThanOrEqual(MIN_TRANSITION_RADIUS)
    expect(minimumSampleRadius(result.points)).toBeGreaterThanOrEqual(MIN_TRANSITION_RADIUS * 0.9)
  })

  it('recovers the straight line when both poses are aligned', () => {    const result = planSmoothTransition(pose(0, 0, 0), pose(8, 0, 0))

    expect(result).not.toBeNull()
    if (!result) return
    expect(result.length).toBeCloseTo(8, 5)
    expect(result.points.every((point) => Math.abs(point.z) < 1e-6)).toBe(true)
  })

  it('drops candidates that the caller rejects', () => {
    const result = planSmoothTransition(pose(0, 0, 0), pose(0, 4, Math.PI / 2), {
      isAllowed: (points) => points.every((point) => point.x >= -1e-6),
    })

    expect(result).not.toBeNull()
    if (!result) return
    expect(result.points.every((point) => point.x >= -1e-6)).toBe(true)
  })

  it('returns null when the geometry admits no compliant plan', () => {
    const result = planSmoothTransition(pose(0, 0, 0), pose(4, 0, 0), { isAllowed: () => false })
    expect(result).toBeNull()
  })

  it('loops back to the same anchor for a reversed pass of one opening', () => {
    const result = planSmoothTransition(pose(0, 0, 0), pose(0, 0, Math.PI))

    expect(result).not.toBeNull()
    if (!result) return
    expect(result.radius).toBeGreaterThanOrEqual(MIN_TRANSITION_RADIUS)
    expect(result.length).toBeLessThan(3)
    expect(result.points.at(-1)?.x).toBeCloseTo(0, 5)
    expect(result.points.at(-1)?.z).toBeCloseTo(0, 5)
    expect(minimumSampleRadius(result.points)).toBeGreaterThanOrEqual(MIN_TRANSITION_RADIUS * 0.9)
  })
})
