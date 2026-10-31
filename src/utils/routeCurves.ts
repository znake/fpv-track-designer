/**
 * Route transitions restricted to straight lines and circular arcs of one radius: no corner is
 * representable, the turn radius never drops below the chosen minimum, and the resulting line is
 * the shortest smooth connection between the two gate passes. Plane-only and THREE-free so the
 * geometry can be measured without a scene.
 */

export const MIN_TRANSITION_RADIUS = 0.32
export const MAX_TRANSITION_RADIUS = 2
export const TRANSITION_LENGTH_BUDGET = 1.3

export type RouteTurnKind = 'left' | 'straight' | 'right'
export type RoutePlanVariant = 'LSL' | 'RSR' | 'LSR' | 'RSL' | 'RLR' | 'LRL'

export interface RoutePose {
  x: number
  z: number
  heading: number
}

export interface RouteTurn {
  kind: RouteTurnKind
  angle: number
}

export interface RoutePlan {
  variant: RoutePlanVariant
  turns: RouteTurn[]
  total: number
}

export interface RouteSample {
  x: number
  z: number
}

const TAU = Math.PI * 2
const STRAIGHT_EPSILON = 1e-9

export function normalizeAngle(angle: number): number {
  let value = angle % TAU
  if (value < 0) value += TAU
  return value
}

export function transitionPoseParams(from: RoutePose, to: RoutePose): {
  distance: number
  alpha: number
  beta: number
} {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const distance = Math.hypot(dx, dz)
  if (distance < 1e-12) return { distance, alpha: 0, beta: normalizeAngle(to.heading - from.heading) }

  const chord = Math.atan2(dz, dx)
  return {
    distance,
    alpha: normalizeAngle(-chord + from.heading),
    beta: normalizeAngle(to.heading - chord),
  }
}

export function planTransitionTurns(alpha: number, beta: number, distance: number): RoutePlan[] {
  const sinAlpha = Math.sin(alpha)
  const sinBeta = Math.sin(beta)
  const cosAlpha = Math.cos(alpha)
  const cosBeta = Math.cos(beta)
  const cosDelta = Math.cos(alpha - beta)
  const plans: RoutePlan[] = []

  const add = (variant: RoutePlanVariant, turns: RouteTurn[]) => {
    plans.push({ variant, turns, total: turns.reduce((sum, turn) => sum + turn.angle, 0) })
  }

  const turn = (kind: RouteTurnKind, angle: number): RouteTurn => ({ kind, angle })

  const leftStraightLeft = 2 + distance * distance - 2 * cosDelta + 2 * distance * (sinAlpha - sinBeta)
  if (leftStraightLeft >= 0) {
    const pivot = Math.atan2(cosBeta - cosAlpha, distance + sinAlpha - sinBeta)
    add('LSL', [
      turn('left', normalizeAngle(-alpha + pivot)),
      turn('straight', Math.sqrt(leftStraightLeft)),
      turn('left', normalizeAngle(beta - pivot)),
    ])
  }

  const rightStraightRight = 2 + distance * distance - 2 * cosDelta + 2 * distance * (sinBeta - sinAlpha)
  if (rightStraightRight >= 0) {
    const pivot = Math.atan2(cosAlpha - cosBeta, distance - sinAlpha + sinBeta)
    add('RSR', [
      turn('right', normalizeAngle(alpha - pivot)),
      turn('straight', Math.sqrt(rightStraightRight)),
      turn('right', normalizeAngle(pivot - beta)),
    ])
  }

  // LSR/RSL are derived from the arc geometry instead of transcribed from a formulary: the
  // published tables disagree on segment order and one of them returns a mirrored endpoint.
  const delta = beta - alpha
  const shortX = distance * cosAlpha + Math.sin(delta)
  const shortZ = -distance * sinAlpha - Math.cos(delta) - 1
  const mixed = shortX * shortX + shortZ * shortZ - 4
  if (mixed >= 0) {
    const straight = Math.sqrt(mixed)
    const leftFirst = normalizeAngle(Math.atan2(2 * shortX + straight * shortZ, straight * shortX - 2 * shortZ))
    add('LSR', [
      turn('left', leftFirst),
      turn('straight', straight),
      turn('right', normalizeAngle(leftFirst - delta)),
    ])

    const mirrorX = distance * cosAlpha - Math.sin(delta)
    const mirrorZ = distance * sinAlpha - Math.cos(delta) - 1
    const mirrorMixed = mirrorX * mirrorX + mirrorZ * mirrorZ - 4
    if (mirrorMixed >= 0) {
      const mirrorStraight = Math.sqrt(mirrorMixed)
      const rightFirst = normalizeAngle(Math.atan2(2 * mirrorX + mirrorStraight * mirrorZ, mirrorStraight * mirrorX - 2 * mirrorZ))
      add('RSL', [
        turn('right', rightFirst),
        turn('straight', mirrorStraight),
        turn('left', normalizeAngle(rightFirst + delta)),
      ])
    }
  }

  const rightLeftRight = (6 - distance * distance + 2 * cosDelta + 2 * distance * (sinAlpha - sinBeta)) / 8
  if (Math.abs(rightLeftRight) <= 1) {
    const middle = normalizeAngle(TAU - Math.acos(rightLeftRight))
    const first = normalizeAngle(alpha - Math.atan2(cosAlpha - cosBeta, distance - sinAlpha + sinBeta) + normalizeAngle(middle / 2))
    add('RLR', [
      turn('right', first),
      turn('left', middle),
      turn('right', normalizeAngle(alpha - beta - first + normalizeAngle(middle))),
    ])
  }

  const leftRightLeft = (6 - distance * distance + 2 * cosDelta + 2 * distance * (sinBeta - sinAlpha)) / 8
  if (Math.abs(leftRightLeft) <= 1) {
    const middle = normalizeAngle(TAU - Math.acos(leftRightLeft))
    const first = normalizeAngle(-alpha - Math.atan2(cosAlpha - cosBeta, distance + sinAlpha - sinBeta) + middle / 2)
    add('LRL', [
      turn('left', first),
      turn('right', middle),
      turn('left', normalizeAngle(normalizeAngle(beta) - alpha - first + normalizeAngle(middle))),
    ])
  }

  return plans.sort((a, b) => a.total - b.total)
}

export function samplePlan(
  plan: RoutePlan,
  from: RoutePose,
  radius: number,
  samplesPerMeter = 24,
): { points: RouteSample[]; pose: RoutePose } {
  const points: RouteSample[] = [{ x: from.x, z: from.z }]
  let x = from.x
  let z = from.z
  let heading = from.heading

  for (const turn of plan.turns) {
    const arc = turn.angle * radius
    if (arc <= STRAIGHT_EPSILON) continue

    if (turn.kind === 'straight') {
      x += Math.cos(heading) * arc
      z += Math.sin(heading) * arc
      points.push({ x, z })
      continue
    }

    const direction = turn.kind === 'left' ? 1 : -1
    const centerX = x - Math.sin(heading) * radius * direction
    const centerZ = z + Math.cos(heading) * radius * direction
    const offsetX = x - centerX
    const offsetZ = z - centerZ
    const steps = Math.max(1, Math.ceil(arc * samplesPerMeter))

    for (let step = 1; step <= steps; step++) {
      const swept = direction * turn.angle * (step / steps)
      const cosSwept = Math.cos(swept)
      const sinSwept = Math.sin(swept)
      x = centerX + offsetX * cosSwept - offsetZ * sinSwept
      z = centerZ + offsetX * sinSwept + offsetZ * cosSwept
      points.push({ x, z })
    }

    heading += direction * turn.angle
  }

  return { points, pose: { x, z, heading } }
}

export interface TransitionOptions {
  minRadius?: number
  maxRadius?: number
  lengthBudget?: number
  preferShortest?: boolean
  isAllowed?: (points: readonly RouteSample[]) => boolean
}

export interface TransitionResult {
  points: RouteSample[]
  radius: number
  plan: RoutePlan
  length: number
}

export function planSmoothTransition(
  from: RoutePose,
  to: RoutePose,
  options: TransitionOptions = {},
): TransitionResult | null {
  const minRadius = options.minRadius ?? MIN_TRANSITION_RADIUS
  const maxRadius = options.maxRadius ?? MAX_TRANSITION_RADIUS
  const lengthBudget = options.lengthBudget ?? TRANSITION_LENGTH_BUDGET
  const chord = Math.hypot(to.x - from.x, to.z - from.z)
  const budget = Math.max(chord * lengthBudget, minRadius * Math.PI)
  const { distance, alpha, beta } = transitionPoseParams(from, to)

  const candidates: { radius: number; plan: RoutePlan; length: number }[] = []
  const stepCount = Math.max(1, Math.round((maxRadius - minRadius) / 0.05))

  for (let index = 0; index <= stepCount; index++) {
    const radius = minRadius + ((maxRadius - minRadius) * index) / stepCount
    for (const plan of planTransitionTurns(alpha, beta, distance / radius)) {
      candidates.push({ radius, plan, length: plan.total * radius })
    }
  }

  const withinBudget = candidates.filter((candidate) => candidate.length <= budget)
  const ordered = options.preferShortest
    ? [...candidates].sort((a, b) => a.length - b.length)
    : withinBudget.length > 0
      ? withinBudget.sort((a, b) => b.radius - a.radius || a.length - b.length)
      : candidates.sort((a, b) => a.length - b.length)

  for (const candidate of ordered) {
    const sampled = samplePlan(candidate.plan, from, candidate.radius)
    if (options.isAllowed && !options.isAllowed(sampled.points)) continue
    return { points: sampled.points, radius: candidate.radius, plan: candidate.plan, length: candidate.length }
  }

  return null
}
