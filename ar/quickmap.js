// Behrang Lab — "quick map" from user-marked rectangle corners (e.g. a desk top) in 2+ views.
// Known rectangle (W x D metres) → focal length (grid search on reprojection error) → metric 6DoF pose of every view
// → ORB matches between views triangulated with the known poses → point-cloud map in desk coordinates
// (origin = front-left corner, X = front edge, Y = towards the back, Z = up).

const mat3 = (K) => K; // marker
function rowMajorR(cv, rv) { const R = new cv.Mat(); cv.Rodrigues(rv, R); const a = Array.from(R.data64F); R.delete(); return a; }

export function solveViews(cv, views, W, D, w, h, _flipped = false) {
  const obj = [[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]];
  const pose = (f, v) => {
    const idx = v.corners.map((c, i) => c ? i : -1).filter(i => i >= 0); if (idx.length < 3) return null;
    const o = cv.matFromArray(idx.length, 1, cv.CV_32FC3, idx.flatMap(i => obj[i])), p = cv.matFromArray(idx.length, 1, cv.CV_32FC2, idx.flatMap(i => v.corners[i]));
    const K = cv.matFromArray(3, 3, cv.CV_64F, [f, 0, w / 2, 0, f, h / 2, 0, 0, 1]), d = cv.Mat.zeros(4, 1, cv.CV_64F), rv = new cv.Mat(), tv = new cv.Mat();
    let ok = false; try { ok = cv.solvePnP(o, p, K, d, rv, tv, false, idx.length === 4 ? cv.SOLVEPNP_IPPE : cv.SOLVEPNP_SQPNP); } catch (e) { ok = false; }
    let out = null;
    if (ok) {
      const pr = new cv.Mat(); cv.projectPoints(o, rv, tv, K, d, pr); let e = 0;
      for (let k = 0; k < idx.length; k++) e += (pr.data32F[k * 2] - v.corners[idx[k]][0]) ** 2 + (pr.data32F[k * 2 + 1] - v.corners[idx[k]][1]) ** 2;
      pr.delete(); const R = rowMajorR(cv, rv), t = Array.from(tv.data64F);
      const front = idx.every(i => { const X = obj[i]; return R[6] * X[0] + R[7] * X[1] + R[8] * X[2] + t[2] > 0; });
      out = { R, t, rms: Math.sqrt(e / idx.length), n: idx.length, front };
    }
    [o, p, K, d, rv, tv].forEach(m => m.delete()); return out;
  };
  const four = views.filter(v => v.corners.filter(Boolean).length === 4);
  if (!four.length) throw new Error('حداقل در یک نما باید هر ۴ گوشه علامت خورده باشد (برای محاسبه‌ی زاویه‌ی دید دوربین)');
  const cost = f => { let s = 0, n = 0; for (const v of four) { const p = pose(f, v); if (!p || !p.front) return 1e9; s += p.rms * p.rms; n++; } return Math.sqrt(s / n); };
  const M = Math.max(w, h); let best = [1e18, 0];
  for (let i = 0; i <= 80; i++) { const f = M * 0.25 * Math.pow(2.2 / 0.25, i / 80); const c = cost(f); if (c < best[0]) best = [c, f]; }
  let lo = best[1] / 1.06, hi = best[1] * 1.06; // golden-section refinement
  for (let k = 0; k < 30; k++) { const a = lo + (hi - lo) * 0.382, b = lo + (hi - lo) * 0.618; if (cost(a) < cost(b)) hi = b; else lo = a; }
  const f = (lo + hi) / 2, poses = views.map(v => pose(f, v));
  // handedness: cameras must be above the desk (Z up). If the corners were tapped clockwise (seen from above), relabel and solve again.
  const cz = poses.filter(p => p && p.front).map(p => -(p.R[2] * p.t[0] + p.R[5] * p.t[1] + p.R[8] * p.t[2]));
  if (!_flipped && cz.length && cz.reduce((a, b) => a + b, 0) / cz.length < 0) {
    const re = views.map(v => ({ ...v, corners: [v.corners[0], v.corners[3], v.corners[2], v.corners[1]] }));
    const r = solveViews(cv, re, D, W, w, h, true); r.flipped = true; r.views = re; return r; }
  return { f, rms: cost(f), poses, fourViews: four.length, flipped: false, views };
}

// linear triangulation (DLT, inhomogeneous least squares) from N views
function triangulate(Ps, xs) {
  const A = [], b = [];
  for (let i = 0; i < Ps.length; i++) { const P = Ps[i], [x, y] = xs[i];
    A.push([x * P[8] - P[0], x * P[9] - P[1], x * P[10] - P[2]]); b.push(P[3] - x * P[11]);
    A.push([y * P[8] - P[4], y * P[9] - P[5], y * P[10] - P[6]]); b.push(P[7] - y * P[11]); }
  const N = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], r = [0, 0, 0];
  for (let k = 0; k < A.length; k++) for (let i = 0; i < 3; i++) { r[i] += A[k][i] * b[k]; for (let j = 0; j < 3; j++) N[i][j] += A[k][i] * A[k][j]; }
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(N); if (Math.abs(d) < 1e-12) return null;
  const col = (c) => N.map((row, i) => row.map((v, j) => j === c ? r[i] : v));
  return [det(col(0)) / d, det(col(1)) / d, det(col(2)) / d];
}
const projM = (f, w, h, R, t) => { const K = [f, 0, w / 2, 0, f, h / 2, 0, 0, 1], P = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 3; k++) s += K[i * 3 + k] * (j < 3 ? R[k * 3 + j] : t[k]); P.push(s); } return P; };
const reproj = (P, X) => { const z = P[8] * X[0] + P[9] * X[1] + P[10] * X[2] + P[11]; return [(P[0] * X[0] + P[1] * X[1] + P[2] * X[2] + P[3]) / z, (P[4] * X[0] + P[5] * X[1] + P[6] * X[2] + P[7]) / z, z]; };

// views[i]: {gray: cv.Mat (CLAHE applied), rgba?: Uint8ClampedArray, corners}
export function buildMap(cv, views, W, D, w, h, orbOpt = { n: 2000, scale: 1.2, levels: 8, edge: 19, fast: 10 }) {
  const sol = solveViews(cv, views, W, D, w, h), f = sol.f; if (sol.flipped) { const t = W; W = D; D = t; }
  const V = sol.views.map((v, i) => ({ ...v, pose: sol.poses[i] })).filter(v => v.pose && v.pose.front);
  if (V.length < 2) throw new Error('حداقل ۲ نما با گوشه‌های معتبر لازم است');
  const orb = new cv.ORB(orbOpt.n, orbOpt.scale, orbOpt.levels, orbOpt.edge, 0, 2, 0, 31, orbOpt.fast);
  for (const v of V) { const kp = new cv.KeyPointVector(), des = new cv.Mat(), none = new cv.Mat(); orb.detectAndCompute(v.gray, none, kp, des); none.delete();
    v.kp = []; for (let i = 0; i < kp.size(); i++) { const p = kp.get(i).pt; v.kp.push([p.x, p.y]); } kp.delete(); v.des = des; v.P = projM(f, w, h, v.pose.R, v.pose.t);
    v.C = [0, 1, 2].map(i => -(v.pose.R[i] * v.pose.t[0] + v.pose.R[3 + i] * v.pose.t[1] + v.pose.R[6 + i] * v.pose.t[2])); }
  orb.delete();
  let xyz = [], des = [], kf = [], col = [], obs = [];
  const diag = Math.hypot(W, D);
  let pairs = 0, kept = 0, EPI = 4;
  // epipolar-guided matching: with known poses, a keypoint's match must lie on its epipolar line (±2 px) → far more correct matches than plain ratio tests across wide baselines
  const PC = new Uint8Array(256); for (let i = 0; i < 256; i++) PC[i] = (i & 1) + PC[i >> 1];
  const ham = (A, a, B, b) => { let d = 0; for (let k = 0; k < 32; k++) d += PC[A[a + k] ^ B[b + k]]; return d; };
  const Kinv = [1 / f, 0, -w / 2 / f, 0, 1 / f, -h / 2 / f, 0, 0, 1];
  const m3 = (A, B) => { const C = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j]; return C; };
  const T3 = A => [A[0], A[3], A[6], A[1], A[4], A[7], A[2], A[5], A[8]];
  const runMatching = () => { xyz = []; des = []; kf = []; col = []; obs = V.map(() => []); kept = 0;
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) {
    pairs++; const Ri = V[i].pose.R, Rj = V[j].pose.R, ti = V[i].pose.t, tj = V[j].pose.t;
    const R = m3(Rj, T3(Ri)), Rt = [0, 1, 2].map(r => R[r * 3] * ti[0] + R[r * 3 + 1] * ti[1] + R[r * 3 + 2] * ti[2]), t = [tj[0] - Rt[0], tj[1] - Rt[1], tj[2] - Rt[2]];
    const tx = [0, -t[2], t[1], t[2], 0, -t[0], -t[1], t[0], 0], F = m3(T3(Kinv), m3(m3(tx, R), Kinv));
    const Di = V[i].des.data, Dj = V[j].des.data, used = new Uint8Array(V[j].kp.length);
    for (let a = 0; a < V[i].kp.length; a++) {
      const [x, y] = V[i].kp[a], l0 = F[0] * x + F[1] * y + F[2], l1 = F[3] * x + F[4] * y + F[5], l2 = F[6] * x + F[7] * y + F[8], ln = Math.hypot(l0, l1); if (ln < 1e-12) continue;
      let b1 = -1, d1 = 999, d2 = 999;
      for (let b = 0; b < V[j].kp.length; b++) { const [u, v] = V[j].kp[b]; if (Math.abs(l0 * u + l1 * v + l2) / ln > EPI) continue; const d = ham(Di, a * 32, Dj, b * 32); if (d < d1) { d2 = d1; d1 = d; b1 = b; } else if (d < d2) d2 = d; }
      if (b1 < 0 || d1 > 60 || d1 > 0.85 * d2 || used[b1]) continue;
      const xi = V[i].kp[a], xj = V[j].kp[b1], X = triangulate([V[i].P, V[j].P], [xi, xj]); if (!X) continue;
      const ri = reproj(V[i].P, X), rj = reproj(V[j].P, X); if (ri[2] <= 0 || rj[2] <= 0) continue;
      if (Math.hypot(ri[0] - xi[0], ri[1] - xi[1]) > EPI || Math.hypot(rj[0] - xj[0], rj[1] - xj[1]) > EPI) continue;
      const vi = V[i].C.map((c, q) => X[q] - c), vj = V[j].C.map((c, q) => X[q] - c), ang = Math.acos(Math.min(1, (vi[0] * vj[0] + vi[1] * vj[1] + vi[2] * vj[2]) / (Math.hypot(...vi) * Math.hypot(...vj))));
      if (ang < 0.03) continue;
      if (Math.hypot(X[0] - W / 2, X[1] - D / 2, X[2]) > 2.5 * diag + 1) continue;
      used[b1] = 1; obs[i].push([X, xi]); obs[j].push([X, xj]);
      for (const [v, qi] of [[V[i], a], [V[j], b1]]) { xyz.push(...X); des.push(v.des.data.subarray(qi * 32, qi * 32 + 32)); kf.push(V.indexOf(v));
        if (v.rgba) { const px = Math.min(w - 1, Math.max(0, Math.round(v.kp[qi][0]))), py = Math.min(h - 1, Math.max(0, Math.round(v.kp[qi][1]))), o = (py * w + px) * 4; col.push(v.rgba[o], v.rgba[o + 1], v.rgba[o + 2]); } else col.push(200, 200, 200); }
      kept++; }
  } };
  runMatching();
  // pose refinement ("bundle-lite"): re-estimate every view from its triangulated points + the marked corners, then match again
  const objC = [[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]];
  for (let it = 0; it < 2; it++) {
    V.forEach((v, vi) => { const o3 = [], o2 = []; obs[vi].forEach(([X, x]) => { o3.push(...X); o2.push(...x); });
      v.corners.forEach((c, k) => { if (c) for (let r = 0; r < 8; r++) { o3.push(...objC[k]); o2.push(...c); } }); // corners weighted ×8
      if (o2.length / 2 < 12) return;
      const ob = cv.matFromArray(o3.length / 3, 1, cv.CV_32FC3, o3), im = cv.matFromArray(o2.length / 2, 1, cv.CV_32FC2, o2), K = cv.matFromArray(3, 3, cv.CV_64F, [f, 0, w / 2, 0, f, h / 2, 0, 0, 1]), d = cv.Mat.zeros(4, 1, cv.CV_64F);
      const Rm = cv.matFromArray(3, 3, cv.CV_64F, v.pose.R), rv = new cv.Mat(); cv.Rodrigues(Rm, rv); const tv = cv.matFromArray(3, 1, cv.CV_64F, v.pose.t);
      if (cv.solvePnP(ob, im, K, d, rv, tv, true, cv.SOLVEPNP_ITERATIVE)) { v.pose = { ...v.pose, R: rowMajorR(cv, rv), t: Array.from(tv.data64F) }; v.P = projM(f, w, h, v.pose.R, v.pose.t);
        v.C = [0, 1, 2].map(i => -(v.pose.R[i] * v.pose.t[0] + v.pose.R[3 + i] * v.pose.t[1] + v.pose.R[6 + i] * v.pose.t[2])); }
      [ob, im, K, d, Rm, rv, tv].forEach(m => m.delete()); });
    EPI = 3; runMatching(); }
  V.forEach(v => v.des.delete());
  const n = des.length, D8 = new Uint8Array(n * 32); des.forEach((d, i) => D8.set(d, i * 32));
  const keyframes = V.map(v => [...v.C, v.pose.R[6], v.pose.R[7], v.pose.R[8]]);
  const XYZ = new Float32Array(xyz), KF = new Uint16Array(kf), byKF = new Map(); for (let i = 0; i < n; i++) { if (!byKF.has(KF[i])) byKF.set(KF[i], []); byKF.get(KF[i]).push(i); }
  const meta = { name: 'نقشه‌ی سریع از ' + V.length + ' نما', K: [f, w / 2, h / 2], k1: 0, size: [w, h], up: [0, 0, 1], scale_m_per_unit: 1, deskH: 0, deskCenter: [W / 2, D / 2, 0], desk: [W, D], n, keyframes, orb: { ...orbOpt, longSide: Math.max(w, h) }, assumption: 'ابعاد واردشده ' + Math.round(W * 100) + '×' + Math.round(D * 100) + ' سانتی‌متر' };
  return { map: { meta, xyz: XYZ, des: D8, kf: KF, pc: XYZ, pcc: new Uint8Array(col), byKF, n }, stats: { f, cornerRms: sol.rms, views: V.length, fourViews: sol.fourViews, points: kept, perView: V.map(v => ({ rms: v.pose.rms, n: v.pose.n })) } };
}
