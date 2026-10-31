import { describe, expect, it } from 'vitest'
import type { Point3 } from '../types'
import {
  DRONE_FLOOR_HEIGHT,
  DRONE_MAX_BANK_RADIANS,
  DRONE_MAX_PITCH_RADIANS,
  DRONE_MIN_SPEED_FACTOR,
  DRONE_MIN_SPEED_METERS_PER_SECOND,
  DRONE_OVERSPEED_FACTOR,
  DRONE_RACERS,
  DRONE_SPLIT_S_WINDOW_METERS,
  advanceDroneFlight,
  bankRadians,
  buildDroneRoute,
  createDroneFlightState,
  curvatureMagnitudeAt,
  sampleDroneFlightPose,
  sampleDronePose,
  sampleDroneTrailRibbon,
  speedFactorAt,
  targetSpeedAt,
  turnRateRadiansPerMeter,
  wrapRouteDistance,
} from './droneRace'
import type { DroneFlightState, DroneRacerSpec, DroneRoute, Vec3 } from './droneRace'

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

function circleRoute(radius: number, samples = 96) {
  return buildDroneRoute(
    Array.from({ length: samples }, (_, index) => {
      const angle = (index / samples) * Math.PI * 2
      return { x: -radius * Math.cos(angle), y: 1, z: radius * Math.sin(angle) }
    }),
  )
}

function tiltRadians(up: Vec3): number {
  return Math.acos(Math.min(1, Math.max(-1, up.y)))
}

function flightAlong(route: DroneRoute, spec: DroneRacerSpec, seconds: number, state?: DroneFlightState) {
  const flight = state ?? createDroneFlightState(route, spec, 0)
  const step = 1 / 60
  const steps = Math.round(seconds / step)

  for (let index = 0; index < steps; index++) advanceDroneFlight(route, spec, flight, step)
  return flight
}

/** Oval with a wide middle and two tight ends, so the pace really has to vary. */
function ovalRoute(): DroneRoute {
  const samples = 480

  return buildDroneRoute(
    Array.from({ length: samples }, (_, index) => {
      const angle = (index / samples) * Math.PI * 2
      return { x: 8 * Math.cos(angle), y: 1, z: 2.5 * Math.sin(angle) }
    }),
    { closeLoop: true },
  )
}

function angleBetween(a: Vec3, b: Vec3): number {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z
  return Math.acos(Math.min(1, Math.max(-1, dot)))
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
    expect(nextLap.forward.x).toBeCloseTo(first.forward.x)
    expect(nextLap.up.y).toBeCloseTo(first.up.y)
  })

  it('points the drone along the flight direction', () => {
    const pose = sampleDronePose(
      route,
      5,
      racer({ lateralAmplitudeMeters: 0, verticalAmplitudeMeters: 0 }),
    )

    expect(pose.forward.x).toBeCloseTo(1)
    expect(pose.forward.y).toBeCloseTo(0)
  })

  it('keeps the drone above the floor through a dive without a hard kink', () => {
    const lowRoute = buildDroneRoute([
      { x: 0, y: 0, z: 0 },
      { x: 20, y: 0, z: 0 },
    ])
    const spec = racer({ verticalAmplitudeMeters: 0.5, verticalWavelengthMeters: 4 })
    const heights = Array.from({ length: 200 }, (_, index) => sampleDronePose(lowRoute, index * 0.1, spec).position.y)
    const lowest = Math.min(...heights)

    expect(lowest).toBeGreaterThanOrEqual(DRONE_FLOOR_HEIGHT)
    expect(lowest).toBeLessThan(DRONE_FLOOR_HEIGHT + 0.1)
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
  it('leans into a left-hand turn and the other way in a right-hand one', () => {
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

  it('leans the harder the faster the corner is flown', () => {
    expect(Math.abs(bankRadians(-0.5, 5))).toBeGreaterThan(Math.abs(bankRadians(-0.5, 3)))
  })
})

describe('sampleDronePose banking', () => {
  const levelSpec = racer({ lateralAmplitudeMeters: 0, verticalAmplitudeMeters: 0 })

  it('leans the drone towards the inside of the corner', () => {
    const pose = sampleDronePose(CIRCLE_ROUTE, CIRCLE_ROUTE.totalLength * 0.3, levelSpec)

    const toCentreX = -pose.position.x
    const toCentreZ = -pose.position.z
    const toCentreLength = Math.hypot(toCentreX, toCentreZ)
    const leanTowardsCentre = (pose.up.x * toCentreX + pose.up.z * toCentreZ) / toCentreLength

    expect(leanTowardsCentre).toBeGreaterThan(0)
    expect(tiltRadians(pose.up)).toBeGreaterThan((25 * Math.PI) / 180)
  })

  it('stays level on a straight', () => {
    const pose = sampleDronePose(route, 7, levelSpec)

    expect(tiltRadians(pose.up)).toBeCloseTo(0, 2)
  })

  it('banks harder in a tighter corner than in a wide one', () => {
    const tight = circleRoute(1.2)
    const wide = circleRoute(9)
    const tightTilt = tiltRadians(sampleDronePose(tight, tight.totalLength * 0.4, levelSpec).up)
    const wideTilt = tiltRadians(sampleDronePose(wide, wide.totalLength * 0.4, levelSpec).up)

    expect(tightTilt).toBeGreaterThan(wideTilt + 0.15)
  })

  it('never banks past the maximum bank', () => {
    for (const radius of [0.6, 1, 2, 4]) {
      const tight = circleRoute(radius)
      for (let step = 0; step < 40; step++) {
        const pose = sampleDronePose(tight, (tight.totalLength * step) / 40, levelSpec)
        expect(tiltRadians(pose.up)).toBeLessThanOrEqual(DRONE_MAX_BANK_RADIANS + 1e-6)
      }
    }
  })
})

describe('vertical loops and the split-S', () => {
  const levelSpec = racer({ lateralAmplitudeMeters: 0, verticalAmplitudeMeters: 0 })
  const LOOP_RADIUS = 0.7
  const LOOP_ROUTE = buildDroneRoute(
    Array.from({ length: 120 }, (_, index) => {
      const angle = (index / 120) * Math.PI * 2
      return {
        x: LOOP_RADIUS * Math.sin(angle),
        y: 1 + LOOP_RADIUS - LOOP_RADIUS * Math.cos(angle),
        z: 0,
      }
    }),
    { closeLoop: true },
  )

  it('turns inverted over the top of a tight vertical loop', () => {
    const pose = sampleDronePose(LOOP_ROUTE, LOOP_ROUTE.totalLength * 0.5, racer())

    expect(pose.up.y).toBeLessThan(0)
  })

  it('keeps the attitude smooth through a vertical loop', () => {
    const step = 0.02
    let worst = 0

    for (let distance = 0; distance < LOOP_ROUTE.totalLength; distance += step) {
      const current = sampleDronePose(LOOP_ROUTE, distance, racer())
      const next = sampleDronePose(LOOP_ROUTE, distance + step, racer())
      worst = Math.max(worst, angleBetween(current.forward, next.forward), angleBetween(current.up, next.up))
    }

    expect(worst).toBeLessThan(0.15)
  })

  it('slows the pack over the top of a vertical loop and lets the grippier racer hold more speed', () => {
    const apex = LOOP_ROUTE.totalLength * 0.5
    const lowGrip = racer({ lateralAccelMetersPerSecondSquared: 20 })
    const highGrip = racer({ lateralAccelMetersPerSecondSquared: 55 })

    expect(targetSpeedAt(LOOP_ROUTE, levelSpec, apex)).toBeLessThan(targetSpeedAt(route, levelSpec, 7))
    expect(targetSpeedAt(LOOP_ROUTE, highGrip, apex)).toBeGreaterThan(targetSpeedAt(LOOP_ROUTE, lowGrip, apex))
  })

  const CORNER_ROUTE = buildDroneRoute([
    ...Array.from({ length: 61 }, (_, index) => ({ x: index * 0.1, y: 1, z: 0 })),
    ...Array.from({ length: 60 }, (_, index) => ({ x: 6, y: 1, z: (index + 1) * 0.1 })),
  ])

  it('reserves the split-S for the sharpest corner of the lap', () => {
    expect(CORNER_ROUTE.maneuverDistance).toBeGreaterThan(0)
    expect(CORNER_ROUTE.maneuverDistance).toBeCloseTo(6 - DRONE_SPLIT_S_WINDOW_METERS * 0.6, 0)
    expect(circleRoute(3).maneuverDistance).toBe(-1)
  })

  it('dives inverted through the middle of the maneuver', () => {
    const mid = sampleDronePose(CORNER_ROUTE, CORNER_ROUTE.maneuverDistance, levelSpec)
    const plain = sampleDronePose(CORNER_ROUTE, CORNER_ROUTE.maneuverDistance - DRONE_SPLIT_S_WINDOW_METERS, levelSpec)

    expect(mid.up.y).toBeLessThan(-0.5)
    expect(mid.forward.x).toBeCloseTo(-1, 1)
    expect(mid.position.y).toBeLessThan(plain.position.y - 0.3)
  })

  it('rejoins the line without a jump at the maneuver edges', () => {
    const half = DRONE_SPLIT_S_WINDOW_METERS / 2
    const probe = 0.005
    const before = sampleDronePose(CORNER_ROUTE, CORNER_ROUTE.maneuverDistance - half - probe, levelSpec)
    const afterStart = sampleDronePose(CORNER_ROUTE, CORNER_ROUTE.maneuverDistance - half + probe, levelSpec)
    const beforeEnd = sampleDronePose(CORNER_ROUTE, CORNER_ROUTE.maneuverDistance + half - probe, levelSpec)
    const after = sampleDronePose(CORNER_ROUTE, CORNER_ROUTE.maneuverDistance + half + probe, levelSpec)

    expect(angleBetween(before.forward, afterStart.forward)).toBeLessThan(0.03)
    expect(angleBetween(beforeEnd.forward, after.forward)).toBeLessThan(0.03)
    expect(Math.abs(before.position.y - afterStart.position.y)).toBeLessThan(0.02)
    expect(Math.abs(beforeEnd.position.y - after.position.y)).toBeLessThan(0.02)
  })

  it('keeps the attitude smooth along a whole lap', () => {
    const path = buildDroneRoute(
      Array.from({ length: 320 }, (_, index) => {
        const angle = (index / 320) * Math.PI * 2
        const radius = 3 + Math.sin(angle * 3) * 0.6
        return { x: -radius * Math.cos(angle), y: 1 + Math.sin(angle * 2) * 0.2, z: radius * Math.sin(angle) }
      }),
      { closeLoop: true },
    )
    const step = 0.02
    let worst = 0

    for (let distance = 0; distance < path.totalLength; distance += step) {
      const current = sampleDronePose(path, distance, levelSpec)
      const next = sampleDronePose(path, distance + step, levelSpec)
      worst = Math.max(worst, angleBetween(current.forward, next.forward), angleBetween(current.up, next.up))
    }

    expect(worst).toBeLessThan(0.12)
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

describe('curvatureMagnitudeAt', () => {
  it('reads one over the radius on a circle', () => {
    expect(curvatureMagnitudeAt(CIRCLE_ROUTE, CIRCLE_ROUTE.totalLength * 0.3)).toBeCloseTo(1 / CIRCLE_RADIUS, 1)
  })

  it('is flat along a straight', () => {
    expect(curvatureMagnitudeAt(route, 7)).toBeCloseTo(0, 2)
  })
})

describe('targetSpeedAt', () => {
  it('allows the full top speed on a straight', () => {
    expect(targetSpeedAt(route, baseRacer, 7)).toBeCloseTo(baseRacer.speedMetersPerSecond, 5)
  })

  it('settles well below top speed in a tight circle', () => {
    const tight = circleRoute(0.5)

    expect(targetSpeedAt(tight, baseRacer, tight.totalLength * 0.3)).toBeLessThan(baseRacer.speedMetersPerSecond * 0.8)
  })

  it('never asks for less than the minimum flight speed', () => {
    const hairpin = circleRoute(0.32)

    expect(targetSpeedAt(hairpin, baseRacer, hairpin.totalLength * 0.5)).toBeGreaterThanOrEqual(
      DRONE_MIN_SPEED_METERS_PER_SECOND,
    )
  })
})

describe('advanceDroneFlight', () => {
  it('spools up with inertia instead of jumping to the top speed', () => {
    const flight: DroneFlightState = { distance: 0, speed: 0, controlAccelMetersPerSecondSquared: 0 }
    advanceDroneFlight(route, baseRacer, flight, 1 / 60)

    expect(flight.speed).toBeGreaterThan(0)
    expect(flight.speed).toBeLessThan(baseRacer.speedMetersPerSecond)
    expect(flightAlong(route, baseRacer, 3, flight).speed).toBeCloseTo(baseRacer.speedMetersPerSecond, 1)
  })

  it('integrates the same way at any frame rate', () => {
    const coarse: DroneFlightState = { distance: 0, speed: 2, controlAccelMetersPerSecondSquared: 0 }
    const fine: DroneFlightState = { distance: 0, speed: 2, controlAccelMetersPerSecondSquared: 0 }

    for (let index = 0; index < 60; index++) advanceDroneFlight(route, baseRacer, coarse, 1 / 60)
    for (let index = 0; index < 240; index++) advanceDroneFlight(route, baseRacer, fine, 1 / 240)

    expect(fine.speed).toBeCloseTo(coarse.speed, 3)
    expect(Math.abs(fine.distance - coarse.distance)).toBeLessThan(0.02)
  })

  it('spools the control acceleration up instead of snapping the body', () => {
    const flight: DroneFlightState = { distance: 0, speed: 8, controlAccelMetersPerSecondSquared: 0 }
    advanceDroneFlight(route, baseRacer, flight, 1 / 120)

    expect(flight.controlAccelMetersPerSecondSquared).toBeLessThan(0)
    expect(flight.controlAccelMetersPerSecondSquared).toBeGreaterThan(-baseRacer.brakeAccelMetersPerSecondSquared + 1)
  })

  it('bleeds speed climbing and gains it diving', () => {
    const climb = buildDroneRoute([
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
    ])
    const dive = buildDroneRoute([
      { x: 0, y: 10, z: 0 },
      { x: 10, y: 0, z: 0 },
    ])
    const level = flightAlong(route, baseRacer, 1.5)
    const up = flightAlong(climb, baseRacer, 1.5)
    const down = flightAlong(dive, baseRacer, 1.5)

    expect(up.speed).toBeLessThan(level.speed - 0.2)
    expect(down.speed).toBeGreaterThan(level.speed + 0.2)
  })

  it('accelerates out of the wide sections and brakes into the tight ends', () => {
    const oval = ovalRoute()
    const flight = createDroneFlightState(oval, baseRacer, 0)
    const step = 1 / 60
    let fastest = 0
    let slowest = Number.POSITIVE_INFINITY

    for (let index = 0; index < Math.round(20 / step); index++) {
      advanceDroneFlight(oval, baseRacer, flight, step)
      fastest = Math.max(fastest, flight.speed)
      slowest = Math.min(slowest, flight.speed)
    }

    expect(fastest).toBeGreaterThan(baseRacer.speedMetersPerSecond * 0.85)
    expect(slowest).toBeLessThan(baseRacer.speedMetersPerSecond * 0.7)
    expect(slowest).toBeGreaterThanOrEqual(DRONE_MIN_SPEED_METERS_PER_SECOND)
    expect(fastest).toBeLessThanOrEqual(baseRacer.speedMetersPerSecond * DRONE_OVERSPEED_FACTOR)
  })

  it('keeps the drone on the line while the speed changes', () => {
    const oval = ovalRoute()
    const flight = flightAlong(oval, baseRacer, 6)
    const pose = sampleDroneFlightPose(oval, baseRacer, flight)

    expect(flight.distance).toBeGreaterThanOrEqual(0)
    expect(flight.distance).toBeLessThan(oval.totalLength)
    expect(pose.position.y).toBeGreaterThan(0.7)
    expect(pose.position.y).toBeLessThan(1.5)
  })
})

describe('acceleration-driven pitch', () => {
  it('drops the nose under power and raises it under braking', () => {
    const power = sampleDroneFlightPose(route, baseRacer, {
      distance: 5,
      speed: 5,
      controlAccelMetersPerSecondSquared: 15,
    })
    const brake = sampleDroneFlightPose(route, baseRacer, {
      distance: 5,
      speed: 5,
      controlAccelMetersPerSecondSquared: -15,
    })

    expect(power.forward.y).toBeLessThan(-0.05)
    expect(brake.forward.y).toBeGreaterThan(0.05)
  })

  it('never pitches past the attitude limit', () => {
    const extreme = sampleDroneFlightPose(route, baseRacer, {
      distance: 5,
      speed: 5,
      controlAccelMetersPerSecondSquared: 500,
    })

    expect(Math.asin(-extreme.forward.y)).toBeLessThanOrEqual(DRONE_MAX_PITCH_RADIANS + 1e-6)
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

describe('pose frame', () => {
  it('returns orthonormal forward and up vectors', () => {
    const pose = sampleDronePose(route, 7, racer())
    const dot = pose.forward.x * pose.up.x + pose.forward.y * pose.up.y + pose.forward.z * pose.up.z

    expect(Math.hypot(pose.forward.x, pose.forward.y, pose.forward.z)).toBeCloseTo(1, 6)
    expect(Math.hypot(pose.up.x, pose.up.y, pose.up.z)).toBeCloseTo(1, 6)
    expect(dot).toBeCloseTo(0, 6)
  })

  it('keeps the frame orthonormal while the body pitches under power', () => {
    const pose = sampleDroneFlightPose(route, baseRacer, {
      distance: 5,
      speed: 5,
      controlAccelMetersPerSecondSquared: 18,
    })
    const dot = pose.forward.x * pose.up.x + pose.forward.y * pose.up.y + pose.forward.z * pose.up.z

    expect(dot).toBeCloseTo(0, 6)
    expect(Math.hypot(pose.up.x, pose.up.y, pose.up.z)).toBeCloseTo(1, 6)
  })
})
