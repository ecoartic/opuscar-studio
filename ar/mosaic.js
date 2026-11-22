// Behrang Lab — planar surface mosaic for AR targets
// Walk around a table/floor: frames are registered to a top-down reference with ORB + RANSAC homography,
// rectified into one large planar map ("mosaic"), which then becomes a single MindAR target.
// OpenCV.js (Apache-2.0) is loaded on demand.

const CV_URL = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@5.0.0-release.1/dist/opencv.js';
let cvP = null;
export function loadCV(onProgress) {
  if (cvP) return cvP;
  cvP = new Promise((res, rej) => {
    onProgress && onProgress('در حال بار کردن OpenCV (حدود ۴ مگابایت، فقط بار اول)…');
    const s = document.createElement('script'); s.src = CV_URL; s.async = true;
    s.onerror = () => rej(new Error('OpenCV بار نشد'));
    s.onload = async () => {
      let c = window.cv;
      if (c && typeof c.then === 'function') c = await c;
      if (c && !c.Mat) await new Promise(r => { c.onRuntimeInitialized = r; });
      window.cv = c; res(c);
    };
    document.head.appendChild(s);
  });
  return cvP;
}

const mul = (A, B) => { const C = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return C; };
const proj = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
const area = q => { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], n = q[(i + 1) % q.length]; a += p[0] * n[1] - n[0] * p[1]; } return a / 2; };
const convex = q => { let s = 0; for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4]; const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (z === 0) return false; const sg = Math.sign(z); if (s && sg !== s) return false; s = sg; } return true; };

export class Mosaic {
  constructor(cv, { maxSide = 480, size = 2600 } = {}) {
    this.cv = cv; this.maxSide = maxSide; this.size = size;
    this.orb = new cv.ORB(1200); this.bf = new cv.BFMatcher(cv.NORM_HAMMING, false);
    this.kfs = []; this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d'); this.grab = document.createElement('canvas');
    this.bbox = null; this.lastQuad = null; this.lost = 0;
  }
  _frame(video) {
    const vw = video.videoWidth, vh = video.videoHeight, s = this.maxSide / Math.max(vw, vh);
    const w = Math.round(vw * s), h = Math.round(vh * s); this.grab.width = w; this.grab.height = h;
    const g = this.grab.getContext('2d', { willReadFrequently: true }); g.drawImage(video, 0, 0, w, h);
    const cv = this.cv, rgba = cv.imread(this.grab), gray = new cv.Mat(); cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
    const kp = new cv.KeyPointVector(), des = new cv.Mat(), none = new cv.Mat();
    this.orb.detectAndCompute(gray, none, kp, des); none.delete(); gray.delete();
    const pts = []; for (let i = 0; i < kp.size(); i++) { const p = kp.get(i).pt; pts.push([p.x, p.y]); } kp.delete();
    return { rgba, des, pts, w, h };
  }
  _match(f, kf) {
    const cv = this.cv; if (f.des.rows < 20 || kf.des.rows < 20) return null;
    const mm = new cv.DMatchVectorVector(); this.bf.knnMatch(f.des, kf.des, mm, 2);
    const src = [], dst = [];
    for (let i = 0; i < mm.size(); i++) { const m = mm.get(i); if (m.size() < 2) continue; const a = m.get(0), b = m.get(1); if (a.distance < 0.78 * b.distance) { src.push(...f.pts[a.queryIdx]); dst.push(...kf.pts[a.trainIdx]); } }
    mm.delete(); if (src.length / 2 < 15) return null;
    const S = cv.matFromArray(src.length / 2, 1, cv.CV_32FC2, src), D = cv.matFromArray(dst.length / 2, 1, cv.CV_32FC2, dst), mask = new cv.Mat();
    const Hm = cv.findHomography(S, D, cv.RANSAC, 4.0, mask); let inl = 0; for (let i = 0; i < mask.rows; i++) inl += mask.data[i];
    const H = Hm.rows === 3 ? Array.from(Hm.data64F) : null; S.delete(); D.delete(); mask.delete(); Hm.delete();
    return H ? { H, inl, n: src.length / 2 } : null;
  }
  _quad(H, w, h) { return [[0, 0], [w, 0], [w, h], [0, h]].map(p => proj(H, p[0], p[1])); }
  _paint(f, H) {
    const cv = this.cv, q = this._quad(H, f.w, f.h);
    let x0 = Math.max(0, Math.floor(Math.min(...q.map(p => p[0])))), y0 = Math.max(0, Math.floor(Math.min(...q.map(p => p[1]))));
    let x1 = Math.min(this.size, Math.ceil(Math.max(...q.map(p => p[0])))), y1 = Math.min(this.size, Math.ceil(Math.max(...q.map(p => p[1]))));
    if (x1 - x0 < 8 || y1 - y0 < 8) return;
    const T = mul([1, 0, -x0, 0, 1, -y0, 0, 0, 1], H), Tm = cv.matFromArray(3, 3, cv.CV_64F, T), out = new cv.Mat();
    cv.warpPerspective(f.rgba, out, Tm, new cv.Size(x1 - x0, y1 - y0), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(0, 0, 0, 0));
    const tmp = document.createElement('canvas'); cv.imshow(tmp, out); Tm.delete(); out.delete();
    this.ctx.save(); this.ctx.globalCompositeOperation = 'destination-over'; this.ctx.drawImage(tmp, x0, y0); this.ctx.restore(); // keep earlier (closer-to-reference) pixels
    this.bbox = this.bbox ? [Math.min(this.bbox[0], x0), Math.min(this.bbox[1], y0), Math.max(this.bbox[2], x1), Math.max(this.bbox[3], y1)] : [x0, y0, x1, y1];
  }
  // first frame = reference (should be roughly top-down): defines mosaic coordinates
  start(video) {
    const f = this._frame(video), ox = (this.size - f.w) / 2, oy = (this.size - f.h) / 2, H = [1, 0, ox, 0, 1, oy, 0, 0, 1];
    this.refArea = f.w * f.h; this._paint(f, H); f.rgba.delete(); this.kfs.push({ des: f.des, pts: f.pts, H, c: proj(H, f.w / 2, f.h / 2), w: f.w, h: f.h });
    this.lastQuad = this._quad(H, f.w, f.h); return { ok: true, kfs: 1, inl: f.pts.length };
  }
  step(video) {
    const f = this._frame(video);
    // try the 3 keyframes closest to the last known position
    const ref = this.lastQuad ? [(this.lastQuad[0][0] + this.lastQuad[2][0]) / 2, (this.lastQuad[0][1] + this.lastQuad[2][1]) / 2] : this.kfs[0].c;
    const cand = this.kfs.map(k => [Math.hypot(k.c[0] - ref[0], k.c[1] - ref[1]), k]).sort((a, b) => a[0] - b[0]).slice(0, 3).map(x => x[1]);
    if (!cand.includes(this.kfs[0])) cand.push(this.kfs[0]);
    let best = null;
    for (const kf of cand) { const r = this._match(f, kf); if (r && (!best || r.inl > best.inl)) best = { ...r, kf }; }
    let res = { ok: false, kfs: this.kfs.length, inl: best ? best.inl : 0, added: false };
    if (best && best.inl >= 25) {
      const Hm = mul(best.kf.H, best.H), q = this._quad(Hm, f.w, f.h), a = Math.abs(area(q)) / this.refArea;
      if (convex(q) && a > 0.15 && a < 6) {
        res.ok = true; this.lastQuad = q; this.lost = 0; res.quad = q;
        const c = proj(Hm, f.w / 2, f.h / 2), dmin = Math.min(...this.kfs.map(k => Math.hypot(k.c[0] - c[0], k.c[1] - c[1])));
        if (dmin > 0.28 * Math.sqrt(this.refArea) && best.inl >= 40 && this.kfs.length < 40) {
          this._paint(f, Hm); this.kfs.push({ des: f.des, pts: f.pts, H: Hm, c, w: f.w, h: f.h }); res.added = true; res.kfs = this.kfs.length;
          f.rgba.delete(); return res;
        }
      }
    }
    if (!res.ok) this.lost++;
    f.rgba.delete(); f.des.delete(); return res;
  }
  preview(cnv) {
    const b = this.bbox; if (!b) return; const w = b[2] - b[0], h = b[3] - b[1], s = Math.min(cnv.width / w, cnv.height / h), x = cnv.getContext('2d');
    x.fillStyle = '#222'; x.fillRect(0, 0, cnv.width, cnv.height); const ox = (cnv.width - w * s) / 2, oy = (cnv.height - h * s) / 2;
    x.drawImage(this.canvas, b[0], b[1], w, h, ox, oy, w * s, h * s);
    if (this.lastQuad) { x.strokeStyle = this.lost ? '#ff6b6b' : '#e8b04b'; x.lineWidth = 2; x.beginPath(); this.lastQuad.forEach((p, i) => { const X = ox + (p[0] - b[0]) * s, Y = oy + (p[1] - b[1]) * s; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); x.stroke(); }
  }
  // final target image: crop to covered area, neutral gray where nothing was seen, max side 1600
  async finish(maxOut = 1600, maxTiles = 6) {
    const b = this.bbox, w = b[2] - b[0], h = b[3] - b[1], s = Math.min(1, maxOut / Math.max(w, h));
    const c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s); const x = c.getContext('2d');
    x.fillStyle = '#7f7f7f'; x.fillRect(0, 0, c.width, c.height); x.drawImage(this.canvas, b[0], b[1], w, h, 0, 0, c.width, c.height);
    const im = new Image(); im.src = c.toDataURL('image/jpeg', .9); await im.decode();
    // tiles = rectified keyframe footprints (each ≈ one camera view) → detectable when only part of the surface is in view
    const chosen = []; const minD = 0.45 * Math.sqrt(this.refArea);
    for (const k of this.kfs) { if (chosen.length >= maxTiles) break; if (chosen.every(o => Math.hypot(o.c[0] - k.c[0], o.c[1] - k.c[1]) > minD)) chosen.push(k); }
    const tiles = [];
    for (const k of chosen) {
      const q = this._quad(k.H, k.w, k.h);
      let x0 = Math.max(b[0], Math.min(...q.map(p => p[0]))), y0 = Math.max(b[1], Math.min(...q.map(p => p[1])));
      let x1 = Math.min(b[2], Math.max(...q.map(p => p[0]))), y1 = Math.min(b[3], Math.max(...q.map(p => p[1])));
      const rx = (x0 - b[0]) * s, ry = (y0 - b[1]) * s, rw = (x1 - x0) * s, rh = (y1 - y0) * s; if (rw < 40 || rh < 40) continue;
      const t = document.createElement('canvas'), ts = Math.min(1, 640 / Math.max(rw, rh)); t.width = Math.round(rw * ts); t.height = Math.round(rh * ts);
      t.getContext('2d').drawImage(c, rx, ry, rw, rh, 0, 0, t.width, t.height);
      const ti = new Image(); ti.src = t.toDataURL('image/jpeg', .9); await ti.decode();
      tiles.push({ image: ti, rect: [rx, ry, rw, rh] });
    }
    const n = this.kfs.length; this.dispose(); this.kfs = [];
    return { image: im, keyframes: n, tiles, size: [c.width, c.height] };
  }
  dispose() { try { this.kfs.forEach(k => k.des.delete()); this.orb.delete(); this.bf.delete(); } catch (e) { } }
}
