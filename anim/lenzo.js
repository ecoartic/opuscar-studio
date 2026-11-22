// lenzo.js: Lenzo, Behrang Lab's own character — a small film-camera robot painted in watercolour and ink.
// Original design for Behrang Lab; drawn with the ClaudeAnimationBase engine (core.js, MIT).
// One big lens is the eye (the iris dilates with the mood, the shutter blades are the eyelids), two film reels on top
// spin like ears, a tripod carries it. `u` is the body unit; (x, y) is the ground point under the tripod.
//
// Options: dx, dy (in u, negative = up), sq (squash), rot, flip, aL, aR (arm angles; 0 = out, + = up),
//          iris (0..1 size), lookX/lookY (-1..1), lid (0..1 shutter closed from the top), slant (-1..1 angry/sad lids),
//          mouth ('smile'|'grin'|'frown'|'O'|'flat'|'wobble'|'open'), blush 0..1, tint (name or hex), tintK,
//          spin (reel turns per second), heart (lens shows a heart), emote, emoteK, emoteAge.

const LZ_PAL = { body: '#5E8DB8', bodyDk: '#33557A', bodyLt: '#A9CBE6', metal: '#C9C2B4', glass: '#2C3550', reel: '#E8AA38' };
const LZ_TINT = { pale: '#EEE6D8', flush: '#E23E36', blue: '#4D63A8', rosy: '#EF8EA8', green: '#7FAE5A', gold: '#F0BE46' };
function lzCols(o) {
  const c = { col: o.col || LZ_PAL.body, dk: o.dk || LZ_PAL.bodyDk, lt: o.lt || LZ_PAL.bodyLt };
  const tc = o.tint && (LZ_TINT[o.tint] || o.tint), k = clamp(o.tintK ?? 1);
  if (!tc || k <= 0) return c;
  return { col: mixCol(c.col, tc, .5 * k), dk: mixCol(c.dk, mixCol(tc, PAL.ink, .35), .45 * k), lt: mixCol(c.lt, mixCol(tc, '#FFFFFF', .4), .4 * k) };
}
let LZ_N = 0;

function lenzo(x, y, u, o = {}) {
  const id = ++LZ_N, rs = p => boilSeed(`lenzo ${id} ${p}`);
  const sq = o.sq || 0, sw = clamp(u / 15, .45, 2.4), J = u * .06, { col, dk, lt } = lzCols(o);
  x += (o.dx || 0) * u;
  const dy = (o.dy || 0) * u;

  rs('shadow');
  const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .06);
  paint(ellPts(x, y + u * .15, u * 5 * f, u * .9 * f, 22), { fill: PAL.ink, fillOp: 85, bleed: .25, tex: .3, border: .1, ink: null });

  push(); translate(x, y + dy); if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (1 + sq * .6), 1 - sq);

  // tripod: three tapered legs from the body base to the ground
  rs('legs');
  [[-3.4, .9], [0, 1], [3.4, .9]].forEach(([lx, k], i) => {
    const top = [lx * .45 * u, -2.2 * u], bot = [lx * u, 0];
    paint(ribbon([top, [lerp(top[0], bot[0], .5) + jit(J), -1.1 * u], bot], .55 * u, .35 * u), { wash: mixCol(LZ_PAL.metal, PAL.ink, i === 1 ? .25 : .1), washOp: 255, ink: PAL.ink, sw: sw * .7 });
    paint(ellPts(bot[0], 0, .45 * u, .2 * u, 10, J * .3), { wash: PAL.ink, washOp: 230, ink: null });
  });

  // arms: thin bendy ribbons with round hands
  const arm = (side, a) => {
    rs('arm' + side);
    push(); translate(side * 4.4 * u, -4.4 * u); rotate(side < 0 ? a : -a);
    const P = [[0, 0], [side * 1.2 * u, -.15 * u], [side * 2.3 * u, .05 * u]];
    paint(ribbon(P, .5 * u, .38 * u), { wash: mixCol(LZ_PAL.metal, dk, .2), washOp: 255, ink: PAL.ink, sw: sw * .7 });
    paint(ellPts(side * 2.5 * u, .05 * u, .48 * u, .48 * u, 12, J * .3), { wash: dk, washOp: 255, ink: PAL.ink, sw: sw * .7 });
    pop();
  };
  arm(-1, o.aL ?? .1); arm(1, o.aR ?? .1);

  // film reels (ears) on top, spinning
  const spin = (o.spin ?? .5) * T * TAU;
  [-2.5, 2.5].forEach((rx, i) => {
    rs('reel' + i);
    const cx = rx * u, cy = -9.3 * u, r = 1.55 * u;
    paint(ellPts(cx, cy, r, r, 22, J * .4), { wash: LZ_PAL.reel, washOp: 255, fill: mixCol(LZ_PAL.reel, PAL.ink, .3), fillOp: 70, tex: .5, ink: PAL.ink, sw: sw * .8 });
    for (let k = 0; k < 3; k++) {
      const a = spin * (i ? -1 : 1) + k * TAU / 3;
      paint(ellPts(cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55, r * .25, r * .25, 10), { wash: mixCol(PAL.paper, LZ_PAL.reel, .2), washOp: 255, ink: PAL.ink, sw: sw * .45 });
    }
    paint(ellPts(cx, cy, r * .14, r * .14, 8), { wash: PAL.ink, washOp: 255, ink: null });
    inkLine([[cx + (i ? -1 : 1) * .2 * u, cy + r * .9], [cx * .6, -7.9 * u]], sw * .6, PAL.ink, 'inkfine', .3);
  });

  // body: a rounded camera box with a lighter top strip and a darker base band
  rs('body');
  const body = rrPts(-4.5 * u, -8 * u, 9 * u, 6 * u, 1.1 * u, J);
  paint(body, { wash: col, washOp: 255, ink: null });
  paint(ellPts(-1.8 * u, -7 * u, 3.2 * u, 1 * u, 16, J * 2, -.05), { fill: lt, fillOp: 120, bleed: .2, tex: .85, border: .8, ink: null });
  paint(rectPts(-4.2 * u, -3.3 * u, 8.4 * u, 1.1 * u, J), { fill: dk, fillOp: 120, bleed: .03, tex: .7, border: .5, ink: null });
  paint(rrPts(-.6 * u, -8.65 * u, 1.2 * u, .7 * u, .22 * u, J * .3), { wash: LZ_PAL.metal, washOp: 255, ink: PAL.ink, sw: sw * .6 }); // shutter button
  paint(body, { ink: PAL.ink, sw });

  // blush
  if (o.blush > .02) [-3.3, 3.3].forEach(bx => paint(ellPts(bx * u, -3.9 * u, .8 * u, .4 * u, 12), { fill: PAL.rose, fillOp: 140 * clamp(o.blush), bleed: .3, ink: null }));

  // lens eye
  rs('lens');
  const lx = 0, ly = -5.35 * u, R = 2.0 * u;
  paint(ellPts(lx, ly, R * 1.12, R * 1.12, 26, J * .3), { wash: mixCol(LZ_PAL.metal, PAL.ink, .15), washOp: 255, ink: PAL.ink, sw: sw * .9 });
  paint(ellPts(lx, ly, R, R, 26, J * .2), { wash: LZ_PAL.glass, washOp: 255, fill: '#40507E', fillOp: 120, tex: .6, ink: null });
  const lkx = (o.lookX || 0) * R * .35, lky = (o.lookY || 0) * R * .3;
  if (o.heart) paint(heartPtsLZ(lx + lkx, ly + lky, R * .55), { wash: PAL.rose, washOp: 255, ink: PAL.ink, sw: sw * .6 });
  else {
    const ir = R * lerp(.22, .62, clamp(o.iris ?? .45));
    paint(ellPts(lx + lkx, ly + lky, ir, ir, 20), { wash: mixCol(LZ_PAL.bodyLt, '#FFFFFF', .3), washOp: 255, ink: null });
    paint(ellPts(lx + lkx, ly + lky, ir * .55, ir * .55, 16), { wash: PAL.ink, washOp: 255, ink: null });
  }
  paint(ellPts(lx - R * .38, ly - R * .4, R * .2, R * .13, 10, 0, -.6), { wash: '#FFFFFF', washOp: 230, ink: null });
  // shutter lids: dark blades closing from the top, slanted by mood
  const lid = clamp(o.lid || 0), sl = o.slant || 0;
  if (lid > .02) {
    const yb = ly - R + 2 * R * lid;
    paint([[lx - R * 1.15, ly - R * 1.2], [lx + R * 1.15, ly - R * 1.2], [lx + R * 1.15, yb - sl * R * .35], [lx - R * 1.15, yb + sl * R * .35]],
      { wash: mixCol(dk, PAL.ink, .35), washOp: 255, ink: PAL.ink, sw: sw * .7 });
    paint(ellPts(lx, ly, R * 1.12, R * 1.12, 26), { ink: PAL.ink, sw: sw * .9 });
  }

  // mouth
  rs('mouth');
  const my = -2.55 * u, m = o.mouth || 'flat', w = 1.1 * u;
  if (m === 'smile') inkLine([[-w, my - .15 * u], [0, my + .25 * u], [w, my - .15 * u]], sw, PAL.ink, 'ink', .5);
  else if (m === 'grin') paint([[-w * 1.2, my - .2 * u], [w * 1.2, my - .2 * u], [w * .6, my + .45 * u], [-w * .6, my + .45 * u]], { wash: '#7A2C2C', washOp: 255, ink: PAL.ink, sw: sw * .8 });
  else if (m === 'frown') inkLine([[-w, my + .2 * u], [0, my - .2 * u], [w, my + .2 * u]], sw, PAL.ink, 'ink', .5);
  else if (m === 'O' || m === 'open') paint(ellPts(0, my, (m === 'O' ? .35 : .6) * u, (m === 'O' ? .45 : .35) * u, 12), { wash: '#7A2C2C', washOp: 255, ink: PAL.ink, sw: sw * .7 });
  else if (m === 'wobble') inkLine([[-w, my], [-w * .5, my - .12 * u], [0, my + .1 * u], [w * .5, my - .12 * u], [w, my]], sw * .8, PAL.ink, 'ink', .5);
  else inkLine([[-w * .7, my], [w * .7, my]], sw * .85, PAL.ink, 'ink', 0);
  pop();

  rs('emote');
  if (o.emote) lzEmote(o.emote, x + (o.flip ? -1 : 1) * 5.6 * u, y + dy - 10.5 * u * (1 - sq), u, o.emoteK ?? 1, o.emoteAge ?? T);
  rs('after');
}

function heartPtsLZ(cx, cy, r, n = 22) {
  const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; p.push([cx + r * .06 * 16 * Math.pow(Math.sin(a), 3), cy - r * .06 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))]); } return p;
}

// small painted emotes near the top corner
function lzEmote(kind, x, y, u, k, age) {
  if (k <= .02) return;
  const s = u * backOut(k), bob = Math.sin(age * TAU * .8) * u * .25;
  if (kind === 'hearts') [0, 1].forEach(i => paint(heartPtsLZ(x + i * 1.6 * s, y - i * 1.3 * s + bob, s * (.7 - i * .2)), { wash: PAL.rose, washOp: 255, ink: PAL.ink, sw: .8 }));
  else if (kind === 'spark') [0, 1, 2].forEach(i => paint(starPts(x + [0, 1.4, -.9][i] * s, y + [0, -1.2, -1.6][i] * s + bob, s * [.9, .55, .45][i], .3, 4, wob(age, .5, i) * .3), { wash: PAL.ochre, washOp: 255, ink: PAL.ink, sw: .7 }));
  else if (kind === 'sweat') paint([[x, y - s * 1.1 + bob], [x + s * .55, y + bob], [x, y + s * .45 + bob], [x - s * .55, y + bob]], { wash: PAL.sky, washOp: 255, ink: PAL.ink, sw: .8, curv: .6 });
  else if (kind === 'cloud') { const pts = []; for (let i = 0; i < 5; i++) pts.push(...ellPts(x + (i - 2) * .8 * s, y + bob + (i % 2 ? -.4 : 0) * s, s * .9, s * .7, 10)); paint(ellPts(x, y + bob, s * 2.4, s * 1.1, 24, s * .15), { wash: '#8C93A8', washOp: 230, ink: PAL.ink, sw: .8 }); }
  else if (kind === 'anger') [0, 1].forEach(i => inkLine([[x - s * .6 + i * s * .9, y - s * .6 + bob], [x + i * s * .9, y + bob], [x - s * .6 + i * s * .9, y + s * .6 + bob]], 1.3, PAL.flush || '#D33', 'ink', 0));
  else letter({ zzz: 'z z', q: '?', bang: '!', note: '♪', dots: '...' }[kind] || kind, x, y + bob, u * 2.2 * backOut(k), PAL.cream, { stroke: PAL.ink, alpha: clamp(k) });
}

// emotions: face + colour + beat-locked body motion, in the spirit of the engine's own feel()
const _lb = t => { const bp = bpOf(t), s1 = Math.sin(bp * Math.PI); return { bp, s1, ab: Math.abs(s1), hit: pulse(t), s2: Math.sin(bp * TAU), f: frac(bp) }; };
const LZ_EMO = {
  neutral:   { fa: 'آرام', iris: .45, mouth: 'flat', spin: .3, body: t => { const b = _lb(t); return { dy: -.25 * b.ab, sq: .03 * b.hit, aL: .1 + .05 * b.s1, aR: .1 - .05 * b.s1 }; } },
  happy:     { fa: 'شاد', iris: .55, mouth: 'smile', blush: .35, spin: .8, body: t => { const b = _lb(t); return { dy: -1.1 * b.ab, sq: .1 * b.hit, aL: .45 + .4 * b.s1, aR: .45 - .4 * b.s1 }; } },
  excited:   { fa: 'هیجان‌زده', iris: .8, mouth: 'open', emote: 'spark', spin: 2, body: t => { const b = _lb(t), h = Math.abs(b.s2); return { dy: -2.2 * h, sq: .15 * pulse2(t) - .05 * h, aL: 1 + .5 * Math.sin(b.bp * TAU * 2), aR: 1 - .5 * Math.sin(b.bp * TAU * 2) }; } },
  love:      { fa: 'عاشق', heart: true, mouth: 'smile', blush: .8, tint: 'rosy', tintK: .5, emote: 'hearts', spin: .6, body: t => { const b = _lb(t), s = Math.sin(b.bp * Math.PI / 2); return { rot: .07 * s, dx: .4 * s, dy: -.5 * b.ab, aL: .7, aR: .7 }; } },
  proud:     { fa: 'مغرور', iris: .4, lid: .35, mouth: 'smile', tint: 'gold', tintK: .3, emote: 'spark', spin: .5, body: t => { const b = _lb(t); return { sq: -.09 - .03 * b.ab, dy: -.3 * b.hit, aL: -.9, aR: -.9, rot: .02 * b.s1 }; } },
  sad:       { fa: 'غمگین', iris: .35, lid: .35, slant: -1, mouth: 'frown', tint: 'blue', tintK: .35, emote: 'cloud', spin: .1, body: t => { const b = _lb(t), s = Math.sin(b.bp * Math.PI / 4); return { sq: .08 + .02 * s, rot: .03 * s, aL: -.9, aR: -.9, lookY: .7 }; } },
  angry:     { fa: 'عصبانی', iris: .25, lid: .38, slant: 1, mouth: 'grin', tint: 'flush', tintK: .45, emote: 'anger', spin: 3, body: t => { const b = _lb(t); return { dx: .1 * Math.sin(t * TAU * 18), sq: .12 * b.hit, aL: -.3, aR: -.3 }; } },
  scared:    { fa: 'ترسیده', iris: .2, mouth: 'wobble', tint: 'pale', tintK: .6, emote: 'sweat', spin: 0, body: t => ({ dx: .1 * Math.sin(t * TAU * 22), sq: -.06, aL: 1 + .08 * Math.sin(t * TAU * 17), aR: 1 + .08 * Math.sin(t * TAU * 19) }) },
  surprised: { fa: 'متعجب', iris: .9, mouth: 'O', emote: 'bang', spin: 1.2, body: t => { const b = _lb(t); return { sq: -.12, dy: -.3 - .15 * b.ab, aL: 1.1 + .05 * b.s2, aR: 1.1 - .05 * b.s2 }; } },
  confused:  { fa: 'گیج', iris: .5, mouth: 'wobble', emote: 'q', spin: -.4, body: t => { const b = _lb(t); return { rot: .1 * Math.sin(b.bp * Math.PI / 4), aL: .1, aR: 1.4 + .15 * Math.sin(t * TAU * 3), lookX: .4 }; } },
  thinking:  { fa: 'در فکر', iris: .4, mouth: 'flat', emote: 'dots', spin: .2, body: t => { const b = _lb(t); return { lookX: .5, lookY: -.8, rot: .05, aR: .9, aL: -.3 + .25 * Math.sin(b.f * Math.PI), dy: -.1 * b.ab }; } },
  sleepy:    { fa: 'خواب‌آلود', iris: .35, lid: .7, mouth: 'O', emote: 'zzz', spin: .05, body: t => { const br = Math.sin(t * TAU * .3); return { sq: .05 + .05 * br, rot: .06 * Math.sin(t * .8), aL: -.6, aR: -.6 }; } },
  cool:      { fa: 'خونسرد', iris: .3, lid: .45, mouth: 'smile', emote: 'note', spin: 1, body: t => { const b = _lb(t); return { rot: .04 * b.hit, dy: -.35 * b.hit, sq: .06 * b.hit, aL: -.4, aR: .7 + .1 * b.s1 }; } },
  dance:     { fa: 'رقص', iris: .6, mouth: 'grin', emote: 'note', spin: 2.5, body: t => { const b = _lb(t), side = beatN(t) % 2 ? 1 : -1, k = lerp(-side, side, easeOut(clamp(b.f * 3))); return { dx: .8 * k, dy: -1.3 * b.ab, rot: .1 * k, sq: .08 * b.hit, aL: 1.2 * (k > 0), aR: 1.2 * (k < 0) }; } },
  wave:      { fa: 'دست‌تکان‌دادن', iris: .55, mouth: 'smile', blush: .3, spin: .8, body: t => { const b = _lb(t); return { dy: -.4 * b.ab, aL: .1, aR: 1.4 + .35 * Math.sin(t * TAU * 2.5), rot: -.03 }; } },
};
function feel(name, t, over = {}) {
  const E = LZ_EMO[name] || LZ_EMO.neutral;
  return { iris: E.iris, lid: E.lid || 0, slant: E.slant || 0, mouth: E.mouth, blush: E.blush || 0, tint: E.tint, tintK: E.tintK ?? 1,
           heart: !!E.heart, spin: E.spin, emote: E.emote, ...(E.body ? E.body(t) : {}), ...over };
}
