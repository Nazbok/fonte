/* ------------------------------------------------------------------
   Le bonhomme.

   Plutôt que trente dessins figés, un petit moteur de cinématique :
   chaque exercice donne deux poses (départ / fin du mouvement) et
   l'app interpole entre les deux. Les angles sont en degrés, mesurés
   depuis l'axe horizontal vers la droite, croissant vers le haut :
   0 = à droite, 90 = vers le haut, -90 = vers le bas, 180 = à gauche.

   Le cadre fait 200 × 170, le sol est à y = 150.
------------------------------------------------------------------ */

const SOL = 150;
const OS = { torse: 36, cou: 8, tete: 9, bras: 22, avant: 21, cuisse: 27, mollet: 26, pied: 11 };

const rad = (d) => (d * Math.PI) / 180;
/** Point à `len` du point `o`, dans la direction `ang` (degrés). */
const bout = (o, ang, len) => ({ x: o.x + len * Math.cos(rad(ang)), y: o.y - len * Math.sin(rad(ang)) });

/** Assemble un squelette complet à partir d'une pose. */
function squelette(p) {
  const bassin = { x: p.x, y: p.y };
  const epaules = bout(bassin, p.torse, OS.torse);
  const tete = bout(epaules, p.torse, OS.cou + OS.tete);

  const membre = (base, a1, a2, l1, l2) => {
    const mid = bout(base, a1, l1);
    return [base, mid, bout(mid, a2, l2)];
  };

  const brasP = membre(epaules, p.bras, p.avant, OS.bras, OS.avant);
  const brasL = membre(epaules, p.bras2 ?? p.bras, p.avant2 ?? p.avant, OS.bras, OS.avant);
  const jambeP = membre(bassin, p.cuisse, p.mollet, OS.cuisse, OS.mollet);
  const jambeL = membre(bassin, p.cuisse2 ?? p.cuisse, p.mollet2 ?? p.mollet, OS.cuisse, OS.mollet);
  const piedP = bout(jambeP[2], p.pied ?? 0, OS.pied);
  const piedL = bout(jambeL[2], p.pied2 ?? p.pied ?? 0, OS.pied);

  return { bassin, epaules, tete, brasP, brasL, jambeP, jambeL, piedP, piedL, pose: p };
}

/** Différence d'angle la plus courte, pour ne pas faire tourner un bras dans le mauvais sens. */
function ecartAngle(a, b) {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

const CLES_POSE = ['x','y','torse','bras','avant','bras2','avant2','cuisse','mollet','cuisse2','mollet2','pied','pied2'];

/** Pose intermédiaire entre A et B (u de 0 à 1). */
function melange(a, b, u) {
  const p = {};
  for (const k of CLES_POSE) {
    const va = a[k], vb = b[k];
    if (va === undefined && vb === undefined) continue;
    const x = va ?? vb, y = vb ?? va;
    p[k] = k === 'x' || k === 'y' ? x + (y - x) * u : x + ecartAngle(x, y) * u;
  }
  return p;
}

/* ---------------- accessoires et décor ---------------- */

const ANCRAGES = {
  'poulie-haute': { x: 176, y: 26 },
  'poulie-basse': { x: 176, y: 140 },
  'barre-fixe': { x: 100, y: 22 },
};

/** Décor fixe de l'exercice, en primitives SVG déclaratives. */
function decorDe(exo) {
  const d = [];
  d.push({ t: 'ligne', x1: 4, y1: SOL, x2: 196, y2: SOL, cls: 'fig-sol', w: 3 });
  switch (exo.decor) {
    case 'banc':
      d.push({ t: 'rect', x: 44, y: 110, w: 104, h: 7, cls: 'fig-decor', plein: true });
      d.push({ t: 'ligne', x1: 56, y1: 117, x2: 52, y2: SOL, cls: 'fig-decor', w: 3 });
      d.push({ t: 'ligne', x1: 138, y1: 117, x2: 142, y2: SOL, cls: 'fig-decor', w: 3 });
      break;
    case 'banc-incline':
      d.push({ t: 'ligne', x1: 46, y1: 128, x2: 146, y2: 96, cls: 'fig-decor', w: 7 });
      d.push({ t: 'ligne', x1: 56, y1: 126, x2: 52, y2: SOL, cls: 'fig-decor', w: 3 });
      d.push({ t: 'ligne', x1: 138, y1: 102, x2: 142, y2: SOL, cls: 'fig-decor', w: 3 });
      break;
    case 'banc-assis':
      d.push({ t: 'rect', x: 66, y: 108, w: 66, h: 7, cls: 'fig-decor', plein: true });
      d.push({ t: 'ligne', x1: 128, y1: 108, x2: 128, y2: 62, cls: 'fig-decor', w: 4 });
      d.push({ t: 'ligne', x1: 78, y1: 115, x2: 78, y2: SOL, cls: 'fig-decor', w: 3 });
      d.push({ t: 'ligne', x1: 126, y1: 115, x2: 126, y2: SOL, cls: 'fig-decor', w: 3 });
      break;
    case 'barre-fixe':
      d.push({ t: 'ligne', x1: 52, y1: 22, x2: 148, y2: 22, cls: 'fig-decor', w: 5 });
      d.push({ t: 'ligne', x1: 56, y1: 22, x2: 56, y2: SOL, cls: 'fig-decor', w: 3 });
      d.push({ t: 'ligne', x1: 144, y1: 22, x2: 144, y2: SOL, cls: 'fig-decor', w: 3 });
      break;
    case 'poulie-haute':
      d.push({ t: 'ligne', x1: 176, y1: 20, x2: 176, y2: SOL, cls: 'fig-decor', w: 4 });
      d.push({ t: 'cercle', cx: 176, cy: 26, r: 6, cls: 'fig-decor', w: 2.5 });
      break;
    case 'poulie-basse':
      d.push({ t: 'ligne', x1: 176, y1: 60, x2: 176, y2: SOL, cls: 'fig-decor', w: 4 });
      d.push({ t: 'cercle', cx: 176, cy: 140, r: 6, cls: 'fig-decor', w: 2.5 });
      break;
    case 'cadre':
      d.push({ t: 'ligne', x1: 62, y1: 100, x2: 62, y2: SOL, cls: 'fig-decor', w: 4 });
      d.push({ t: 'ligne', x1: 138, y1: 100, x2: 138, y2: SOL, cls: 'fig-decor', w: 4 });
      d.push({ t: 'ligne', x1: 54, y1: 100, x2: 90, y2: 100, cls: 'fig-decor', w: 5 });
      d.push({ t: 'ligne', x1: 110, y1: 100, x2: 146, y2: 100, cls: 'fig-decor', w: 5 });
      break;
    case 'poulies':
      for (const x of [24, 176]) {
        d.push({ t: 'ligne', x1: x, y1: 20, x2: x, y2: SOL, cls: 'fig-decor', w: 4 });
        d.push({ t: 'cercle', cx: x, cy: 26, r: 6, cls: 'fig-decor', w: 2.5 });
      }
      break;
    case 'presse':
      // Dossier incliné, siège, et la plateforme que les pieds poussent.
      d.push({ t: 'ligne', x1: 14, y1: 130, x2: 58, y2: 114, cls: 'fig-decor', w: 6 });
      d.push({ t: 'ligne', x1: 58, y1: 118, x2: 94, y2: 120, cls: 'fig-decor', w: 6 });
      d.push({ t: 'ligne', x1: 30, y1: 130, x2: 30, y2: SOL, cls: 'fig-decor', w: 3 });
      d.push({ t: 'ligne', x1: 88, y1: 120, x2: 88, y2: SOL, cls: 'fig-decor', w: 3 });
      d.push({ t: 'ligne', x1: 114, y1: 78, x2: 128, y2: 114, cls: 'fig-decor', w: 6 });
      d.push({ t: 'ligne', x1: 174, y1: 30, x2: 174, y2: SOL, cls: 'fig-decor', w: 4 });
      d.push({ t: 'ligne', x1: 158, y1: 30, x2: 190, y2: 30, cls: 'fig-decor', w: 3 });
      break;
    case 'machine':
      d.push({ t: 'ligne', x1: 174, y1: 30, x2: 174, y2: SOL, cls: 'fig-decor', w: 4 });
      d.push({ t: 'ligne', x1: 158, y1: 30, x2: 190, y2: 30, cls: 'fig-decor', w: 3 });
      break;
    case 'tapis':
      d.push({ t: 'rect', x: 40, y: 140, w: 120, h: 10, cls: 'fig-decor', plein: false });
      break;
  }
  return d;
}

/** La charge tenue, calculée à partir du squelette courant. */
function chargeDe(exo, sq, u) {
  const g = [];
  const mainP = sq.brasP[2], mainL = sq.brasL[2];
  const barre = (m, demi = 23) => {
    g.push({ t: 'ligne', x1: m.x - demi, y1: m.y, x2: m.x + demi, y2: m.y, cls: 'fig-charge', w: 3.4 });
    for (const s of [-1, 1]) {
      g.push({ t: 'ellipse', cx: m.x + s * (demi - 3), cy: m.y, rx: 3.2, ry: 9, cls: 'fig-charge-plein' });
    }
  };
  switch (exo.charge) {
    case 'barre': barre(mainP); break;
    case 'barre-courte': barre(mainP, 15); break;
    case 'halteres':
      for (const m of [mainL, mainP]) {
        g.push({ t: 'ligne', x1: m.x - 8, y1: m.y, x2: m.x + 8, y2: m.y, cls: 'fig-charge', w: 3 });
        for (const s of [-1, 1]) {
          g.push({ t: 'rect', x: m.x + s * 8 - 2.6, y: m.y - 5, w: 5.2, h: 10, cls: 'fig-charge-plein', plein: true });
        }
      }
      break;
    case 'haltere-un':
      g.push({ t: 'ligne', x1: mainP.x - 8, y1: mainP.y, x2: mainP.x + 8, y2: mainP.y, cls: 'fig-charge', w: 3 });
      for (const s of [-1, 1]) {
        g.push({ t: 'rect', x: mainP.x + s * 8 - 2.6, y: mainP.y - 5, w: 5.2, h: 10, cls: 'fig-charge-plein', plein: true });
      }
      break;
    case 'poignee': {
      const a = ANCRAGES[exo.decor] ?? ANCRAGES['poulie-haute'];
      g.push({ t: 'ligne', x1: a.x, y1: a.y, x2: mainP.x, y2: mainP.y, cls: 'fig-charge', w: 1.6 });
      g.push({ t: 'ligne', x1: mainP.x - 10, y1: mainP.y, x2: mainP.x + 10, y2: mainP.y, cls: 'fig-charge', w: 3.4 });
      break;
    }
    case 'poignee-double':
      for (const [m, a] of [[mainP, { x: 176, y: 26 }], [mainL, { x: 24, y: 26 }]]) {
        g.push({ t: 'ligne', x1: a.x, y1: a.y, x2: m.x, y2: m.y, cls: 'fig-charge', w: 1.6 });
        g.push({ t: 'ligne', x1: m.x - 7, y1: m.y, x2: m.x + 7, y2: m.y, cls: 'fig-charge', w: 3.4 });
      }
      break;
    case 'corde': {
      // La corde balaie le corps : haute derrière, basse sous les pieds.
      const ry = 22 + 46 * u;
      g.push({ t: 'ellipse-vide', cx: mainP.x - 4, cy: 104, rx: 42, ry, cls: 'fig-charge' });
      break;
    }
    case 'barre-fixe':
      g.push({ t: 'ligne', x1: 60, y1: 22, x2: 140, y2: 22, cls: 'fig-charge', w: 4 });
      break;
    case 'pile': {
      // Machine guidée : la pile de poids monte quand le mouvement se fait.
      const haut = 118 - 46 * u;
      g.push({ t: 'rect', x: 164, y: haut, w: 20, h: 30, cls: 'fig-charge-plein', plein: true });
      g.push({ t: 'ligne', x1: 174, y1: 30, x2: 174, y2: haut, cls: 'fig-charge', w: 1.6 });
      break;
    }
  }
  return g;
}

/* ---------------- rendu ---------------- */

const NS = 'http://www.w3.org/2000/svg';

function creer(spec) {
  let el;
  if (spec.t === 'ligne') {
    el = document.createElementNS(NS, 'line');
  } else if (spec.t === 'rect') {
    el = document.createElementNS(NS, 'rect');
  } else if (spec.t === 'cercle') {
    el = document.createElementNS(NS, 'circle');
  } else if (spec.t === 'ellipse' || spec.t === 'ellipse-vide') {
    el = document.createElementNS(NS, 'ellipse');
  } else {
    el = document.createElementNS(NS, 'polyline');
  }
  majSpec(el, spec);
  return el;
}

function majSpec(el, s) {
  const set = (k, v) => el.setAttribute(k, typeof v === 'number' ? Math.round(v * 10) / 10 : v);
  if (s.cls) set('class', s.cls);
  if (s.t === 'ligne') {
    set('x1', s.x1); set('y1', s.y1); set('x2', s.x2); set('y2', s.y2);
    set('stroke-width', s.w ?? 3); set('stroke-linecap', 'round');
  } else if (s.t === 'rect') {
    set('x', s.x); set('y', s.y); set('width', s.w); set('height', s.h); set('rx', 2);
    if (!s.plein) { set('fill', 'none'); set('stroke-width', 2.5); }
  } else if (s.t === 'cercle') {
    set('cx', s.cx); set('cy', s.cy); set('r', s.r);
    if (s.w) { set('fill', 'none'); set('stroke-width', s.w); }
  } else if (s.t === 'ellipse' || s.t === 'ellipse-vide') {
    set('cx', s.cx); set('cy', s.cy); set('rx', s.rx); set('ry', s.ry);
    if (s.t === 'ellipse-vide') { set('fill', 'none'); set('stroke-width', 1.8); }
  } else {
    set('points', s.points.map((p) => `${Math.round(p.x * 10) / 10},${Math.round(p.y * 10) / 10}`).join(' '));
    set('stroke-width', s.w ?? 7); set('stroke-linecap', 'round'); set('stroke-linejoin', 'round');
    set('fill', 'none');
  }
}

/** Toutes les primitives d'une frame : décor, membres lointains, corps, charge. */
function frame(exo, u) {
  const p = melange(exo.poses[0], exo.poses[1], u);
  const sq = squelette(p);
  const corps = [
    { t: 'poly', points: [...sq.jambeL, sq.piedL], cls: 'fig-membre-loin', w: 5.5 },
    { t: 'poly', points: sq.brasL, cls: 'fig-membre-loin', w: 5.5 },
    { t: 'poly', points: [...sq.jambeP, sq.piedP], cls: 'fig-corps', w: 7 },
    { t: 'poly', points: [sq.bassin, sq.epaules], cls: 'fig-corps', w: 9 },
    { t: 'cercle', cx: sq.tete.x, cy: sq.tete.y, r: OS.tete, cls: 'fig-tete' },
    { t: 'poly', points: sq.brasP, cls: 'fig-corps', w: 7 },
  ];
  return [...decorDe(exo), ...corps, ...chargeDe(exo, sq, u)];
}

/** Une figurine animée attachée à un <svg>. Les nœuds sont créés une fois puis mis à jour. */
class Figurine {
  constructor(svg, exo) {
    this.svg = svg;
    this.exo = exo;
    this.svg.setAttribute('viewBox', '0 0 200 170');
    this.svg.innerHTML = '';
    this.specs = frame(exo, 0);
    this.noeuds = this.specs.map((s) => {
      const el = creer(s);
      this.svg.appendChild(el);
      return el;
    });
    this.phase = Math.random() * 0.6;
  }
  dessine(u) {
    const specs = frame(this.exo, u);
    // Le nombre de primitives est constant pour un exercice donné.
    for (let i = 0; i < specs.length && i < this.noeuds.length; i++) majSpec(this.noeuds[i], specs[i]);
  }
}

/* Une seule boucle d'animation pour toutes les figurines visibles. */
const figurines = new Set();
let boucleLancee = false;
const doux = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animer(ms) {
  for (const f of figurines) {
    const duree = (f.exo.duree ?? 2.6) * 1000;
    const p = ((ms / duree) + f.phase) % 1;
    // Aller-retour, avec un temps mort aux deux extrémités du mouvement.
    const tri = p < 0.5 ? p * 2 : (1 - p) * 2;
    const u = tri * tri * (3 - 2 * tri);
    f.dessine(u);
  }
  requestAnimationFrame(animer);
}

const guetteur = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        const f = e.target.__figurine;
        if (!f) continue;
        if (e.isIntersecting) figurines.add(f);
        else figurines.delete(f);
      }
    }, { rootMargin: '80px' })
  : null;

function ajouteFigurine(svg, exo) {
  const f = new Figurine(svg, exo);
  if (doux) { f.dessine(0.75); return f; }
  svg.__figurine = f;
  if (guetteur) guetteur.observe(svg);
  else figurines.add(f);
  if (!boucleLancee) { boucleLancee = true; requestAnimationFrame(animer); }
  return f;
}

if (typeof module !== 'undefined') module.exports = { frame, squelette, melange, SOL, OS };
