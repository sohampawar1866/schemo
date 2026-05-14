/**
 * control.ts — Client-side control systems math library
 * 
 * Evaluates transfer functions H(s) = num(s) / den(s) to generate
 * Bode, Nyquist, Step Response, Impulse Response, and Root Locus data.
 * No external dependencies — pure TypeScript math.
 */

interface Complex {
  re: number;
  im: number;
}

function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function complexDiv(a: Complex, b: Complex): Complex {
  const denom = b.re * b.re + b.im * b.im;
  return {
    re: (a.re * b.re + a.im * b.im) / denom,
    im: (a.im * b.re - a.re * b.im) / denom,
  };
}

function complexMag(c: Complex): number {
  return Math.sqrt(c.re * c.re + c.im * c.im);
}

function complexAngle(c: Complex): number {
  return Math.atan2(c.im, c.re);
}

/** Evaluate polynomial p(s) where coeffs = [a_n, a_{n-1}, ..., a_0] */
function evalPoly(coeffs: number[], s: Complex): Complex {
  let result: Complex = { re: 0, im: 0 };
  for (const c of coeffs) {
    result = complexAdd(complexMul(result, s), { re: c, im: 0 });
  }
  return result;
}

/** Evaluate transfer function H(s) = num(s) / den(s) */
function evalTF(num: number[], den: number[], s: Complex): Complex {
  return complexDiv(evalPoly(num, s), evalPoly(den, s));
}

/** Generate logarithmically spaced values */
function logspace(start: number, stop: number, n: number): number[] {
  const result: number[] = [];
  const step = (stop - start) / (n - 1);
  for (let i = 0; i < n; i++) {
    result.push(Math.pow(10, start + step * i));
  }
  return result;
}

// ─── Bode Data ───────────────────────────────────────────────
export interface BodeData {
  omega: number[];       // rad/s
  magnitude_db: number[];
  phase_deg: number[];
}

export function computeBode(num: number[], den: number[], nPoints = 500): BodeData {
  const omega = logspace(-2, 4, nPoints);
  const magnitude_db: number[] = [];
  const phase_deg: number[] = [];

  for (const w of omega) {
    const s: Complex = { re: 0, im: w };
    const h = evalTF(num, den, s);
    magnitude_db.push(20 * Math.log10(complexMag(h)));
    phase_deg.push((complexAngle(h) * 180) / Math.PI);
  }

  // Unwrap phase
  for (let i = 1; i < phase_deg.length; i++) {
    while (phase_deg[i] - phase_deg[i - 1] > 180) phase_deg[i] -= 360;
    while (phase_deg[i] - phase_deg[i - 1] < -180) phase_deg[i] += 360;
  }

  return { omega, magnitude_db, phase_deg };
}

// ─── Nyquist Data ────────────────────────────────────────────
export interface NyquistData {
  real: number[];
  imag: number[];
}

export function computeNyquist(num: number[], den: number[], nPoints = 1000): NyquistData {
  const omega = logspace(-3, 4, nPoints);
  const real: number[] = [];
  const imag: number[] = [];

  for (const w of omega) {
    const s: Complex = { re: 0, im: w };
    const h = evalTF(num, den, s);
    real.push(h.re);
    imag.push(h.im);
  }

  return { real, imag };
}

// ─── Step / Impulse Response ─────────────────────────────────
// Convert transfer function to controllable canonical state-space form
// and simulate with RK4 integration.

export interface TimeResponse {
  time: number[];
  amplitude: number[];
}

function tfToStateSpace(num: number[], den: number[]) {
  const n = den.length - 1; // system order
  if (n === 0) return null;

  // Normalize so den[0] = 1
  const a0 = den[0];
  const denNorm = den.map((d) => d / a0);

  // Pad numerator with leading zeros so it has length n+1
  const numPadded = new Array(n + 1 - num.length).fill(0).concat(num.map((v) => v / a0));

  // Controllable canonical form
  // A matrix: companion matrix
  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    A.push(new Array(n).fill(0));
    if (i < n - 1) {
      A[i][i + 1] = 1;
    }
  }
  // Fill last row (must be done after all rows are created)
  for (let i = 0; i < n; i++) {
    A[n - 1][i] = -denNorm[n - i];
  }

  // B vector
  const B = new Array(n).fill(0);
  B[n - 1] = 1;

  // C vector  (accounts for direct feedthrough)
  const C = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    C[i] = numPadded[n - i] - numPadded[0] * denNorm[n - i];
  }

  const D = numPadded[0]; // direct feedthrough

  return { A, B, C, D, n };
}

function matVecMul(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((sum, a, j) => sum + a * x[j], 0));
}

function vecAdd(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}

function vecScale(a: number[], s: number): number[] {
  return a.map((v) => v * s);
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function simulateStateSpace(
  A: number[][],
  B: number[],
  C: number[],
  D: number,
  n: number,
  inputFn: (t: number) => number,
  tEnd: number,
  dt: number
): TimeResponse {
  const time: number[] = [];
  const amplitude: number[] = [];
  let x = new Array(n).fill(0);

  for (let t = 0; t <= tEnd; t += dt) {
    const u = inputFn(t);
    const y = dotProduct(C, x) + D * u;
    time.push(t);
    amplitude.push(y);

    // RK4 integration: dx/dt = A*x + B*u
    const f = (state: number[], inp: number) =>
      vecAdd(matVecMul(A, state), vecScale(B, inp));

    const k1 = f(x, u);
    const k2 = f(vecAdd(x, vecScale(k1, dt / 2)), u);
    const k3 = f(vecAdd(x, vecScale(k2, dt / 2)), u);
    const k4 = f(vecAdd(x, vecScale(k3, dt)), u);

    x = vecAdd(
      x,
      vecScale(
        vecAdd(vecAdd(k1, vecScale(k2, 2)), vecAdd(vecScale(k3, 2), k4)),
        dt / 6
      )
    );
  }

  return { time, amplitude };
}

export function computeStep(num: number[], den: number[]): TimeResponse {
  const ss = tfToStateSpace(num, den);
  if (!ss) return { time: [0], amplitude: [num[0] / den[0]] };

  // Estimate settling time from dominant pole (heuristic)
  const tEnd = Math.max(10, 50 / Math.abs(den[den.length - 1] / den[den.length - 2] || 1));
  const dt = tEnd / 2000;

  return simulateStateSpace(ss.A, ss.B, ss.C, ss.D, ss.n, () => 1, Math.min(tEnd, 50), dt);
}

export function computeImpulse(num: number[], den: number[]): TimeResponse {
  const ss = tfToStateSpace(num, den);
  if (!ss) return { time: [0], amplitude: [0] };

  const tEnd = Math.max(10, 50 / Math.abs(den[den.length - 1] / den[den.length - 2] || 1));
  const dt = tEnd / 2000;

  // Approximate impulse as a very short pulse
  const pulseWidth = dt * 2;
  const inputFn = (t: number) => (t < pulseWidth ? 1 / pulseWidth : 0);

  return simulateStateSpace(ss.A, ss.B, ss.C, ss.D, ss.n, inputFn, Math.min(tEnd, 50), dt);
}

// ─── Root Locus ──────────────────────────────────────────────
export interface RootLocusData {
  gains: number[];
  roots: Complex[][];
}

/** Find roots of a polynomial using the Durand-Kerner method */
function findRoots(coeffs: number[], maxIter = 100): Complex[] {
  const n = coeffs.length - 1;
  if (n <= 0) return [];
  if (n === 1) return [{ re: -coeffs[1] / coeffs[0], im: 0 }];

  // Normalize
  const a0 = coeffs[0];
  const p = coeffs.map((c) => c / a0);

  // Initial guesses on a circle
  const roots: Complex[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n + 0.3;
    const r = Math.pow(Math.abs(p[n]), 1 / n) + 0.5;
    roots.push({ re: r * Math.cos(angle), im: r * Math.sin(angle) });
  }

  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    for (let i = 0; i < n; i++) {
      const pVal = evalPoly(p, roots[i]);
      let denom: Complex = { re: 1, im: 0 };
      for (let j = 0; j < n; j++) {
        if (j !== i) {
          denom = complexMul(denom, {
            re: roots[i].re - roots[j].re,
            im: roots[i].im - roots[j].im,
          });
        }
      }
      const delta = complexDiv(pVal, denom);
      roots[i].re -= delta.re;
      roots[i].im -= delta.im;
      maxDelta = Math.max(maxDelta, complexMag(delta));
    }
    if (maxDelta < 1e-10) break;
  }

  // Clean up near-zero imaginary parts
  for (const r of roots) {
    if (Math.abs(r.im) < 1e-8) r.im = 0;
  }

  return roots;
}

export function computeRootLocus(num: number[], den: number[], nGains = 200): RootLocusData {
  const gains = logspace(-2, 4, nGains);
  const roots: Complex[][] = [];

  // Pad numerator to match denominator length
  const padLen = den.length - num.length;
  const numPadded = padLen > 0 ? new Array(padLen).fill(0).concat(num) : num;

  for (const K of gains) {
    // Characteristic equation: den(s) + K * num(s) = 0
    const charPoly = den.map((d, i) => d + K * (numPadded[i] || 0));
    roots.push(findRoots(charPoly));
  }

  return { gains, roots };
}
