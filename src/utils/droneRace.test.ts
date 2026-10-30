import { describe, expect, it } from 'vitest'
import type { Point3 } from '../types'
import {
  DRONE_FLOOR_HEIGHT,
  DRONE_MAX_BANK_RADIANS,
  DRONE_MIN_SPEED_FACTOR,
  DRONE_RACERS,
  approachAngle,
  bankRadians,
  buildDroneRoute,
  sampleDronePose,
  sampleDroneTrailRibbon,
  speedFactorAt,
  turnRateRadiansPerMeter,
  wrapRouteDistance,
} from './droneRace'

const STRAIGHT_ROUTE: Point3[] = [
  { x: 0, y: 1, z: 0 },
  { x: 10, y: 1, z: 0 },
  { x: 20, y: 1, z: 0 },
]

const route = buildDroneRoute(STRAIGHT_ROUTE)
const baseRacer = DRONE_RACERS[0]

const CIRCLE_RADIUS = 2
const CIRCLE_ROUTE = buildDroneRoute(
  Array.from({ length: 72 }, (_, index) => {
    const angle = (index / 72) * Math.PI * 2
    return { x: -CIRCLE_RADIUS * Math.cos(angle), y: 1, z: CIRCLE_RADIUS * Math.sin(angle) }
  }),
)

function racer(overrides: Partial<typeof baseRacer> = {}) {
  return { ...baseRacer, ...overrides }
}

describe('buildDroneRoute', () => {
  it('accumulates travelled distance at every route point', () => {
    expect(route.distances).toEqual([0, 10, 20])
    expect(route.totalLength).toBe(20)
  })

  it('reports an empty route below two points', () => {
    expect(buildDroneRoute([{ x: 0, y: 0, z: 0 }]).totalLength).toBe(0)
    expect(buildDroneRoute([]).totalLength).toBe(0)
  })
})

describe('wrapRouteDistance', () => {
  it('folds distances past the end back into the lap', () => {
    expect(wrapRouteDistance(route, 23)).toBeCloseTo(3)
    expect(wrapRouteDistance(route, 20)).toBeCloseTo(0)
  })

  it('folds negative distances forward so looping backwards also works', () => {
    expect(wrapRouteDistance(route, -2)).toBeCloseTo(18)
  })
})

describe('sampleDronePose', () => {
  it('follows the ideal line exactly when both amplitudes are zero', () => {
    const pose = sampleDronePose(route, 5, racer({ lateralAmplitudeMeters: 0, verticalAmplitudeMeters: 0 }))

    expect(pose.position.x).toBeCloseTo(5)
    expect(pose.position.y).toBeCloseTo(1)
    expect(pose.position.z).toBeCloseTo(0)
  })

  it('never strays further than its own amplitude from the line', () => {
    const spec = racer()

    for (let distance = 0; distance < route.totalLength; distance += 0.37) {
      const pose = sampleDronePose(route, distance, spec)

      expect(Math.abs(pose.position.z)).toBeLessThanOrEqual(spec.lateralAmplitudeMeters + 1e-9)
      expect(Math.abs(pose.position.y - 1)).toBeLessThanOrEqual(spec.verticalAmplitudeMeters + 1e-9)
    }
  })

  it('keeps the same pose one lap later', () => {
    const spec = racer()
    const first = sampleDronePose(route, 3, spec)
    const nextLap = sampleDronePose(route, 23, spec)

    expect(nextLap.position.x).toBeCloseTo(first.position.x)
    expect(nextLap.position.y).toBeCloseTo(first.position.y)
    expect(nextLap.position.z).toBeCloseTo(first.position.z)
    expect(nextLap.heading).toBeCloseTo(first.heading)
  })

  it('points the drone along the flight direction', () => {
    const pose = sampleDronePose(route, 5, racer({ lateralAmplitudeMeters: 0 }))

    expect(pose.heading).toBeCloseTo(Math.PI / 2)
  })

  it('clamps the height so a dive never pushes a drone through the floor', () => {
    const lowRoute = buildDroneRoute([
      { x: 0, y: 0, z: 0 },
      { x: 20, y: 0, z: 0 },
    ])
    const spec = racer({ verticalAmplitudeMeters: 0.5, verticalWavelengthMeters: 4 })
    const lowest = Math.min(
      ...Array.from({ length: 200 }, (_, index) => sampleDronePose(lowRoute, index * 0.1, spec).position.y),
    )

    expect(lowest).toBeCloseTo(DRONE_FLOOR_HEIGHT)
  })

  it('spreads the four racers into different positions on the same lap distance', () => {
    const positions = DRONE_RACERS.map((spec) => sampleDronePose(route, 7, spec).position)

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const separation = Math.hypot(positions[i].x - positions[j].x, positions[i].z - positions[j].z)
        expect(separation).toBeGreaterThan(0.02)
      }
    }
  })
})

describe('sampleDroneTrailRibbon', () => {  it('starts at the drone head and trails behind it', () => {
    const spec = racer({ lateralAmplitudeMeters: 0, verticalAmplitudeMeters: 0 })
    const ribbon = sampleDroneTrailRibbon(route, 10, spec, 5, 0.5, 0.05)

    expect(ribbon.length).toBe(30)
    expect(ribbon[0]).toBeCloseTo(10, 3)
    expect(ribbon[6]).toBeCloseTo(9.5, 3)
    expect(ribbon[24]).toBeCloseTo(8, 3)
  })

  it('gives every step width on both sides of the flight direction', () => {
    const spec = racer({ lateralAmplitudeMeters: 0, verticalAmplitudeMeters: 0 })
    const halfWidth = 0.05
    const ribbon = sampleDroneTrailRibbon(route, 10, spec, 5, 0.5, halfWidth)

    const leftZ = ribbon[2]
    const rightZ = ribbon[5]
    expect(Math.abs(leftZ - rightZ)).toBeCloseTo(halfWidth * 2, 3)
    expect(leftZ + rightZ).toBeCloseTo(0, 3)
  })

  it('reuses the caller buffer instead of allocating per frame', () => {
    const buffer = new Float32Array(30)
    const ribbon = sampleDroneTrailRibbon(route, 6, racer(), 5, 0.5, 0.05, buffer)

    expect(ribbon).toBe(buffer)
  })
})

describe('turnRateRadiansPerMeter', () => {
  it('is flat along a straight', () => {
    expect(turnRateRadiansPerMeter(route, 7)).toBeCloseTo(0, 6)
  })

  it('reads one over the radius in a left-hand circle', () => {
    expect(turnRateRadiansPerMeter(CIRCLE_ROUTE, CIRCLE_ROUTE.totalLength * 0.3)).toBeCloseTo(1 / CIRCLE_RADIUS, 2)
  })

  it('flips sign when the same circle is flown the other way round', () => {
    const reversed = buildDroneRoute([...CIRCLE_ROUTE.points].reverse())

    expect(turnRateRadiansPerMeter(reversed, reversed.totalLength * 0.3)).toBeLessThan(0)
  })
})

describe('speedFactorAt', () => {
  it('lets the drones run full speed down a straight', () => {
    expect(speedFactorAt(route, 7)).toBeCloseTo(1, 6)
  })

  it('slows them down through a tight circle', () => {
    const factor = speedFactorAt(CIRCLE_ROUTE, CIRCLE_ROUTE.totalLength * 0.3)

    expect(factor).toBeLessThan(0.8)
    expect(factor).toBeGreaterThanOrEqual(DRONE_MIN_SPEED_FACTOR)
  })
})

describe('bankRadians', () => {
  it('banks left into a left turn and right into a right turn', () => {
    expect(bankRadians(0.5, 4)).toBeLessThan(0)
    expect(bankRadians(-0.5, 4)).toBeGreaterThan(0)
  })

  it('stays level on a straight', () => {
    expect(bankRadians(0, 4.5)).toBeCloseTo(0, 6)
  })

  it('never exceeds the maximum bank', () => {
    expect(bankRadians(50, 20)).toBe(-DRONE_MAX_BANK_RADIANS)
    expect(bankRadians(-50, 20)).toBe(DRONE_MAX_BANK_RADIANS)
  })
})

describe('sampleDronePose banking', () => {
  it('leans the drone towards the inside of the corner', () => {
    const spec = racer({ lateralAmplitudeMeters: 0, verticalAmplitudeMeters: 0 })
    const pose = sampleDronePose(CIRCLE_ROUTE, CIRCLE_ROUTE.totalLength * 0.3, spec)

    expect(pose.roll).toBeLessThan(0)

    const upX = -Math.sin(pose.roll) * Math.cos(pose.heading)
    const upZ = Math.sin(pose.roll) * Math.sin(pose.heading)
    const toCentreX = -pose.position.x
    const toCentreZ = -pose.position.z
    const toCentreLength = Math.hypot(toCentreX, toCentreZ)
    const leanTowardsCentre = (upX * toCentreX + upZ * toCentreZ) / toCentreLength

    expect(leanTowardsCentre).toBeGreaterThan(0)
  })
})

describe('the pack races against itself', () => {  it('lets a faster drone overtake a slower one within a lap', () => {
    const lapLength = CIRCLE_ROUTE.totalLength
    const phases = DRONE_RACERS.map((_, index) => (lapLength * index) / DRONE_RACERS.length)
    const previousGaps = new Map<string, number>()
    const step = 1 / 60
    let overtakes = 0

    for (let time = 0; time < 30; time += step) {
      DRONE_RACERS.forEach((spec, index) => {
        const speed = spec.speedMetersPerSecond * speedFactorAt(CIRCLE_ROUTE, phases[index])
        phases[index] = (phases[index] + step * speed) % lapLength
      })

      for (let a = 0; a < phases.length; a++) {
        for (let b = a + 1; b < phases.length; b++) {
          const raw = ((phases[a] - phases[b]) % lapLength + lapLength) % lapLength
          const gap = raw > lapLength / 2 ? raw - lapLength : raw
          const key = `${a}:${b}`
          const previous = previousGaps.get(key)

          if (previous !== undefined && Math.abs(gap - previous) < lapLength / 4 && Math.sign(gap) !== Math.sign(previous)) {
            overtakes += 1
          }

          previousGaps.set(key, gap)
        }
      }
    }

    expect(overtakes).toBeGreaterThan(0)
  })
})

function maxSegmentTurn(points: { x: number; z: number }[]): number {
  let maximum = 0

  for (let index = 2; index < points.length; index++) {
    const incoming = Math.atan2(points[index - 1].x - points[index - 2].x, points[index - 1].z - points[index - 2].z)
    const outgoing = Math.atan2(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z)
    maximum = Math.max(maximum, Math.abs(Math.atan2(Math.sin(outgoing - incoming), Math.cos(outgoing - incoming))))
  }

  return maximum
}

describe('route smoothing', () => {
  const noisyLoop = Array.from({ length: 2400 }, (_, index) => {
    const angle = (index / 2400) * Math.PI * 2
    const radius = 3 + (index % 2 === 0 ? 0.012 : -0.012)
    return { x: -radius * Math.cos(angle), y: 1, z: radius * Math.sin(angle) }
  })

  it('rounds the direction kinks of the ideal line away', () => {
    const rawTurn = maxSegmentTurn(noisyLoop)
    const smoothedRoute = buildDroneRoute(noisyLoop, { closeLoop: true })

    expect(rawTurn).toBeGreaterThan(0.5)
    expect(maxSegmentTurn(smoothedRoute.points)).toBeLessThan(rawTurn * 0.5)
  })

  it('closes the lap with a return leg instead of teleporting', () => {
    const openRoute = buildDroneRoute(STRAIGHT_ROUTE, { closeLoop: true })
    const first = openRoute.points[0]
    const last = openRoute.points[openRoute.points.length - 1]

    expect(openRoute.totalLength).toBeGreaterThan(route.totalLength)
    expect(Math.hypot(last.x - first.x, last.y - first.y, last.z - first.z)).toBeLessThan(0.01)
  })

  it('exposes one turn rate per route point', () => {
    expect(route.turnRates.length).toBe(route.points.length)
    expect(CIRCLE_ROUTE.turnRates.length).toBe(CIRCLE_ROUTE.points.length)
  })

  it('keeps a racer continuous across the lap seam', () => {
    const closedCircle = buildDroneRoute(
      Array.from({ length: 73 }, (_, index) => {
        const angle = (index / 72) * Math.PI * 2
        return { x: -3 * Math.cos(angle), y: 1, z: 3 * Math.sin(angle) }
      }),
      { closeLoop: true },
    )
    const spec = racer()
    const before = sampleDronePose(closedCircle, closedCircle.totalLength - 0.02, spec).position
    const after = sampleDronePose(closedCircle, 0.02, spec).position

    expect(Math.hypot(after.x - before.x, after.y - before.y, after.z - before.z)).toBeLessThan(0.1)
  })
})

describe('approachAngle', () => {
  it('takes the short way around the plus-minus-pi seam', () => {
    const next = approachAngle(3, -3, 10, 0.1)

    expect(next).toBeGreaterThan(3)
  })

  it('never overshoots its target', () => {
    const next = approachAngle(0.2, 0.9, 100, 1)

    expect(next).toBeGreaterThan(0.2)
    expect(next).toBeLessThan(0.9)
  })

  it('settles on the target over repeated frames', () => {
    let heading = 0
    for (let frame = 0; frame < 60; frame++) heading = approachAngle(heading, 1.2, 9, 1 / 60)

    expect(heading).toBeCloseTo(1.2, 3)
  })
})
