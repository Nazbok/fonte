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
const CAM = { dist: 340, f: 300, sx: 100, syc: 116, pivotY: 70 };
const EL_DEFAUT = 0.16, EL_DESSUS = 1.32;

// Lumière (direction à l'écran : haut-gauche).
const LUX = { x: -0.5, y: -0.85 };

/** Construit la liste des volumes 3D d'un exercice à l'instant u. */
function volumes3D(exo, u, muscles) {
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

  equipement3D(prim, exo, sq, u);

  // Choix des couleurs selon les muscles travaillés.
  const mm = (parts, defaut) => {
    if (!muscles) return defaut;
    if (parts.some((g) => exo.groupes.p.includes(g))) return 'prim';
    if (parts.some((g) => exo.groupes.s.includes(g))) return 'sec';
    return defaut;
  };
  const mTorse = mm(['pecs', 'dorsaux', 'abdos', 'obliques', 'lombaires', 'trapezes'], C);
  const mHanche = mm(['fessiers', 'abdos'], C);
  const mEpaule = mm(['epaules', 'epaules-arr', 'trapezes'], C);
  const mBras = mm(['biceps', 'triceps'], P);
  const mAvant = mm(['avant-bras'], P);
  const mCuisse = mm(['quadriceps', 'ischios', 'adducteurs', 'fessiers'], C);
  const mMollet = mm(['mollets'], C);

  // Tronc, cou, tête.
  prim.push(bille(midHanche, 10, mHanche));
  prim.push(os(midHanche, midEpaule, 11, 13.5, mTorse)); // torse fuselé
  prim.push(os(midEpaule, M(cou, 0), R3.cou, R3.cou, P));
  prim.push(bille(M(sq.tete, 0), R3.tete, P));

  // Un côté : épaule, bras, hanche, jambe, pied.
  const cote = (ep, ha, bras, jambe, pied) => {
    prim.push(bille(ep, R3.epaule, mEpaule));
    prim.push(os(ep, M(bras[1], ep[2]), R3.brasH, R3.brasB, mBras));
    prim.push(os(M(bras[1], ep[2]), M(bras[2], ep[2]), R3.brasB, R3.brasB * 0.9, mAvant));
    prim.push(bille(M(bras[1], ep[2]), R3.brasB + 0.3, mBras));   // coude
    prim.push(bille(M(bras[2], ep[2]), R3.main, P));             // main
    prim.push(bille(ha, R3.hanche, mHanche));
    prim.push(os(ha, M(jambe[1], ha[2]), R3.cuisseH, R3.cuisseB, mCuisse));
    prim.push(os(M(jambe[1], ha[2]), M(jambe[2], ha[2]), R3.cuisseB, R3.cuisseB * 0.9, mMollet));
    prim.push(bille(M(jambe[1], ha[2]), R3.genou, mCuisse));      // genou
    prim.push(os(M(jambe[2], ha[2]), M(pied, ha[2]), R3.pied, R3.pied * 0.8, P)); // pied
    prim.push(bille(M(jambe[2], ha[2]), R3.pied, P));            // cheville
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
    // 'barre-fixe', 'poignee', 'pile', 'levier', 'corde', 'corps' :
    // gérés par l'équipement 3D (barre fixe, câbles, machines).
  }
}

/* ---------------- équipement 3D ---------------- */

function capS(prim, a, b, r, mat) { prim.push({ k: 'os', a, b, rA: r, rB: r, mat }); }

/** Une boîte 3D : trois faces visibles (dessus, avant, côté proche). */
function boite3D(prim, x0, x1, y0, y1, z0, z1, top, front, side) {
  const q = (pts, col) => prim.push({ k: 'quad', pts, col });
  q([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], top);
  q([[x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [x1, y0, z0]], front);
  q([[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]], side);
}

/** Un plateau (banc, siège), dessus éventuellement incliné (y différents aux deux bouts). */
function plateau(prim, x0, x1, yT0, yT1, hz, ep, top, front, side) {
  const q = (pts, col) => prim.push({ k: 'quad', pts, col });
  q([[x0, yT0, -hz], [x1, yT1, -hz], [x1, yT1, hz], [x0, yT0, hz]], top);
  q([[x1, yT1, -hz], [x1, yT1, hz], [x1, yT1 - ep, hz], [x1, yT1 - ep, -hz]], front);
  q([[x0, yT0, hz], [x1, yT1, hz], [x1, yT1 - ep, hz], [x0, yT0 - ep, hz]], side);
}

/** Colonne de poids : rail + bloc qui monte avec la contraction (u). */
function colonnePoids(prim, x, z, u, yBas, yHaut) {
  capS(prim, [x, yBas, z], [x, yHaut, z], 1.6, 'metal');
  const course = Math.max(8, yHaut - yBas - 26);
  const yb = yBas + 6 + Math.max(0, Math.min(1, u)) * course;
  boite3D(prim, x - 8, x + 8, yb, yb + 16, z - 7, z + 7, '#8a929e', '#5c6572', '#3a3f48');
}

// Teintes récurrentes.
const PAD = ['#646c78', '#4b525d', '#3a404a'];     // coussin clair
const PADS = ['#54606c', '#464e59', '#3a404a'];    // coussin foncé
const FER = ['#616a77', '#4c5058', '#3a3f48'];     // acier de bâti
const PIED = ['#3a3f48', '#2f343d', '#282c33'];    // pied sombre

function bancPlat(prim, sq, type) {
  const topY = SOL - sq.bassin.y - 3;
  let yT0 = topY, yT1 = topY;
  if (type === 'banc-incline') { yT0 = topY - 3; yT1 = topY + 16; }
  if (type === 'banc-decline') { yT0 = topY + 2; yT1 = topY - 14; }
  plateau(prim, -42, 24, yT0, yT1, 15, 8, PAD[0], PAD[1], PAD[2]);
  const bas = Math.min(yT0, yT1) - 8;
  for (const lx of [-30, 12]) boite3D(prim, lx - 3, lx + 3, 0, bas, 11, 15, PIED[0], PIED[1], PIED[2]);
}

function rackBarre(prim, sq) {
  const topY = SOL - sq.bassin.y - 3;
  for (const z of [-18, 18]) boite3D(prim, -40, -34, 0, topY + 48, z - 2, z + 2, FER[0], FER[1], FER[2]);
}

function siege(prim, sq, dossier) {
  const topY = SOL - sq.bassin.y - 3;
  plateau(prim, -17, 17, topY, topY, 15, 8, PAD[0], PAD[1], PAD[2]);
  boite3D(prim, -8, 8, 0, topY - 8, -8, 8, PIED[0], PIED[1], PIED[2]);
  if (dossier) boite3D(prim, -20, -15, topY, topY + 40, -14, 14, PADS[0], PADS[1], PADS[2]);
}

function machineAssise(prim, sq, mainR, mainL, u) {
  siege(prim, sq, true);
  const Xc = 150 - sq.bassin.x;
  boite3D(prim, Xc - 4, Xc + 4, 0, 92, -4, 4, FER[0], FER[1], FER[2]);
  colonnePoids(prim, Xc, -11, u, 6, 84);
  const piv = [Xc - 6, 78, 0];
  for (const m of [mainL, mainR]) {
    capS(prim, piv, m, 1.6, 'cadre');
    capS(prim, [m[0], m[1], m[2] - 7], [m[0], m[1], m[2] + 7], 2.6, 'cadre');
  }
}

function pecDeck(prim, sq, mainR, mainL) {
  siege(prim, sq, true);
  for (const m of [mainL, mainR]) {
    boite3D(prim, m[0] - 3, m[0] + 3, m[1] - 11, m[1] + 11, m[2] - 3, m[2] + 3, PADS[0], PADS[1], PADS[2]);
  }
}

function pupitre(prim, sq) {
  const topY = SOL - sq.bassin.y - 3;
  plateau(prim, -16, 10, topY, topY, 14, 8, PAD[0], PAD[1], PAD[2]);
  plateau(prim, 8, 26, topY + 2, topY + 24, 14, 6, PADS[0], PADS[1], PADS[2]);
  boite3D(prim, -8, 8, 0, topY - 8, -8, 8, PIED[0], PIED[1], PIED[2]);
}

function presseJambe(prim, sq, u) {
  const cx = sq.bassin.x;
  const topY = SOL - sq.bassin.y - 3;
  plateau(prim, -46, -6, topY - 10, topY + 6, 15, 8, PAD[0], PAD[1], PAD[2]);
  const fx = (sq.jambeP[2].x + sq.jambeL[2].x) / 2 - cx + 8;
  const fy = SOL - (sq.jambeP[2].y + sq.jambeL[2].y) / 2;
  boite3D(prim, fx - 2, fx + 7, fy - 19, fy + 19, -16, 16, PADS[0], PADS[1], PADS[2]);
  colonnePoids(prim, fx + 20, -19, u, 6, 72);
}

function dips(prim, sq) {
  const cx = sq.bassin.x;
  const hy = SOL - (sq.brasP[2].y + sq.brasL[2].y) / 2;
  const hx = (sq.brasP[2].x + sq.brasL[2].x) / 2 - cx;
  for (const z of [-14, 14]) {
    capS(prim, [hx - 18, hy, z], [hx + 24, hy, z], 3, 'cadre');
    boite3D(prim, hx + 20, hx + 24, 0, hy, z - 2, z + 2, FER[1], FER[1], FER[2]);
  }
}

function barreFixe(prim, sq) {
  const cx = sq.bassin.x;
  const bx = (sq.brasP[2].x + sq.brasL[2].x) / 2 - cx;
  const hy = SOL - (sq.brasP[2].y + sq.brasL[2].y) / 2;
  capS(prim, [bx, hy, -24], [bx, hy, 24], 2.6, 'cadre');
  capS(prim, [bx, hy + 9, -26], [bx, hy + 9, 26], 2, 'cadre');
  for (const z of [-25, 25]) boite3D(prim, bx - 3, bx + 3, 0, hy + 9, z - 2, z + 2, FER[0], FER[1], FER[2]);
}

function stationCable(prim, sq, mainR, mainL, type, u) {
  const cx = sq.bassin.x;
  const yP = type === 'basse' ? SOL - 138 : SOL - 26;
  const tours = type === 'double' ? [[24 - cx, -6], [176 - cx, 6]] : [[176 - cx, 6]];
  for (const [Xt, Zt] of tours) {
    boite3D(prim, Xt - 4, Xt + 4, 0, yP + 6, Zt - 4, Zt + 4, FER[0], FER[1], FER[2]);
    capS(prim, [Xt, yP, Zt - 4], [Xt, yP, Zt + 4], 5, 'cadre');            // poulie
    colonnePoids(prim, Xt, Zt - 11, u, 6, Math.max(40, yP - 8));
  }
  if (type === 'double') {
    const paires = [[mainL, [24 - cx, yP, 0]], [mainR, [176 - cx, yP, 0]]];
    for (const [m, pl] of paires) {
      capS(prim, pl, m, 1, 'metal');                                       // câble
      capS(prim, [m[0], m[1], m[2] - 6], [m[0], m[1], m[2] + 6], 2.4, 'cadre'); // poignée
    }
  } else {
    const mid = [(mainR[0] + mainL[0]) / 2, (mainR[1] + mainL[1]) / 2, 0];
    capS(prim, [176 - cx, yP, 0], mid, 1, 'metal');                        // câble
    capS(prim, [mid[0], mid[1], -15], [mid[0], mid[1], 15], 2.4, 'cadre'); // barre de tirage
  }
}

/** Machine ischios / quadriceps : rouleau aux chevilles + colonne de poids. */
function machineJambe(prim, exo, sq, u) {
  const cx = sq.bassin.x;
  const W = (pt, z) => [pt.x - cx, SOL - pt.y, z];
  const mi = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const cheville = W(mi(sq.jambeP[2], sq.jambeL[2]), 0);
  const genou = W(mi(sq.jambeP[1], sq.jambeL[1]), 0);
  const assis = exo.pattern === 'iso-quad';
  const topY = SOL - sq.bassin.y - 3;
  const zc = Z_HANCHE + 6;
  if (assis) {
    plateau(prim, -16, 18, topY, topY, 15, 8, PAD[0], PAD[1], PAD[2]);
    boite3D(prim, -20, -15, topY, topY + 40, -15, 15, PADS[0], PADS[1], PADS[2]);
    boite3D(prim, -8, 8, 0, topY - 8, -8, 8, PIED[0], PIED[1], PIED[2]);
  } else {
    plateau(prim, -40, 22, topY, topY, 15, 8, PAD[0], PAD[1], PAD[2]);
    for (const lx of [-32, 14]) boite3D(prim, lx - 3, lx + 3, 0, topY - 8, 11, 15, PIED[0], PIED[1], PIED[2]);
  }
  capS(prim, [cheville[0], cheville[1], -zc], [cheville[0], cheville[1], zc], 6.5, 'coussin');
  capS(prim, [genou[0], genou[1], zc], [cheville[0], cheville[1], zc], 2, 'metal');
  const xS = assis ? 6 : -8;
  colonnePoids(prim, xS, -(Z_HANCHE + 24), u, 6, 78);
}

/** Aiguille : place le bon équipement selon le décor de l'exercice. */
function equipement3D(prim, exo, sq, u) {
  const cx = sq.bassin.x;
  const W = (pt, z) => [pt.x - cx, SOL - pt.y, z];
  const mainR = W(sq.brasP[2], Z_EPAULE), mainL = W(sq.brasL[2], -Z_EPAULE);
  switch (exo.decor) {
    case 'banc':
    case 'banc-incline':
    case 'banc-decline':
      bancPlat(prim, sq, exo.decor);
      if (/barre/.test(exo.charge || '')) rackBarre(prim, sq);
      break;
    case 'banc-assis': siege(prim, sq, true); break;
    case 'machine-assise': machineAssise(prim, sq, mainR, mainL, u); break;
    case 'pec-deck': pecDeck(prim, sq, mainR, mainL); break;
    case 'banc-pupitre': pupitre(prim, sq); break;
    case 'presse': presseJambe(prim, sq, u); break;
    case 'cadre': dips(prim, sq); break;
    case 'barre-fixe': barreFixe(prim, sq); break;
    case 'poulie-haute': stationCable(prim, sq, mainR, mainL, 'haute', u); break;
    case 'poulie-basse': stationCable(prim, sq, mainR, mainL, 'basse', u); break;
    case 'poulies': stationCable(prim, sq, mainR, mainL, 'double', u); break;
    case 'machine': machineJambe(prim, exo, sq, u); break;
    // 'sol', 'tapis' : rien.
  }
  if (exo.rack) squatRack3D(prim, sq);
}

/** Support de squat : deux montants larges derrière, crochets et poutre haute. */
function squatRack3D(prim, sq) {
  const H = 126;                                   // hauteur des montants
  const shY = 86;                                  // hauteur des crochets
  const T = '#a7afba', F = '#7c8490', S = '#585f6a';
  for (const z of [-30, 30]) {
    boite3D(prim, -17, -8, 0, H, z - 3.5, z + 3.5, T, F, S);            // montant arrière
    boite3D(prim, -17, 3, shY + 4, shY + 12, z - 3.5, z + 3.5, T, F, S); // crochet à hauteur d'épaule
    boite3D(prim, -21, -4, 0, 6, z - 10, z + 10, '#50565f', '#3f444c', '#33373f'); // pied
  }
  // Poutre haute reliant les deux montants (le long de z).
  const y = H;
  prim.push({ k: 'quad', pts: [[-17, y, -30], [-8, y, -30], [-8, y, 30], [-17, y, 30]], col: T });
  prim.push({ k: 'quad', pts: [[-8, y, -30], [-8, y, 30], [-8, y - 6, 30], [-8, y - 6, -30]], col: F });
}

/** Projette un point 3D en coordonnées écran + profondeur + échelle. */
function projeter3D(P, az, el) {
  const cosA = Math.cos(az), sinA = Math.sin(az);
  const cosE = Math.cos(el), sinE = Math.sin(el);
  const X = P[0], Y = P[1] - CAM.pivotY, Z = P[2];
  const x1 = X * cosA + Z * sinA;
  const z1 = -X * sinA + Z * cosA;
  const y1 = Y * cosE - z1 * sinE;
  const z2 = Y * sinE + z1 * cosE;
  const prof = CAM.dist - z2;
  const s = CAM.f / prof;
  return { x: CAM.sx + x1 * s, y: CAM.syc - y1 * s, s, prof };
}

// Palette des matériaux : [clair, base, sombre].
const MAT = {
  corps: ['#eef1f6', '#c3cad6', '#7f8a99', '#3b424d'],
  peau: ['#f2f4f8', '#cdd3dd', '#8a94a2', '#424852'],
  acier: ['#fff3ca', '#ffe08a', '#f0b429', '#9a6c0d'],
  coussin: ['#7c838f', '#5a616c', '#3c424c', '#22262d'],
  metal: ['#ccd2db', '#9aa2ae', '#5c6572', '#333941'],
  cadre: ['#ccd2db', '#98a0ac', '#646c78', '#363b44'],
  prim: ['#ffedb0', '#f7cf58', '#dea81e', '#8a6410'],
  sec: ['#d0ccae', '#aaa483', '#7c7855', '#3d3b29'],
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
function rendre3D(exo, u, az, el = EL_DEFAUT, muscles = true) {
  const prims = volumes3D(exo, u, muscles);

  // Projection + profondeur pour le tri du peintre.
  const rendus = prims.map((pr) => {
    if (pr.k === 'quad') {
      const pts = pr.pts.map((P) => projeter3D(P, az, el));
      const prof = pts.reduce((s, q) => s + q.prof, 0) / pts.length;
      return { prof, pr, pts };
    }
    if (pr.k === 'os') {
      const a = projeter3D(pr.a, az, el), b = projeter3D(pr.b, az, el);
      return { prof: (a.prof + b.prof) / 2, pr, a, b, ra: pr.rA * a.s, rb: pr.rB * b.s };
    }
    const c = projeter3D(pr.c, az, el);
    return { prof: c.prof, pr, c, r: pr.r * c.s };
  });
  rendus.sort((x, y) => y.prof - x.prof); // le plus loin d'abord

  // Ombre au sol.
  const solP = projeter3D([0, 0, 0], az, el);
  let defs = '<radialGradient id="shG"><stop offset="0" stop-color="rgba(0,0,0,.34)"/>' +
    '<stop offset="0.7" stop-color="rgba(0,0,0,.12)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>';
  // Sol : disque au niveau du plancher (surtout visible en vue de dessus).
  let pts = '';
  const N = 26, Rf = 62;
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2;
    const q = projeter3D([Math.cos(a) * Rf, 0, Math.sin(a) * Rf], az, el);
    pts += q.x.toFixed(1) + ',' + q.y.toFixed(1) + ' ';
  }
  let corps = `<polygon points="${pts}" fill="rgba(150,160,175,.05)" stroke="rgba(162,172,188,.10)" stroke-width="1"/>` +
    `<ellipse cx="${solP.x.toFixed(1)}" cy="${solP.y.toFixed(1)}" rx="${(30 * solP.s).toFixed(1)}" ry="${(8 * solP.s).toFixed(1)}" fill="url(#shG)"/>`;

  for (const R of rendus) {
    if (R.pr.k === 'quad') {
      const d = R.pts.map((q) => q.x.toFixed(1) + ',' + q.y.toFixed(1)).join(' ');
      corps += `<polygon points="${d}" fill="${R.pr.col}"/>`;
      continue;
    }
    const [spec, clair, base, sombre] = MAT[R.pr.mat];
    if (R.k === undefined && R.pr.k === 'bille' || R.pr.k === 'bille') {
      // Sphère : dégradé radial avec reflet en haut à gauche.
      const id = 'b' + (gradId++);
      defs += `<radialGradient id="${id}" cx="0.34" cy="0.30" r="0.86">` +
        `<stop offset="0" stop-color="${spec}"/><stop offset="0.30" stop-color="${clair}"/>` +
        `<stop offset="0.70" stop-color="${base}"/><stop offset="1" stop-color="${sombre}"/></radialGradient>`;
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
        `<stop offset="0" stop-color="${spec}"/><stop offset="0.2" stop-color="${clair}"/>` +
        `<stop offset="0.58" stop-color="${base}"/><stop offset="1" stop-color="${sombre}"/></linearGradient>`;
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

const PRESETS = [
  { n: '3⁄4', az: -0.5, el: 0.16 },
  { n: 'Face', az: -1.5, el: 0.12 },
  { n: 'Profil', az: 0.0, el: 0.12 },
  { n: 'Dessus', az: -0.5, el: EL_DESSUS },
];

function sm3(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

/** Courbe de tempo : montée franche, contraction tenue, descente lente, étirement. */
function tempoU(p) {
  if (p < 0.32) return { u: sm3(p / 0.32), ph: 'Montée' };
  if (p < 0.42) return { u: 1, ph: 'Contraction' };
  if (p < 0.90) return { u: sm3(1 - (p - 0.42) / 0.48), ph: 'Descente' };
  return { u: 0, ph: 'Étirement' };
}

function boucle3D(ms) {
  for (const c of scenes3d) {
    if (!c.svg.isConnected) { scenes3d.delete(c); c.detache(); continue; }
    if (c.playing) {
      const p = (ms / ((c.exo.duree ?? 2.6) * 1300)) % 1;   // tempo réaliste (descente lente)
      const t = tempoU(p);
      c.u = t.u;
      if (c.slider && !c.dragSlider) c.slider.value = Math.round(c.u * 100);
      if (c.phaseEl) c.phaseEl.textContent = t.ph;
    }
    if (c.mano) c.az += (c.azCible - c.az) * 0.16;
    else c.az = -0.5 + Math.sin(ms / 2600) * 0.55;
    c.el += (c.elCible - c.el) * 0.16;
    c.svg.innerHTML = rendre3D(c.exo, c.u, c.az, c.el, c.muscles);
  }
  requestAnimationFrame(boucle3D);
}

/** Monte un personnage 3D dans `container`. `opts.anime` joue le mouvement. */
function monter3D(container, exo, opts = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 220');
  svg.setAttribute('class', 'fig3d');
  container.innerHTML = '';
  container.appendChild(svg);

  const auto = !doux3d;
  const ctrl = {
    exo, az: -0.5, azCible: -0.5, el: EL_DEFAUT, elCible: EL_DEFAUT,
    u: opts.anime ? 0 : 0.7, mano: false, muscles: opts.muscles !== false,
    playing: !!opts.anime && auto, vue: 0, svg,
  };
  const redessine = () => { svg.innerHTML = rendre3D(ctrl.exo, ctrl.u, ctrl.az, ctrl.el, ctrl.muscles); };
  const maj = () => { if (!auto) redessine(); };

  // --- rotation (horizontal) et inclinaison (vertical) au doigt ---
  let lastX = 0, lastY = 0, drag = false;
  const gx = (e) => (e.touches ? e.touches[0].clientX : e.clientX);
  const gy = (e) => (e.touches ? e.touches[0].clientY : e.clientY);
  const onDown = (e) => { drag = true; ctrl.mano = true; lastX = gx(e); lastY = gy(e); };
  const onMove = (e) => {
    if (!drag) return;
    const x = gx(e), y = gy(e);
    ctrl.az += (x - lastX) * 0.012; ctrl.azCible = ctrl.az;
    ctrl.el = Math.max(-0.15, Math.min(1.45, ctrl.el + (y - lastY) * 0.009)); ctrl.elCible = ctrl.el;
    lastX = x; lastY = y;
    if (e.cancelable) e.preventDefault();
    maj();
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

  const faireBtn = (txt, actif) => {
    const b = document.createElement('button');
    b.className = 'btn3d' + (actif ? ' actif' : '');
    b.textContent = txt;
    return b;
  };

  // --- boutons en surimpression : muscles + vue ---
  const barreH = document.createElement('div');
  barreH.className = 'barre3d';
  const btnMus = faireBtn('Muscles', ctrl.muscles);
  btnMus.addEventListener('click', () => {
    ctrl.muscles = !ctrl.muscles;
    btnMus.classList.toggle('actif', ctrl.muscles);
    maj();
  });
  const btnVue = faireBtn('Vue : ' + PRESETS[0].n, false);
  btnVue.addEventListener('click', () => {
    ctrl.vue = (ctrl.vue + 1) % PRESETS.length;
    const P = PRESETS[ctrl.vue];
    ctrl.mano = true; ctrl.azCible = P.az; ctrl.elCible = P.el;
    btnVue.textContent = 'Vue : ' + P.n;
    if (!auto) { ctrl.az = P.az; ctrl.el = P.el; redessine(); }
  });
  barreH.append(btnMus, btnVue);
  container.appendChild(barreH);

  // --- barre de lecture : play/pause + scrub + phase ---
  const barreB = document.createElement('div');
  barreB.className = 'lecture3d';
  const btnPlay = document.createElement('button');
  btnPlay.className = 'play3d';
  const majPlay = () => { btnPlay.textContent = ctrl.playing ? '❙❙' : '▶'; };
  btnPlay.addEventListener('click', () => { ctrl.playing = !ctrl.playing && auto; majPlay(); });
  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.value = '0';
  const scrub = () => {
    ctrl.playing = false; majPlay();
    ctrl.dragSlider = true;
    ctrl.u = Number(slider.value) / 100;
    if (ctrl.phaseEl) ctrl.phaseEl.textContent = 'Manuel';
    maj();
  };
  slider.addEventListener('input', scrub);
  slider.addEventListener('change', () => { ctrl.dragSlider = false; });
  const phaseEl = document.createElement('span');
  phaseEl.className = 'phase3d';
  if (auto && opts.anime) barreB.appendChild(btnPlay);
  barreB.append(slider, phaseEl);
  container.appendChild(barreB);
  ctrl.slider = slider; ctrl.phaseEl = phaseEl;
  majPlay();

  redessine();
  scenes3d.add(ctrl);
  if (!boucle3dLancee && auto) { boucle3dLancee = true; requestAnimationFrame(boucle3D); }
  return ctrl;
}

/** Arrête et détache toutes les scènes 3D (au changement d'écran). */
function arreter3D() {
  for (const c of scenes3d) c.detache();
  scenes3d.clear();
}

if (typeof module !== 'undefined') module.exports = { rendre3D, volumes3D, projeter3D };
