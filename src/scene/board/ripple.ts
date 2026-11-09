/**
 * Board ripple: a damped radial wave that tilts and lifts each marble tile as a rigid body.
 * The TS function and the GLSL below share these constants; the test checks the TS side.
 */
export const RIPPLE = {
  amplitude: 0.03,
  /** Spatial frequency (rad per unit) and angular speed (rad/s): the front travels omega / k units/s. */
  k: 5.5,
  omega: 15,
  decay: 2.6,
  /** Tilt per unit slope; under 1 so tiles rock a little less than the true surface would. */
  tilt: 0.85,
  duration: 1.8,
  slots: 2,
} as const

const SPEED = RIPPLE.omega / RIPPLE.k

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Envelope shared by height and slope: wave front, distance falloff, decay and a soft end. */
function envelope(d: number, t: number, strength: number): number {
  const front = smoothstep(0, 0.35, SPEED * t - d)
  const end = 1 - smoothstep(RIPPLE.duration * 0.7, RIPPLE.duration, t)
  return (strength * RIPPLE.amplitude * front * end * Math.exp(-RIPPLE.decay * t)) / (1 + 0.8 * d)
}

/** Vertical offset of a tile whose center is `d` units from the impact, `t` seconds after it. */
export function rippleHeight(d: number, t: number, strength: number): number {
  if (t <= 0 || t >= RIPPLE.duration) return 0
  return envelope(d, t, strength) * Math.sin(RIPPLE.k * d - RIPPLE.omega * t)
}

const f = (n: number) => n.toFixed(4)

export const RIPPLE_GLSL = /* glsl */ `
attribute vec2 aCenter;
uniform float uRippleTime;
uniform vec4 uRipples[${RIPPLE.slots}];

void rippleAt(vec2 c, out float h, out vec3 w) {
  h = 0.0;
  vec2 g = vec2(0.0);
  for (int i = 0; i < ${RIPPLE.slots}; i++) {
    vec4 r = uRipples[i];
    float t = uRippleTime - r.z;
    if (t <= 0.0 || t >= ${f(RIPPLE.duration)}) continue;
    vec2 off = c - r.xy;
    float d = length(off);
    float env = r.w * ${f(RIPPLE.amplitude)}
      * smoothstep(0.0, 0.35, ${f(SPEED)} * t - d)
      * (1.0 - smoothstep(${f(RIPPLE.duration * 0.7)}, ${f(RIPPLE.duration)}, t))
      * exp(-${f(RIPPLE.decay)} * t) / (1.0 + 0.8 * d);
    float phase = ${f(RIPPLE.k)} * d - ${f(RIPPLE.omega)} * t;
    h += env * sin(phase);
    g += env * ${f(RIPPLE.k)} * cos(phase) * off / max(d, 1e-3);
  }
  // Small-angle rotation that turns +y into (-gx, 1, -gz): the tile tilts with the wave.
  w = vec3(-g.y, 0.0, g.x) * ${f(RIPPLE.tilt)};
}
`
