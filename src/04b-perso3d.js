/* ------------------------------------------------------------------
   Moteur 3D maison.

   Le personnage est construit en vraie 3D à partir des poses 2D existantes
   (le plan sagittal donne l'avant/arrière et la hauteur, on ajoute la
   profondeur gauche/droite), puis projeté en perspective avec un éclairage.
   Rendu en SVG : os = capsules ombrées (dégradé cylindrique), articulations
   et tête = sphères. On peut tourner la caméra (glisser au doigt).

   Aucune librairie externe : tout tient dans ce fichier, l'appli reste
   autonome et fonctionne hors-ligne.
------------------------------------------------------------------ */

// Demi-largeurs du corps en profondeur (écartement des deux côtés).
const Z_EPAULE = 15;
const Z_HANCHE = 11;

// Rayons des volumes (mêmes unités que les poses).
const R3 = { torse: 13, cou: 5.5, tete: 9.5, epaule: 7, brasH: 6, brasB: 5, main: 4.5,
             hanche: 7, cuisseH: 8, cuisseB: 6.5, genou: 6, pied: 5 };

// Caméra.
const CAM = { dist: 340, f: 300, sx: 100, sy: 196, el: 0.13 };

// Lumière (direction à l'écran : haut-gauche).
const LUX = { x: -0.5, y: -0.85 };

/** Construit la liste des volumes 3D d'un exercice à l'instant u. */
function volumes3D(exo, u) {
  const p = melange(exo.poses[0], exo.poses[1], u);
  const sq = squelette(p);
  const cx = sq.bassin.x;
  // Repère monde : X = avant/arrière (sagittal), Y = hauteur, Z = latéral.
  const M = (pt, z) => [pt.x - cx, SOL - pt.y, z];

  const cou = bout(sq.epaules, p.torse, OS.cou);
  const midHanche = M(sq.bassin, 0);
  const midEpaule = M(sq.epaules, 0);

  const Rep = M(sq.epaules, Z_EPAULE), Lep = M(sq.epaules, -Z_EPAULE);
  const Rha = M(sq.bassin, Z_HANCHE), Lha = M(sq.bassin, -Z_HANCHE);

  const os = (a, b, rA, rB, mat) => ({ k: 'os', a, b, rA, rB, mat });
  const bille = (c, r, mat) => ({ k: 'bille', c, r, mat });

  const C = 'corps', P = 'peau';
  const prim = [];

  mobilier3D(prim, exo, sq);

  // Tronc, cou, tête.
  prim.push(os(midHanche, midEpaule, R3.torse, R3.torse * 0.92, C));
  prim.push(os(midEpaule, M(cou, 0), R3.cou, R3.cou, P));
  prim.push(bille(M(sq.tete, 0), R3.tete, P));

  // Un côté : épaule, bras, hanche, jambe, pied.
  const cote = (ep, ha, bras, jambe, pied) => {
    prim.push(bille(ep, R3.epaule, C));
    prim.push(os(ep, M(bras[1], ep[2]), R3.brasH, R3.brasB, P));
    prim.push(os(M(bras[1], ep[2]), M(bras[2], ep[2]), R3.brasB, R3.brasB * 0.9, P));
    prim.push(bille(M(bras[1], ep[2]), R3.brasB + 0.3, P));   // coude
    prim.push(bille(M(bras[2], ep[2]), R3.main, P));          // main
    prim.push(bille(ha, R3.hanche, C));
    prim.push(os(ha, M(jambe[1], ha[2]), R3.cuisseH, R3.cuisseB, C));
    prim.push(os(M(jambe[1], ha[2]), M(jambe[2], ha[2]), R3.cuisseB, R3.cuisseB * 0.9, C));
    prim.push(bille(M(jambe[1], ha[2]), R3.genou, C));        // genou
    prim.push(os(M(jambe[2], ha[2]), M(pied, ha[2]), R3.pied, R3.pied * 0.8, P)); // pied
    prim.push(bille(M(jambe[2], ha[2]), R3.pied, P));         // cheville
  };
  cote(Lep, Lha, sq.brasL, sq.jambeL, sq.piedL);   // côté éloigné d'abord
  cote(Rep, Rha, sq.brasP, sq.jambeP, sq.piedP);

  // Charge tenue en 3D.
  ajouterCharge3D(prim, exo, sq, cx, M);

  return prim;
}

function ajouterCharge3D(prim, exo, sq, cx, M) {
  const os = (a, b, r, mat) => prim.push({ k: 'os', a, b, rA: r, rB: r, mat });
  const bille = (c, r, mat) => prim.push({ k: 'bille', c, r, mat });
  const A = 'acier';
  const mainR = M(sq.brasP[2], Z_EPAULE), mainL = M(sq.brasL[2], -Z_EPAULE);
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0];

  const barre = (centre, demi, rBarre) => {
    os([centre[0], centre[1], -demi], [centre[0], centre[1], demi], rBarre, A);
    for (const s of [-1, 1]) {
      os([centre[0], centre[1], s * (demi - 3)], [centre[0], centre[1], s * (demi - 9)], 8.5, A);
    }
  };

  switch (exo.charge) {
    case 'barre':
    case 'barre-fixe':
      barre(mid(mainR, mainL), 34, 2.6);
      break;
    case 'barre-courte':
      barre(mid(mainR, mainL), 22, 2.6);
      break;
    case 'halteres':
      for (const m of [mainL, mainR]) {
        os([m[0], m[1], m[2] - 8], [m[0], m[1], m[2] + 8], 2.4, A);
        for (const s of [-1, 1]) bille([m[0], m[1], m[2] + s * 8], 5, A);
      }
      break;
    case 'haltere-un':
      os([mainR[0], mainR[1], mainR[2] - 8], [mainR[0], mainR[1], mainR[2] + 8], 2.4, A);
      for (const s of [-1, 1]) bille([mainR[0], mainR[1], mainR[2] + s * 8], 5, A);
      break;
    case 'poignee':
    case 'poignee-double':
      // Barre de tirage courte tenue à deux mains.
      barre(mid(mainR, mainL), 16, 2.2);
      break;
    // 'corps', 'pile', 'levier', 'corde' : rien à tenir en main.
  }
}

/** Banc ou siège 3D sous le personnage, pour les exercices qui en ont un. */
function mobilier3D(prim, exo, sq) {
  const TYPE = { banc: 1, 'banc-decline': 1, 'banc-incline': 1, 'banc-assis': 2,
                 'machine-assise': 2, 'pec-deck': 2, 'banc-pupitre': 2, 'presse': 2 };
  const t = TYPE[exo.decor];
  if (!t) return;
  const topY = SOL - sq.bassin.y - 3;
  const allonge = t === 1;
  const x0 = allonge ? -42 : -17, x1 = allonge ? 24 : 17, hz = 15, ep = 7, bY = topY - ep;
  const quad = (pts, col) => prim.push({ k: 'quad', pts, col });
  const T = [[x0, topY, -hz], [x1, topY, -hz], [x1, topY, hz], [x0, topY, hz]];
  const B = T.map((c) => [c[0], bY, c[2]]);
  quad(T, '#5b636f');                                   // dessus
  quad([T[1], T[2], B[2], B[1]], '#474e59');            // face avant
  quad([T[2], T[3], B[3], B[2]], '#3a404a');            // côté proche
  // Pieds du banc.
  for (const cx of [x0 + 6, x1 - 6]) {
    quad([[cx - 3, bY, hz - 2], [cx + 3, bY, hz - 2], [cx + 3, 0, hz - 2], [cx - 3, 0, hz - 2]], '#333944');
  }
  if (t === 2) {                                        // dossier
    const bx = x0 - 1;
    quad([[bx, topY, -hz], [bx, topY + 34, -hz], [bx, topY + 34, hz], [bx, topY, hz]], '#474e59');
  }
}

/** Projette un point 3D en coordonnées écran + profondeur + échelle. */
function projeter3D(P, az) {
  const cosA = Math.cos(az), sinA = Math.sin(az);
  const x1 = P[0] * cosA + P[2] * sinA;
  const z1 = -P[0] * sinA + P[2] * cosA;
  const cosE = Math.cos(CAM.el), sinE = Math.sin(CAM.el);
  const y1 = P[1] * cosE - z1 * sinE;
  const z2 = P[1] * sinE + z1 * cosE;
  const prof = CAM.dist - z2;
  const s = CAM.f / prof;
  return { x: CAM.sx + x1 * s, y: CAM.sy - y1 * s, s, prof };
}

// Palette des matériaux : [clair, base, sombre].
const MAT = {
  corps: ['#c3cad6', '#7f8a99', '#454c58'],
  peau: ['#cdd3dd', '#8a94a2', '#4c525d'],
  acier: ['#ffe08a', '#f0b429', '#a9760f'],
};

let gradId = 0;

/** Chemin SVG d'une capsule (stade) entre deux points écran, rayons rA/rB. */
function cheminCapsule(a, ra, b, rb) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 0.001;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const f = (n) => Math.round(n * 100) / 100;
  const A1 = [a.x + px * ra, a.y + py * ra], A2 = [a.x - px * ra, a.y - py * ra];
  const B1 = [b.x + px * rb, b.y + py * rb], B2 = [b.x - px * rb, b.y - py * rb];
  return `M${f(A1[0])} ${f(A1[1])} L${f(B1[0])} ${f(B1[1])} ` +
         `A${f(rb)} ${f(rb)} 0 0 1 ${f(B2[0])} ${f(B2[1])} ` +
         `L${f(A2[0])} ${f(A2[1])} A${f(ra)} ${f(ra)} 0 0 1 ${f(A1[0])} ${f(A1[1])} Z`;
}

/** Rend un exercice en 3D → chaîne SVG interne (defs + formes triées par profondeur). */
function rendre3D(exo, u, az) {
  const prims = volumes3D(exo, u);

  // Projection + profondeur pour le tri du peintre.
  const rendus = prims.map((pr) => {
    if (pr.k === 'quad') {
      const pts = pr.pts.map((P) => projeter3D(P, az));
      const prof = pts.reduce((s, q) => s + q.prof, 0) / pts.length;
      return { prof, pr, pts };
    }
    if (pr.k === 'os') {
      const a = projeter3D(pr.a, az), b = projeter3D(pr.b, az);
      return { prof: (a.prof + b.prof) / 2, pr, a, b, ra: pr.rA * a.s, rb: pr.rB * b.s };
    }
    const c = projeter3D(pr.c, az);
    return { prof: c.prof, pr, c, r: pr.r * c.s };
  });
  rendus.sort((x, y) => y.prof - x.prof); // le plus loin d'abord

  // Ombre au sol.
  const solP = projeter3D([0, 0, 0], az);
  let defs = '';
  let corps = `<ellipse cx="${solP.x.toFixed(1)}" cy="${solP.y.toFixed(1)}" rx="${(26 * solP.s).toFixed(1)}" ry="${(6 * solP.s).toFixed(1)}" fill="rgba(0,0,0,.22)"/>`;

  for (const R of rendus) {
    if (R.pr.k === 'quad') {
      const d = R.pts.map((q) => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' ');
      corps += `<polygon points="${d}" fill="${R.pr.col}"/>`;
      continue;
    }
    const [clair, base, sombre] = MAT[R.pr.mat];
    if (R.k === undefined && R.pr.k === 'bille' || R.pr.k === 'bille') {
      // Sphère : dégradé radial avec reflet en haut à gauche.
      const id = 'b' + (gradId++);
      defs += `<radialGradient id="${id}" cx="0.35" cy="0.32" r="0.75">` +
        `<stop offset="0" stop-color="${clair}"/><stop offset="0.55" stop-color="${base}"/>` +
        `<stop offset="1" stop-color="${sombre}"/></radialGradient>`;
      corps += `<circle cx="${R.c.x.toFixed(1)}" cy="${R.c.y.toFixed(1)}" r="${R.r.toFixed(1)}" fill="url(#${id})"/>`;
    } else {
      // Capsule : dégradé linéaire en travers, côté lumière clair.
      const dx = R.b.x - R.a.x, dy = R.b.y - R.a.y;
      const len = Math.hypot(dx, dy) || 0.001;
      const px = -dy / len, py = dx / len;
      const sgn = (px * LUX.x + py * LUX.y) >= 0 ? 1 : -1;
      const rM = (R.ra + R.rb) / 2;
      const mx = (R.a.x + R.b.x) / 2, my = (R.a.y + R.b.y) / 2;
      const id = 'c' + (gradId++);
      defs += `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" ` +
        `x1="${(mx + px * rM * sgn).toFixed(1)}" y1="${(my + py * rM * sgn).toFixed(1)}" ` +
        `x2="${(mx - px * rM * sgn).toFixed(1)}" y2="${(my - py * rM * sgn).toFixed(1)}">` +
        `<stop offset="0" stop-color="${clair}"/><stop offset="0.5" stop-color="${base}"/>` +
        `<stop offset="1" stop-color="${sombre}"/></linearGradient>`;
      corps += `<path d="${cheminCapsule(R.a, R.ra, R.b, R.rb)}" fill="url(#${id})"/>`;
    }
  }
  return `<defs>${defs}</defs>${corps}`;
}

/* ---------------- contrôleur (navigateur) ---------------- */

const scenes3d = new Set();
let boucle3dLancee = false;
const doux3d = typeof window !== 'undefined' && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function boucle3D(ms) {
  for (const c of scenes3d) {
    if (!c.svg.isConnected) { scenes3d.delete(c); c.detache(); continue; }
    if (c.anime) {
      const duree = (c.exo.duree ?? 2.6) * 1000;
      const p = (ms / duree) % 1;
      const tri = p < 0.5 ? p * 2 : (1 - p) * 2;
      c.u = tri * tri * (3 - 2 * tri);
    }
    // Balancement doux tant que l'utilisateur n'a pas pris la main.
    if (!c.mano) c.az = -0.5 + Math.sin(ms / 2600) * 0.55;
    c.svg.innerHTML = rendre3D(c.exo, c.u, c.az);
  }
  requestAnimationFrame(boucle3D);
}

/** Monte un personnage 3D dans `container`. `opts.anime` joue le mouvement. */
function monter3D(container, exo, opts = {}) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 220');
  svg.setAttribute('class', 'fig3d');
  container.innerHTML = '';
  container.appendChild(svg);

  const ctrl = { exo, az: -0.5, u: opts.anime ? 0 : 0.7, mano: false, anime: !!opts.anime && !doux3d, svg };

  let lastX = 0, drag = false;
  const pos = (e) => (e.touches ? e.touches[0].clientX : e.clientX);
  const onDown = (e) => { drag = true; ctrl.mano = true; lastX = pos(e); };
  const onMove = (e) => {
    if (!drag) return;
    const x = pos(e);
    ctrl.az += (x - lastX) * 0.012;
    lastX = x;
    if (e.cancelable) e.preventDefault();
    if (!ctrl.anime) svg.innerHTML = rendre3D(ctrl.exo, ctrl.u, ctrl.az);
  };
  const onUp = () => { drag = false; };
  svg.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  svg.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', onUp);
  ctrl.detache = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
  };

  svg.innerHTML = rendre3D(exo, ctrl.u, ctrl.az);
  scenes3d.add(ctrl);
  if (!boucle3dLancee && !doux3d) { boucle3dLancee = true; requestAnimationFrame(boucle3D); }
  return ctrl;
}

/** Arrête et détache toutes les scènes 3D (au changement d'écran). */
function arreter3D() {
  for (const c of scenes3d) c.detache();
  scenes3d.clear();
}

if (typeof module !== 'undefined') module.exports = { rendre3D, volumes3D, projeter3D };
