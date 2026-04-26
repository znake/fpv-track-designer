import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { BackSide, Color, ShaderMaterial } from 'three'

const TOP_COLOR = '#4FA8F6'
const MID_COLOR = '#8FD3FF'
const HORIZON_COLOR = '#D8F1FF'
const BOTTOM_COLOR = '#76C2FA'
const HORIZON_OFFSET = 0.16
const RADIUS = 600
const SEGMENTS = 64

// Local-space gradient: each vertex of the sphere knows its own position,
// which directly tells us its altitude relative to the dome center. By
// keeping the dome glued to the camera, "altitude relative to dome" maps
// to "altitude relative to viewer", giving a stable gradient regardless of
// camera tilt or position.
const VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 midColor;
  uniform vec3 horizonColor;
  uniform vec3 bottomColor;
  uniform float exponent;
  uniform float horizonOffset;
  varying vec3 vLocal;
  void main() {
    // h: 1 = zenith, 0 = horizon, negative = below horizon.
    // A positive offset pushes the visible horizon band lower in the view,
    // leaving more mid-sky above the field before the pale horizon starts.
    float h = normalize(vLocal).y + horizonOffset;
    float t = pow(clamp(h, 0.0, 1.0), exponent);
    // Tight horizon haze band that fades into the mid sky, then blends
    // into the deep zenith. Gives a soft, atmospheric falloff that meets
    // the ground/fog at a similar pale tone.
    float haze = 1.0 - smoothstep(0.0, 0.16, clamp(h, 0.0, 1.0));
    vec3 lower = mix(midColor, horizonColor, haze);
    vec3 sky = mix(lower, topColor, t);
    float belowHorizon = smoothstep(0.0, 0.72, clamp(-h, 0.0, 1.0));
    sky = mix(sky, bottomColor, belowHorizon);
    gl_FragColor = vec4(sky, 1.0);
  }
`

interface SkyDomeProps {
  topColor?: string
  midColor?: string
  horizonColor?: string
  bottomColor?: string
  /**
   * Smaller = more of the dome is the deep top color (sharp transition near horizon).
   * Larger = the top color stays close to the zenith (soft, washed gradient).
   */
  exponent?: number
  /** Positive values push the horizon gradient lower in the viewport. */
  horizonOffset?: number
}

export function SkyDome({
  topColor = TOP_COLOR,
  midColor = MID_COLOR,
  horizonColor = HORIZON_COLOR,
  bottomColor = BOTTOM_COLOR,
  exponent = 0.82,
  horizonOffset = HORIZON_OFFSET,
}: SkyDomeProps) {
  const meshRef = useRef<Mesh>(null)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          topColor: { value: new Color(topColor) },
          midColor: { value: new Color(midColor) },
          horizonColor: { value: new Color(horizonColor) },
          bottomColor: { value: new Color(bottomColor) },
          exponent: { value: exponent },
          horizonOffset: { value: horizonOffset },
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [topColor, midColor, horizonColor, bottomColor, exponent, horizonOffset],
  )

  // Anchor the dome to the camera so the viewer is always at its center.
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.copy(state.camera.position)
    }
  })

  return (
    <mesh ref={meshRef} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[RADIUS, SEGMENTS, SEGMENTS]} />
    </mesh>
  )
}
