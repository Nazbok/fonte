/* ------------------------------------------------------------------
   L'application : état, génération du programme, séance, progression.
------------------------------------------------------------------ */

const CLE_SAUVE = 'fonte.v1';

const copie = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));

const ETAT_VIDE = {
  profil: null,
  programme: null,
  journal: [],      // séances terminées
  charges: {},      // dernière charge retenue par exercice
  poids: [],        // suivi du poids de corps
  reglages: { son: true, vibrer: true, theme: 'auto' },
  faitLe: {},       // clé de séance -> date du dernier passage
  mesures: [],      // mensurations : { date, poids?, bras?, taille?, cuisse?, poitrine? }
};

let S = charger();

function charger() {
  try {
    const brut = localStorage.getItem(CLE_SAUVE);
    if (!brut) return copie(ETAT_VIDE);
    return { ...copie(ETAT_VIDE), ...JSON.parse(brut) };
  } catch (e) {
    return copie(ETAT_VIDE);
  }
}

function sauver() {
  try { localStorage.setItem(CLE_SAUVE, JSON.stringify(S)); } catch (e) { /* stockage plein ou refusé */ }
}

/* ---------------- petits utilitaires ---------------- */

const $ = (sel, racine = document) => racine.querySelector(sel);
const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];
const auj = () => new Date().toISOString().slice(0, 10);
const jourDe = (iso) => new Date(iso + 'T12:00:00');

function echapper(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function joursEcoules(iso) {
  return Math.round((Date.now() - jourDe(iso).getTime()) / 86400000);
}

function dateCourte(iso) {
  const d = jourDe(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function toast(texte) {
  $$('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = texte;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

function vibrer(motif) {
  if (S.reglages.vibrer && navigator.vibrate) navigator.vibrate(motif);
}

let audioCtx = null;
function bip(freq = 880, duree = 0.14, volume = 0.2) {
  if (!S.reglages.son) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq;
    o.type = 'sine';
    g.gain.setValueAtTime(volume, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duree);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + duree);
  } catch (e) { /* pas de son disponible */ }
}

/* ---------------- construction du programme ---------------- */

const RANG_MAT = { maison: 0, halteres: 1, salle: 2 };

/** Candidats pour un patron de mouvement, les mieux équipés en tête. */
function candidatsPour(pattern, dispo) {
  const tous = dispo.filter((e) => e.pattern === pattern)
    .sort((a, b) => RANG_MAT[b.mat] - RANG_MAT[a.mat]);
  if (!tous.length) return { liste: [], k: 0 };
  // On ne fait tourner qu'entre les exercices du meilleur niveau de matériel :
  // inutile de proposer un squat au poids du corps à qui a une barre.
  const k = tous.filter((e) => RANG_MAT[e.mat] === RANG_MAT[tous[0].mat]).length;
  return { liste: tous, k };
}

function exosDisponibles(materiel) {
  const ok = MATERIELS[materiel].ok;
  return EXOS.filter((e) => ok.includes(e.mat));
}

/** Séries, répétitions et repos pour un exercice, selon l'objectif. */
function prescrire(exo, obj, niv) {
  const series = Math.min(5, Math.max(2, Math.round((exo.compose ? obj.series[1] : obj.series[0]) * niv.volume)));
  let reps = [...obj.reps];
  if (!exo.compose && reps[1] <= 6) reps = [8, 12];
  if (exo.temps) reps = [Math.round(obj.reps[0] * 2.5), Math.round(obj.reps[1] * 2.5)]; // en secondes
  if (exo.corps && !exo.temps) reps = [reps[0] + 2, reps[1] + 4];
  return { id: exo.id, series, reps, repos: exo.compose ? obj.reposCompose : obj.repos };
}

function genererProgramme(profil) {
  const obj = OBJECTIFS[profil.objectif];
  const niv = NIVEAUX[profil.niveau];
  const dispo = exosDisponibles(profil.materiel);
  const cles = decoupage(profil.jours, profil.niveau);

  return cles.map((cle, iSeance) => {
    const modele = SEANCES[cle];
    // Plus le repos est long, moins on peut caser d'exercices dans une séance.
    const nbExos = Math.min(niv.exos, obj.exosMax);
    const pris = [];
    for (const brique of modele.briques) {
      if (pris.length >= nbExos) break;
      const { liste, k } = candidatsPour(brique, dispo);
      const libres = liste.filter((e) => !pris.some((p) => p.id === e.id));
      if (!libres.length) continue;
      // Décalage selon la séance : deux jours « poussée » n'auront pas les mêmes exercices.
      const tete = libres.slice(0, Math.max(1, Math.min(k, libres.length)));
      pris.push(tete[(iSeance + pris.length) % tete.length]);
    }
    // Avec peu de matériel, certaines briques ne trouvent rien : on complète.
    if (pris.length < nbExos) {
      const patronsPris = new Set(pris.map((e) => e.pattern));
      const reste = dispo.filter((e) => !pris.some((p) => p.id === e.id));
      for (const e of [...reste.filter((e) => !patronsPris.has(e.pattern)), ...reste]) {
        if (pris.length >= nbExos) break;
        if (!pris.some((p) => p.id === e.id)) pris.push(e);
      }
    }
    return { cle, nom: modele.nom, exos: pris.map((e) => prescrire(e, obj, niv)) };
  });
}

/** Prochaine séance à faire : celle qui n'a pas été faite depuis le plus longtemps. */
function prochaineSeance() {
  if (!S.programme || !S.programme.length) return 0;
  let meilleur = 0, plusVieux = Infinity;
  S.programme.forEach((s, i) => {
    const d = S.faitLe[s.cle + '#' + i];
    const t = d ? jourDe(d).getTime() : 0;
    if (t < plusVieux) { plusVieux = t; meilleur = i; }
  });
  return meilleur;
}

/* ---------------- historique et progression ---------------- */

function dernieresSeriesDe(exoId) {
  for (let i = S.journal.length - 1; i >= 0; i--) {
    const e = S.journal[i].exos.find((x) => x.id === exoId);
    if (e && e.series.some((s) => s.reps)) return { series: e.series, date: S.journal[i].date };
  }
  return null;
}

/** Le double progressif : haut de la fourchette atteint partout → on monte la charge. */
function conseilCharge(exoId, prescription) {
  const exo = PAR_ID[exoId];
  const d = dernieresSeriesDe(exoId);
  if (!d) return { texte: 'Première fois : choisis une charge que tu maîtrises sur toutes les séries.', monter: false };
  const faites = d.series.filter((s) => s.reps > 0);
  const toutesAuMax = faites.length >= prescription.series && faites.every((s) => s.reps >= prescription.reps[1]);
  const kg = Math.max(...faites.map((s) => s.kg || 0));
  if (exo.temps || exo.charge === 'corps') {
    return toutesAuMax
      ? { texte: 'Objectif atteint partout : ajoute 2 répétitions ou ralentis la descente.', monter: true }
      : { texte: 'Vise le haut de la fourchette sur toutes les séries.', monter: false };
  }
  if (toutesAuMax) {
    const pas = exo.pas || 2.5;
    return { texte: 'Tu as tenu ' + prescription.reps[1] + ' partout : passe à ' + (kg + pas) + ' kg.', monter: true, kg: kg + pas };
  }
  return { texte: 'Dernière fois : ' + faites.map((s) => (s.kg ? s.kg + ' kg × ' : '') + s.reps).join(' · '), monter: false, kg };
}

function volumeSeance(s) {
  let v = 0;
  for (const e of s.exos) for (const x of e.series) v += (x.kg || 0) * (x.reps || 0);
  return v;
}

function recordDe(exoId) {
  let max = 0, rm = 0;
  for (const s of S.journal) {
    const e = s.exos.find((x) => x.id === exoId);
    if (!e) continue;
    for (const x of e.series) {
      if (!x.reps) continue;
      if ((x.kg || 0) > max) max = x.kg;
      // Formule d'Epley pour estimer le maxi à une répétition.
      const est = (x.kg || 0) * (1 + x.reps / 30);
      if (est > rm) rm = est;
    }
  }
  return { max, rm: Math.round(rm) };
}

function serieDeSeances() {
  // Nombre de semaines consécutives avec au moins une séance.
  if (!S.journal.length) return 0;
  const semaines = new Set(S.journal.map((s) => {
    const d = jourDe(s.date);
    const jan = new Date(d.getFullYear(), 0, 1);
    return d.getFullYear() + '-' + Math.floor((d - jan) / 604800000);
  }));
  let n = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const jan = new Date(d.getFullYear(), 0, 1);
    const cle = d.getFullYear() + '-' + Math.floor((d - jan) / 604800000);
    if (semaines.has(cle)) n++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 7);
  }
  return n;
}

/* ---------------- navigation ---------------- */

let ecranCourant = 'accueil';

const TITRES = {
  accueil: ['Fonte', 'carnet de salle'],
  programme: ['Programme', 'ta semaine'],
  exos: ['Exercices', EXOS.length + ' mouvements'],
  progres: ['Progrès', 'ce que tu as soulevé'],
  reglages: ['Réglages', 'profil et données'],
  seance: ['Séance', 'en cours'],
  debut: ['Fonte', 'premier réglage'],
};

function purgerFigurines() {
  for (const f of [...figurines]) {
    if (f.svg.isConnected) continue;
    figurines.delete(f);
    if (typeof guetteur !== 'undefined' && guetteur) guetteur.unobserve(f.svg);
  }
}

function va(nom) {
  ecranCourant = nom;
  arreter3D();
  purgerFigurines();
  $$('.ecran').forEach((e) => e.classList.remove('actif'));
  const el = $('#ec-' + nom);
  if (el) el.classList.add('actif');
  const [t, sous] = TITRES[nom] || TITRES.accueil;
  $('#titre-ecran').firstChild.textContent = t;
  $('#sous-titre').textContent = sous;
  $$('#nav button').forEach((b) => b.classList.toggle('actif', b.dataset.va === nom));
  $('#nav').style.display = nom === 'seance' || nom === 'debut' ? 'none' : '';
  $('#app').style.paddingBottom = nom === 'seance' || nom === 'debut' ? '24px' : '';
  window.scrollTo(0, 0);
  const rendus = { accueil: rendreAccueil, programme: rendreProgramme, exos: rendreExos, progres: rendreProgres, reglages: rendreReglages, debut: rendreDebut, seance: rendreSeance };
  if (rendus[nom]) rendus[nom]();
}

/* ---------------- écran : premier réglage ---------------- */

let brouillon = { objectif: 'masse', niveau: 'debutant', jours: 3, materiel: 'salle', poids: 75, taille: 178, age: 28, sexe: 'h' };
let etapeDebut = 0;

function rendreDebut() {
  const ec = $('#ec-debut');
  const etapes = [
    () => `
      <div class="section-titre">Étape 1 sur 4 — ton objectif</div>
      <p class="consigne" style="margin:0 0 14px">Il détermine tes séries, tes répétitions et ton temps de repos. Tu pourras en changer quand tu veux.</p>
      <div class="choix">
        ${Object.entries(OBJECTIFS).map(([k, o]) => `
          <button data-champ="objectif" data-val="${k}" class="${brouillon.objectif === k ? 'pris' : ''}">
            <span class="disque" style="--c:${o.couleur}"></span>
            <span><span class="titre">${o.nom}</span><span class="desc">${o.desc}</span></span>
          </button>`).join('')}
      </div>`,
    () => `
      <div class="section-titre">Étape 2 sur 4 — ton niveau</div>
      <p class="consigne" style="margin:0 0 14px">Il ajuste le nombre d'exercices et le volume de chaque séance.</p>
      <div class="choix">
        ${Object.entries(NIVEAUX).map(([k, n]) => `
          <button data-champ="niveau" data-val="${k}" class="${brouillon.niveau === k ? 'pris' : ''}">
            <span class="disque" style="--c:var(--accent)"></span>
            <span><span class="titre">${n.nom}</span><span class="desc">${n.desc}</span></span>
          </button>`).join('')}
      </div>`,
    () => `
      <div class="section-titre">Étape 3 sur 4 — combien de séances par semaine</div>
      <p class="consigne" style="margin:0 0 14px">Sois honnête : trois séances tenues valent mieux que cinq prévues.</p>
      <div class="segments" style="margin-bottom:18px">
        ${[2, 3, 4, 5, 6].map((j) => `<button data-champ="jours" data-val="${j}" class="${brouillon.jours === j ? 'pris' : ''}">${j}</button>`).join('')}
      </div>
      <div class="section-titre">Ton matériel</div>
      <div class="choix">
        ${Object.entries(MATERIELS).map(([k, m]) => `
          <button data-champ="materiel" data-val="${k}" class="${brouillon.materiel === k ? 'pris' : ''}">
            <span class="disque" style="--c:var(--blanc-disque)"></span>
            <span><span class="titre">${m.nom}</span><span class="desc">${m.desc}</span></span>
          </button>`).join('')}
      </div>`,
    () => `
      <div class="section-titre">Étape 4 sur 4 — toi</div>
      <p class="consigne" style="margin:0 0 14px">Sert au suivi du poids et à l'estimation des calories. Tu peux passer et remplir plus tard.</p>
      <div class="grille-2">
        <label class="champ"><span>Poids (kg)</span><input type="number" inputmode="decimal" id="p-poids" value="${brouillon.poids}"></label>
        <label class="champ"><span>Taille (cm)</span><input type="number" inputmode="numeric" id="p-taille" value="${brouillon.taille}"></label>
        <label class="champ"><span>Âge</span><input type="number" inputmode="numeric" id="p-age" value="${brouillon.age}"></label>
        <label class="champ"><span>Sexe</span><select id="p-sexe">
          <option value="h" ${brouillon.sexe === 'h' ? 'selected' : ''}>Homme</option>
          <option value="f" ${brouillon.sexe === 'f' ? 'selected' : ''}>Femme</option>
        </select></label>
      </div>`,
  ];

  ec.innerHTML = `
    <div style="text-align:center;padding:18px 0 6px">
      <svg id="logo-debut" class="figurine" style="max-width:230px;margin:0 auto;background:none"></svg>
      <h2 style="font-size:30px;text-transform:uppercase;letter-spacing:.02em;margin-top:6px">Fonte</h2>
      <p class="consigne" style="margin:2px 0 0">Ton carnet de salle : programme, séances, progression.</p>
    </div>
    ${etapes[etapeDebut]()}
    <div class="rangee" style="margin-top:22px;gap:10px">
      ${etapeDebut > 0 ? '<button class="btn fantome" id="debut-retour">Retour</button>' : ''}
      <button class="btn plein pousse" id="debut-suite" style="flex:1">${etapeDebut === 3 ? 'Créer mon programme' : 'Continuer'}</button>
    </div>`;

  ajouteFigurine($('#logo-debut'), PAR_ID['souleve-de-terre']);

  $$('[data-champ]', ec).forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.val;
    brouillon[b.dataset.champ] = isNaN(Number(v)) ? v : Number(v);
    rendreDebut();
  }));
  const suite = $('#debut-suite', ec);
  suite.addEventListener('click', () => {
    if (etapeDebut === 3) {
      brouillon.poids = Number($('#p-poids').value) || 75;
      brouillon.taille = Number($('#p-taille').value) || 175;
      brouillon.age = Number($('#p-age').value) || 30;
      brouillon.sexe = $('#p-sexe').value;
      S.profil = { ...brouillon };
      S.programme = genererProgramme(S.profil);
      if (!S.poids.length) S.poids = [{ date: auj(), kg: S.profil.poids }];
      sauver();
      va('accueil');
      toast('Programme créé — bon entraînement');
      return;
    }
    etapeDebut++;
    rendreDebut();
  });
  const retour = $('#debut-retour', ec);
  if (retour) retour.addEventListener('click', () => { etapeDebut--; rendreDebut(); });
}

/* ---------------- écran : accueil ---------------- */

function rendreAccueil() {
  const ec = $('#ec-accueil');
  const i = prochaineSeance();
  const seanceDuJour = S.programme[i];
  const obj = OBJECTIFS[S.profil.objectif];
  const premier = PAR_ID[seanceDuJour.exos[0].id];
  const conseil = CONSEILS[new Date().getDate() % CONSEILS.length];

  const cetteSemaine = S.journal.filter((s) => joursEcoules(s.date) < 7).length;
  const volSemaine = S.journal.filter((s) => joursEcoules(s.date) < 7).reduce((a, s) => a + volumeSeance(s), 0);

  ec.innerHTML = `
    <div class="carte" style="padding:0;overflow:hidden">
      <svg class="figurine" id="hero" style="height:190px;border-radius:0"></svg>
      <div style="padding:14px">
        <div class="rangee">
          <span class="puce accent">${echapper(obj.nom)}</span>
          <span class="puce">${S.profil.jours} × / semaine</span>
        </div>
        <h2 style="font-size:27px;text-transform:uppercase;margin:10px 0 2px">${echapper(seanceDuJour.nom)}</h2>
        <div class="consigne">${seanceDuJour.exos.length} exercices · ${echapper(PAR_ID[seanceDuJour.exos[0].id].nom)}, ${echapper(PAR_ID[seanceDuJour.exos[1] ? seanceDuJour.exos[1].id : seanceDuJour.exos[0].id].nom)}…
          · environ ${dureeEstimee(seanceDuJour)} min</div>
        <button class="btn plein large" id="btn-commencer" style="margin-top:14px">Commencer la séance</button>
      </div>
    </div>

    <div class="grille-3" style="margin-top:10px">
      <div class="stat"><div class="v">${cetteSemaine}</div><div class="l">séances / 7 j</div></div>
      <div class="stat"><div class="v">${Math.round(volSemaine / 1000)}<small style="font-size:13px"> t</small></div><div class="l">volume 7 j</div></div>
      <div class="stat"><div class="v">${serieDeSeances()}</div><div class="l">semaines d'affilée</div></div>
    </div>

    <div class="section-titre">Au programme</div>
    ${seanceDuJour.exos.map((p) => ligneExo(p)).join('')}

    <div class="section-titre">Outils</div>
    <div class="grille-2">
      <button class="btn" id="btn-plaques">Calculateur de plaques</button>
      <button class="btn" id="btn-1rm">Calcul du maxi</button>
      <button class="btn" id="btn-chrono">Chronomètre</button>
      <button class="btn" id="btn-nutrition">Calories &amp; protéines</button>
      <button class="btn" id="btn-mesures">Mes mesures</button>
      <button class="btn" id="btn-poids">Noter mon poids</button>
    </div>

    <div class="carte" style="margin-top:14px;border-style:dashed">
      <div class="section-titre" style="margin:0 0 6px">Le conseil du jour</div>
      <div class="consigne">${echapper(conseil)}</div>
    </div>`;

  ajouteFigurine($('#hero'), premier);
  $('#btn-commencer').addEventListener('click', () => demarrerSeance(i));
  $('#btn-plaques').addEventListener('click', outilPlaques);
  $('#btn-mesures').addEventListener('click', outilMesures);
  $('#btn-1rm').addEventListener('click', outil1RM);
  $('#btn-chrono').addEventListener('click', outilChrono);
  $('#btn-nutrition').addEventListener('click', outilNutrition);
  $('#btn-poids').addEventListener('click', outilPoids);
  brancherLignesExo(ec);
}

function dureeEstimee(seance) {
  let s = 0;
  for (const p of seance.exos) {
    const exo = PAR_ID[p.id];
    const travail = exo.temps ? p.reps[1] : p.reps[1] * 3.5;
    // Le dernier repos d'un exercice sert à installer le suivant : on ne le compte qu'une fois.
    s += p.series * travail + (p.series - 1) * p.repos + 60;
  }
  return Math.round(s / 60) + 5;
}

function ligneExo(p, extra = '') {
  const exo = PAR_ID[p.id];
  const [r1, r2] = p.reps;
  const unite = exo.temps ? ' s' : '';
  return `
    <button class="liste-exo" data-exo="${exo.id}">
      <svg class="vignette" data-fig="${exo.id}"></svg>
      <span style="flex:1;min-width:0">
        <span class="nom">${echapper(exo.nom)}</span>
        <span class="meta">${p.series} × ${r1}${r1 === r2 ? '' : '–' + r2}${unite} · repos ${p.repos} s${extra}</span>
      </span>
      <span class="disque" style="--c:${couleurGroupe(exo)}"></span>
    </button>`;
}

function couleurGroupeNom(g) {
  if (['pecs', 'triceps'].includes(g)) return 'var(--rouge)';
  if (['dorsaux', 'biceps', 'trapezes'].includes(g)) return 'var(--bleu)';
  if (['quadriceps', 'ischios', 'fessiers', 'mollets', 'adducteurs', 'abducteurs'].includes(g)) return 'var(--vert)';
  if (['epaules', 'epaules-arr'].includes(g)) return 'var(--accent)';
  return 'var(--violet)';
}

function couleurGroupe(exo) {
  return couleurGroupeNom(exo.groupes.p[0]);
}

/** Attache les figurines des vignettes et ouvre la fiche au clic. */
function brancherLignesExo(racine) {
  $$('[data-fig]', racine).forEach((svg) => ajouteFigurine(svg, PAR_ID[svg.dataset.fig]));
  $$('[data-exo]', racine).forEach((b) => b.addEventListener('click', () => ficheExo(b.dataset.exo)));
}

/* ---------------- écran : programme ---------------- */

function rendreProgramme() {
  const ec = $('#ec-programme');
  const obj = OBJECTIFS[S.profil.objectif];
  ec.innerHTML = `
    <div class="carte">
      <div class="rangee">
        <span class="disque" style="--c:${obj.couleur}"></span>
        <div style="flex:1">
          <div style="font-family:var(--display);font-size:18px;text-transform:uppercase">${echapper(obj.nom)}</div>
          <div class="consigne">${NIVEAUX[S.profil.niveau].nom} · ${MATERIELS[S.profil.materiel].nom}</div>
        </div>
      </div>
      <div class="consigne" style="margin-top:10px"><b>Cardio :</b> ${echapper(obj.cardio)}</div>
    </div>
    ${S.programme.map((s, i) => {
      const fait = S.faitLe[s.cle + '#' + i];
      return `
      <div class="section-titre" style="display:flex;align-items:center;gap:10px">
        <span>Séance ${i + 1} — ${echapper(s.nom)}</span>
        ${fait ? `<span class="puce ok" style="margin-left:auto">faite ${joursEcoules(fait) === 0 ? "aujourd'hui" : 'il y a ' + joursEcoules(fait) + ' j'}</span>` : ''}
      </div>
      ${s.exos.map((p) => ligneExo(p)).join('')}
      <button class="btn large fantome" data-lancer="${i}" style="margin-bottom:6px">Lancer cette séance</button>`;
    }).join('')}
    <div class="section-titre">Changer de cap</div>
    <div class="grille-2">
      <button class="btn" id="btn-regenerer">Nouveau tirage</button>
      <button class="btn" id="btn-modifier">Modifier mes réponses</button>
    </div>
    <p class="consigne" style="margin-top:10px">« Nouveau tirage » garde ton objectif mais change les exercices choisis pour chaque mouvement.</p>`;

  brancherLignesExo(ec);
  $$('[data-lancer]', ec).forEach((b) => b.addEventListener('click', () => demarrerSeance(Number(b.dataset.lancer))));
  $('#btn-regenerer').addEventListener('click', () => {
    // Même squelette de séance, autres exercices sur chaque patron de mouvement.
    melangerChoix(1 + Math.floor(Math.random() * 5));
    sauver(); rendreProgramme(); toast('Nouveaux exercices tirés');
  });
  $('#btn-modifier').addEventListener('click', () => { etapeDebut = 0; brouillon = { ...brouillon, ...S.profil }; va('debut'); });
}

/** Fait tourner le choix d'exercice à l'intérieur de chaque patron de mouvement. */
function melangerChoix(decalage) {
  const dispo = exosDisponibles(S.profil.materiel);
  S.programme.forEach((s, iS) => {
    const pris = new Set();
    s.exos.forEach((p, iE) => {
      const exo = PAR_ID[p.id];
      const { liste: candidats } = candidatsPour(exo.pattern, dispo);
      if (candidats.length < 2) { pris.add(p.id); return; }
      let choisi = candidats[(iS + iE + decalage) % candidats.length];
      if (pris.has(choisi.id)) choisi = candidats.find((c) => !pris.has(c.id)) || choisi;
      pris.add(choisi.id);
      const neuf = prescrire(choisi, OBJECTIFS[S.profil.objectif], NIVEAUX[S.profil.niveau]);
      s.exos[iE] = neuf;
    });
  });
}

/* ---------------- écran : bibliothèque ---------------- */

let filtreExos = { texte: '', groupe: 'tous' };

function rendreExos() {
  const ec = $('#ec-exos');
  const groupes = ['tous', ...new Set(EXOS.flatMap((e) => e.groupes.p))];
  const liste = EXOS.filter((e) => {
    const okG = filtreExos.groupe === 'tous' || e.groupes.p.includes(filtreExos.groupe);
    const t = filtreExos.texte.toLowerCase();
    const okT = !t || e.nom.toLowerCase().includes(t);
    return okG && okT;
  });

  ec.innerHTML = `
    <label class="champ"><input type="search" id="rech" placeholder="Chercher un exercice" value="${echapper(filtreExos.texte)}"
      style="font-family:var(--corps);font-weight:400;font-size:15px"></label>
    <div style="display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;-webkit-overflow-scrolling:touch">
      ${groupes.map((g) => `<button class="puce ${filtreExos.groupe === g ? 'accent' : ''}" data-groupe="${g}"
        style="border:0;white-space:nowrap;padding:7px 12px">${g === 'tous' ? 'Tous' : echapper(MUSCLES[g] || g)}</button>`).join('')}
    </div>
    ${liste.length ? liste.map((e) => `
      <button class="liste-exo" data-exo="${e.id}">
        <svg class="vignette" data-fig="${e.id}"></svg>
        <span style="flex:1;min-width:0">
          <span class="nom">${echapper(e.nom)}</span>
          <span class="meta">${e.groupes.p.map((g) => MUSCLES[g]).join(', ')} · ${MATERIELS[e.mat] ? MATERIELS[e.mat].nom.toLowerCase() : e.mat}</span>
        </span>
        <span class="disque" style="--c:${couleurGroupe(e)}"></span>
      </button>`).join('') : '<div class="vide">Aucun exercice ne correspond.</div>'}`;

  brancherLignesExo(ec);
  const rech = $('#rech', ec);
  rech.addEventListener('input', () => {
    filtreExos.texte = rech.value;
    const pos = rech.selectionStart;
    rendreExos();
    const neuf = $('#rech');
    neuf.focus();
    neuf.setSelectionRange(pos, pos);
  });
  $$('[data-groupe]', ec).forEach((b) => b.addEventListener('click', () => { filtreExos.groupe = b.dataset.groupe; rendreExos(); }));
}

/* ---------------- fiche d'un exercice ---------------- */

function ficheExo(id) {
  const e = PAR_ID[id];
  const rec = recordDe(id);
  const der = dernieresSeriesDe(id);
  ouvrirFeuille(`
    <h2 style="font-size:25px;text-transform:uppercase;margin-bottom:8px">${echapper(e.nom)}</h2>
    <div class="scene3d" style="height:232px">
      <div id="fiche-fig" style="width:100%;height:100%"></div>
      <span class="hint3d">glisse ↔ tourner · ↕ incliner</span>
    </div>
    <div class="rangee" style="flex-wrap:wrap;gap:6px;margin-top:12px">
      ${e.groupes.p.map((g) => `<span class="puce accent">${echapper(MUSCLES[g])}</span>`).join('')}
      ${e.groupes.s.map((g) => `<span class="puce">${echapper(MUSCLES[g])}</span>`).join('')}
    </div>
    <div class="muscles" style="margin:16px 0 6px">
      <figure style="margin:0">${silhouette(e, 'face')}<figcaption>face</figcaption></figure>
      <figure style="margin:0">${silhouette(e, 'dos')}<figcaption>dos</figcaption></figure>
    </div>
    <div class="legende-muscles">
      <span><i class="prim"></i>Ciblé</span>
      <span><i class="sec"></i>Sollicité</span>
    </div>
    <div class="section-titre">Exécution</div>
    <p class="consigne" style="margin:0">${echapper(e.consigne)}</p>
    <div class="section-titre">À éviter</div>
    <p class="consigne" style="margin:0"><b>${echapper(e.erreur)}</b></p>
    ${der ? `
      <div class="section-titre">Ton dernier passage — ${dateCourte(der.date)}</div>
      <p class="consigne" style="margin:0">${der.series.filter((s) => s.reps).map((s) => (s.kg ? s.kg + ' kg × ' : '') + s.reps).join(' · ')}</p>
      ${rec.rm ? `<p class="consigne" style="margin-top:6px">Record : <b>${rec.max} kg</b> · maxi estimé <b>${rec.rm} kg</b></p>` : ''}
    ` : '<div class="section-titre">Ton dernier passage</div><p class="consigne" style="margin:0">Jamais fait pour l\'instant.</p>'}
  `);
  monter3D($('#fiche-fig'), e, { anime: true });
}

/* ---------------- silhouette des muscles ---------------- */

// Un mannequin anatomique simple, vu de face (identique de dos), sur lequel on
// surligne les muscles travaillés. Chaque forme : ['cap',x1,y1,x2,y2,ep] (capsule),
// ['ell',cx,cy,rx,ry] ou ['rr',x,y,w,h,rx].
const MANNEQUIN = [
  ['ell', 50, 15, 9.5, 9.5],            // tête
  ['cap', 50, 23, 50, 31, 9],           // cou
  ['rr', 30, 31, 40, 34, 15],           // buste
  ['rr', 38, 58, 24, 44, 11],           // abdomen
  ['ell', 30, 37, 8, 8], ['ell', 70, 37, 8, 8],
  ['cap', 30, 39, 23, 69, 10], ['cap', 70, 39, 77, 69, 10],
  ['cap', 23, 69, 19, 99, 7.5], ['cap', 77, 69, 81, 99, 7.5],
  ['ell', 19, 101, 4.5, 4.5], ['ell', 81, 101, 4.5, 4.5],
  ['rr', 37, 92, 26, 16, 8],            // bassin
  ['cap', 44, 102, 42, 154, 13], ['cap', 56, 102, 58, 154, 13],
  ['ell', 42, 154, 6, 6], ['ell', 58, 154, 6, 6],
  ['cap', 42, 154, 41, 196, 9.5], ['cap', 58, 154, 59, 196, 9.5],
  ['cap', 41, 196, 37, 199, 7], ['cap', 59, 196, 63, 199, 7],
];

const ZONESM = {
  face: {
    trapezes: [['cap', 50, 30, 37, 37, 6], ['cap', 50, 30, 63, 37, 6]],
    epaules: [['ell', 30, 37, 7.5, 7], ['ell', 70, 37, 7.5, 7]],
    pecs: [['ell', 41, 47, 9, 7.5], ['ell', 59, 47, 9, 7.5]],
    biceps: [['cap', 29, 42, 24, 64, 8], ['cap', 71, 42, 76, 64, 8]],
    'avant-bras': [['cap', 24, 68, 20, 96, 6], ['cap', 76, 68, 80, 96, 6]],
    abdos: [['rr', 43, 58, 14, 34, 5]],
    obliques: [['ell', 40, 74, 4, 12], ['ell', 60, 74, 4, 12]],
    adducteurs: [['ell', 47, 116, 4, 14], ['ell', 53, 116, 4, 14]],
    quadriceps: [['cap', 44, 106, 42, 150, 11], ['cap', 56, 106, 58, 150, 11]],
    mollets: [['cap', 42, 160, 41, 192, 8], ['cap', 58, 160, 59, 192, 8]],
  },
  dos: {
    trapezes: [['rr', 38, 32, 24, 18, 7]],
    'epaules-arr': [['ell', 30, 37, 7.5, 7], ['ell', 70, 37, 7.5, 7]],
    dorsaux: [['ell', 41, 60, 8.5, 15], ['ell', 59, 60, 8.5, 15]],
    triceps: [['cap', 29, 42, 24, 64, 8], ['cap', 71, 42, 76, 64, 8]],
    'avant-bras': [['cap', 24, 68, 20, 96, 6], ['cap', 76, 68, 80, 96, 6]],
    lombaires: [['rr', 42, 76, 16, 16, 6]],
    fessiers: [['ell', 43, 99, 8.5, 8], ['ell', 57, 99, 8.5, 8]],
    ischios: [['cap', 44, 108, 42, 150, 11], ['cap', 56, 108, 58, 150, 11]],
    mollets: [['cap', 42, 158, 41, 193, 8.5], ['cap', 58, 158, 59, 193, 8.5]],
  },
};

function formeMuscle([t, a, b, c, d, e], cls) {
  if (t === 'cap') return `<line class="${cls}" x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke-width="${e}"/>`;
  if (t === 'ell') return `<ellipse class="${cls}" cx="${a}" cy="${b}" rx="${c}" ry="${d}"/>`;
  return `<rect class="${cls}" x="${a}" y="${b}" width="${c}" height="${d}" rx="${e}"/>`;
}

function silhouette(exo, cote) {
  const prim = new Set(exo.groupes.p), sec = new Set(exo.groupes.s);
  const corps = MANNEQUIN.map((f) => formeMuscle(f, 'm-corps')).join('');
  const muscles = Object.entries(ZONESM[cote]).flatMap(([g, formes]) => {
    const cls = prim.has(g) ? 'm-prim' : sec.has(g) ? 'm-sec' : null;
    return cls ? formes.map((f) => formeMuscle(f, cls)) : [];
  }).join('');
  return `<svg viewBox="0 0 100 205" aria-hidden="true">${corps}${muscles}</svg>`;
}

/* ---------------- séance ---------------- */

let seance = null;

function demarrerSeance(indexJour) {
  const modele = S.programme[indexJour];
  seance = {
    index: indexJour,
    cle: modele.cle + '#' + indexJour,
    nom: modele.nom,
    debut: Date.now(),
    i: 0,
    exos: modele.exos.map((p) => {
      const suggestion = conseilCharge(p.id, p);
      return {
        id: p.id, series: p.series, reps: p.reps, repos: p.repos,
        faites: Array.from({ length: p.series }, () => ({ kg: suggestion.kg || '', reps: '', fait: false })),
      };
    }),
  };
  va('seance');
}

function rendreSeance() {
  if (!seance) { va('accueil'); return; }
  const ec = $('#ec-seance');
  const e = seance.exos[seance.i];
  const exo = PAR_ID[e.id];
  const conseil = conseilCharge(e.id, e);
  const total = seance.exos.length;
  const minutes = Math.round((Date.now() - seance.debut) / 60000);

  ec.innerHTML = `
    <div class="rangee">
      <button class="btn fantome" id="quitter-seance" style="padding:8px 12px">Quitter</button>
      <span class="puce pousse">${echapper(seance.nom)}</span>
      <span class="puce">${minutes} min</span>
    </div>

    <div class="progression-seance">
      ${seance.exos.map((x, i) => `<i class="${x.faites.every((f) => f.fait) ? 'faite' : i === seance.i ? 'encours' : ''}"></i>`).join('')}
    </div>

    <div class="scene3d">
      <div id="fig-seance" style="width:100%;height:100%"></div>
      <span class="hint3d">glisse ↔ tourner · ↕ incliner</span>
    </div>

    <div class="entete-exo" style="margin-top:14px">
      <div style="flex:1">
        <div class="section-titre" style="margin:0">Exercice ${seance.i + 1} sur ${total}</div>
        <h2>${echapper(exo.nom)}</h2>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn fantome" data-exo="${exo.id}" style="padding:7px 10px">Fiche</button>
        <button class="btn fantome" id="remplacer-exo" style="padding:7px 10px">Remplacer</button>
      </div>
    </div>

    <div class="carte" style="border-color:${conseil.monter ? 'var(--accent)' : 'var(--line)'}">
      <div class="consigne">
        <b>${e.series} séries de ${e.reps[0]}${e.reps[0] === e.reps[1] ? '' : ' à ' + e.reps[1]}${exo.temps ? ' secondes' : ' répétitions'}</b>
        · repos ${e.repos} s<br>${echapper(conseil.texte)}
      </div>
    </div>

    ${carteEchauffement(e, conseil)}

    <div class="section-titre">Tes séries</div>
    ${e.faites.map((f, i) => `
      <div class="serie ${f.fait ? 'faite' : ''}" data-serie="${i}">
        <div class="rang">${i + 1}${f.pr ? '<span class="pr-star">★</span>' : ''}</div>
        <div>
          <label>${exo.charge === 'corps' ? 'lest kg' : 'charge kg'}</label>
          <input type="number" inputmode="decimal" step="0.5" value="${f.kg}" data-champ="kg" data-i="${i}" placeholder="0">
        </div>
        <div>
          <label>${exo.temps ? 'secondes' : 'répétitions'}</label>
          <input type="number" inputmode="numeric" value="${f.reps}" data-champ="reps" data-i="${i}" placeholder="${e.reps[1]}">
        </div>
        <button class="valider" data-valider="${i}" aria-label="Valider la série">
          <svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5"/></svg>
        </button>
      </div>`).join('')}

    <div class="rangee" style="margin-top:18px;gap:10px">
      ${seance.i > 0 ? '<button class="btn fantome" id="exo-prec">Précédent</button>' : ''}
      <button class="btn plein pousse" id="exo-suiv" style="flex:1">
        ${seance.i === total - 1 ? 'Terminer la séance' : 'Exercice suivant'}
      </button>
    </div>

    <p class="consigne" style="margin-top:14px">${echapper(exo.consigne)}</p>`;

  arreter3D();
  monter3D($('#fig-seance'), exo, { anime: true });
  $('#quitter-seance').addEventListener('click', quitterSeance);
  $('#remplacer-exo').addEventListener('click', remplacerExo);
  $$('[data-exo]', ec).forEach((b) => b.addEventListener('click', () => ficheExo(b.dataset.exo)));
  $$('input[data-champ]', ec).forEach((inp) => inp.addEventListener('input', () => {
    const f = e.faites[Number(inp.dataset.i)];
    f[inp.dataset.champ] = inp.value === '' ? '' : Number(inp.value);
  }));
  $$('[data-valider]', ec).forEach((b) => b.addEventListener('click', () => validerSerie(Number(b.dataset.valider))));
  const prec = $('#exo-prec', ec);
  if (prec) prec.addEventListener('click', () => { seance.i--; rendreSeance(); });
  $('#exo-suiv').addEventListener('click', () => {
    if (seance.i === seance.exos.length - 1) terminerSeance();
    else { seance.i++; rendreSeance(); }
  });
}

function validerSerie(i) {
  const e = seance.exos[seance.i];
  const f = e.faites[i];
  const exo = PAR_ID[e.id];
  f.fait = !f.fait;
  if (f.fait) {
    if (f.reps === '' || f.reps === 0) f.reps = e.reps[1];
    // Record ? On compare à l'historique et aux séries déjà validées cette séance.
    const kg = Number(f.kg) || 0, reps = Number(f.reps) || 0;
    if (!exo.temps && kg > 0 && reps > 0) {
      const rec = recordDe(e.id);
      const dejaSeance = Math.max(0, ...e.faites.filter((x, idx) => idx !== i && x.fait).map((x) => Number(x.kg) || 0));
      if (kg > Math.max(rec.max, dejaSeance)) { f.pr = true; celebrerRecord(exo, kg, reps); }
    }
    if (f.kg !== '' && f.kg > 0) S.charges[e.id] = f.kg;
    // La série suivante hérite de la charge saisie.
    for (let k = i + 1; k < e.faites.length; k++) if (e.faites[k].kg === '') e.faites[k].kg = f.kg;
    sauver();
    vibrer(30);
    const reste = e.faites.some((x) => !x.fait);
    rendreSeance();
    if (reste) lancerRepos(e.repos, 'Série ' + (i + 2) + ' sur ' + e.series + ' — ' + PAR_ID[e.id].nom);
    else if (seance.i < seance.exos.length - 1) {
      lancerRepos(e.repos, 'Ensuite : ' + PAR_ID[seance.exos[seance.i + 1].id].nom);
    }
  } else {
    rendreSeance();
  }
}

function quitterSeance() {
  if (seance && seance.exos.some((e) => e.faites.some((f) => f.fait))) {
    if (!confirm('Quitter la séance ? Ce qui est validé sera enregistré.')) return;
    enregistrerSeance();
  }
  seance = null;
  arreterRepos();
  va('accueil');
}

function enregistrerSeance() {
  const exos = seance.exos
    .map((e) => ({ id: e.id, series: e.faites.filter((f) => f.fait).map((f) => ({ kg: Number(f.kg) || 0, reps: Number(f.reps) || 0 })) }))
    .filter((e) => e.series.length);
  if (!exos.length) return null;
  const entree = { date: auj(), cle: seance.cle, nom: seance.nom, duree: Math.round((Date.now() - seance.debut) / 60000), exos };
  S.journal.push(entree);
  S.faitLe[seance.cle] = auj();
  sauver();
  return entree;
}

function terminerSeance() {
  const entree = enregistrerSeance();
  arreterRepos();
  if (!entree) { seance = null; va('accueil'); toast('Séance abandonnée : rien à enregistrer'); return; }
  const volume = volumeSeance(entree);
  const nbSeries = entree.exos.reduce((a, e) => a + e.series.length, 0);
  seance = null;
  va('accueil');
  ouvrirFeuille(`
    <div style="text-align:center;padding:10px 0">
      <svg class="figurine" id="fin-fig" style="height:170px;background:none"></svg>
      <h2 style="font-size:27px;text-transform:uppercase;margin-top:8px">Séance bouclée</h2>
      <p class="consigne">${echapper(entree.nom)} · ${entree.duree} min</p>
    </div>
    <div class="grille-3">
      <div class="stat"><div class="v">${nbSeries}</div><div class="l">séries</div></div>
      <div class="stat"><div class="v">${Math.round(volume)}</div><div class="l">kg soulevés</div></div>
      <div class="stat"><div class="v">${entree.duree}</div><div class="l">minutes</div></div>
    </div>
    <button class="btn plein large" style="margin-top:16px" onclick="fermerFeuille()">Parfait</button>`);
  ajouteFigurine($('#fin-fig'), PAR_ID['traction']);
  bip(660, 0.12); setTimeout(() => bip(880, 0.18), 130);
}

/* ---------------- chrono de repos ---------------- */

let repos = { total: 0, reste: 0, timer: null };
const CIRCONFERENCE = 2 * Math.PI * 86;

function lancerRepos(secondes, suite) {
  repos.total = secondes;
  repos.reste = secondes;
  $('#repos-suite').textContent = suite || '';
  $('#repos').classList.add('ouvert');
  $('#repos').classList.remove('fini');
  majRepos();
  clearInterval(repos.timer);
  repos.timer = setInterval(() => {
    repos.reste--;
    majRepos();
    if (repos.reste === 3) bip(520, 0.08, 0.12);
    if (repos.reste <= 0) {
      clearInterval(repos.timer);
      $('#repos').classList.add('fini');
      bip(880, 0.25); vibrer([120, 60, 120]);
      setTimeout(arreterRepos, 2500);
    }
  }, 1000);
}

function majRepos() {
  const r = Math.max(0, repos.reste);
  $('#compte-repos').textContent = r;
  const part = repos.total ? r / repos.total : 0;
  const j = $('#jauge-repos');
  j.setAttribute('stroke-dasharray', CIRCONFERENCE);
  j.setAttribute('stroke-dashoffset', CIRCONFERENCE * (1 - part));
}

function arreterRepos() {
  clearInterval(repos.timer);
  $('#repos').classList.remove('ouvert', 'fini');
}

/* ---------------- écran : progrès ---------------- */

function rendreProgres() {
  const ec = $('#ec-progres');
  if (!S.journal.length) {
    ec.innerHTML = `<div class="vide">
      <svg viewBox="0 0 24 24"><path d="M3 20h18"/><path d="M4 15.5l5-5 3.5 3.5L20 6"/></svg>
      <p>Rien à afficher pour l'instant.<br>Termine une séance et tes courbes apparaîtront ici.</p></div>`;
    return;
  }

  // Volume par semaine, sur les huit dernières.
  const semaines = [];
  for (let i = 7; i >= 0; i--) {
    const fin = Date.now() - i * 604800000;
    const debut = fin - 604800000;
    const v = S.journal.filter((s) => {
      const t = jourDe(s.date).getTime();
      return t > debut && t <= fin;
    }).reduce((a, s) => a + volumeSeance(s), 0);
    semaines.push(v);
  }
  const maxSem = Math.max(...semaines, 1);

  // Les trois exercices les plus pratiqués.
  const compte = {};
  S.journal.forEach((s) => s.exos.forEach((e) => { compte[e.id] = (compte[e.id] || 0) + 1; }));
  const vedettes = Object.entries(compte).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);

  ec.innerHTML = `
    <div class="grille-3">
      <div class="stat"><div class="v">${S.journal.length}</div><div class="l">séances</div></div>
      <div class="stat"><div class="v">${Math.round(S.journal.reduce((a, s) => a + volumeSeance(s), 0) / 1000)}<small style="font-size:13px"> t</small></div><div class="l">soulevé en tout</div></div>
      <div class="stat"><div class="v">${S.journal.reduce((a, s) => a + s.duree, 0)}</div><div class="l">minutes</div></div>
    </div>

    <div class="section-titre">Volume par semaine</div>
    <div class="carte">
      <div class="barres">
        ${semaines.map((v, i) => `<div class="${i === 7 ? 'forte' : ''}" style="height:${Math.max(3, (v / maxSem) * 100)}%" title="${Math.round(v)} kg"></div>`).join('')}
      </div>
      <div class="rangee" style="margin-top:8px">
        <span class="consigne" style="font-size:11px">il y a 8 semaines</span>
        <span class="consigne pousse" style="font-size:11px">cette semaine</span>
      </div>
    </div>

    <div class="section-titre">Assiduité</div>
    <div class="carte">${calendrierHTML()}
      <div class="consigne" style="margin-top:8px">15 dernières semaines · plus la case est jaune, plus le volume du jour est élevé.</div>
    </div>

    <div class="section-titre">Volume par muscle · 7 jours</div>
    ${volumeMuscleHTML()}

    <div class="section-titre">Tes charges</div>
    ${vedettes.map((id) => courbeExo(id)).join('')}

    <div class="section-titre">Poids de corps</div>
    ${S.poids.length > 1 ? `<div class="carte">${courbe(S.poids.map((p) => p.kg), 'kg')}</div>`
      : '<div class="carte consigne">Note ton poids régulièrement depuis l\'accueil pour voir la courbe.</div>'}

    <div class="section-titre">Mensurations</div>
    ${mesuresHTML()}

    <div class="section-titre">Historique</div>
    ${[...S.journal].reverse().slice(0, 12).map((s) => `
      <div class="carte">
        <div class="rangee">
          <div>
            <div style="font-family:var(--display);font-size:16px;text-transform:uppercase">${echapper(s.nom)}</div>
            <div class="consigne">${dateCourte(s.date)} · ${s.duree} min · ${s.exos.length} exercices</div>
          </div>
          <span class="puce pousse">${Math.round(volumeSeance(s))} kg</span>
        </div>
      </div>`).join('')}`;

  const bm = $('#btn-mesures-add', ec);
  if (bm) bm.addEventListener('click', outilMesures);
}

function courbeExo(id) {
  const points = [];
  S.journal.forEach((s) => {
    const e = s.exos.find((x) => x.id === id);
    if (!e) return;
    const max = Math.max(...e.series.map((x) => x.kg || 0), 0);
    if (max > 0) points.push(max);
  });
  const rec = recordDe(id);
  if (points.length < 2) {
    return `<div class="carte"><div class="rangee">
      <span style="font-family:var(--display);text-transform:uppercase">${echapper(PAR_ID[id].nom)}</span>
      <span class="puce pousse">${rec.max ? rec.max + ' kg' : 'au poids du corps'}</span></div></div>`;
  }
  return `<div class="carte">
    <div class="rangee" style="margin-bottom:6px">
      <span style="font-family:var(--display);text-transform:uppercase">${echapper(PAR_ID[id].nom)}</span>
      <span class="puce accent pousse">record ${rec.max} kg · maxi estimé ${rec.rm} kg</span>
    </div>
    ${courbe(points, 'kg')}</div>`;
}

/** Petite courbe SVG, avec aire, grille et point final marqué. */
function courbe(valeurs, unite) {
  const L = 300, H = 110, m = 14;
  const min = Math.min(...valeurs), max = Math.max(...valeurs);
  const etendue = max - min || 1;
  const pts = valeurs.map((v, i) => {
    const x = m + (i / Math.max(1, valeurs.length - 1)) * (L - 2 * m);
    const y = H - m - ((v - min) / etendue) * (H - 2 * m);
    return [x, y];
  });
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const aire = d + ` L${pts[pts.length - 1][0].toFixed(1)} ${H - m} L${pts[0][0].toFixed(1)} ${H - m} Z`;
  const dernier = pts[pts.length - 1];
  return `<svg class="graphe" viewBox="0 0 ${L} ${H}" preserveAspectRatio="none">
    <line class="grille" x1="${m}" y1="${H - m}" x2="${L - m}" y2="${H - m}"/>
    <path class="aire" d="${aire}"/>
    <path class="ligne" d="${d}"/>
    <circle class="bout" cx="${dernier[0].toFixed(1)}" cy="${dernier[1].toFixed(1)}" r="4"/>
    <text x="${m}" y="12">${max} ${unite}</text>
    <text x="${m}" y="${H - 2}">${min} ${unite}</text>
  </svg>`;
}

/* ---------------- écran : réglages ---------------- */

function rendreReglages() {
  const ec = $('#ec-reglages');
  const p = S.profil;
  ec.innerHTML = `
    <div class="section-titre">Objectif</div>
    <div class="choix">
      ${Object.entries(OBJECTIFS).map(([k, o]) => `
        <button data-obj="${k}" class="${p.objectif === k ? 'pris' : ''}">
          <span class="disque" style="--c:${o.couleur}"></span>
          <span><span class="titre">${o.nom}</span><span class="desc">${o.desc}</span></span>
        </button>`).join('')}
    </div>

    <div class="section-titre">Séances par semaine</div>
    <div class="segments">${[2, 3, 4, 5, 6].map((j) => `<button data-jours="${j}" class="${p.jours === j ? 'pris' : ''}">${j}</button>`).join('')}</div>

    <div class="section-titre">Matériel</div>
    <div class="segments">${Object.entries(MATERIELS).map(([k, m]) => `<button data-mat="${k}" class="${p.materiel === k ? 'pris' : ''}" style="font-size:13px">${m.nom}</button>`).join('')}</div>

    <div class="section-titre">Niveau</div>
    <div class="segments">${Object.entries(NIVEAUX).map(([k, n]) => `<button data-niv="${k}" class="${p.niveau === k ? 'pris' : ''}" style="font-size:13px">${n.nom}</button>`).join('')}</div>

    <div class="section-titre">Toi</div>
    <div class="grille-2">
      <label class="champ"><span>Poids (kg)</span><input type="number" inputmode="decimal" id="r-poids" value="${p.poids}"></label>
      <label class="champ"><span>Taille (cm)</span><input type="number" inputmode="numeric" id="r-taille" value="${p.taille}"></label>
      <label class="champ"><span>Âge</span><input type="number" inputmode="numeric" id="r-age" value="${p.age}"></label>
      <label class="champ"><span>Sexe</span><select id="r-sexe">
        <option value="h" ${p.sexe === 'h' ? 'selected' : ''}>Homme</option>
        <option value="f" ${p.sexe === 'f' ? 'selected' : ''}>Femme</option></select></label>
    </div>

    <div class="section-titre">Pendant la séance</div>
    <div class="carte">
      <label class="rangee" style="cursor:pointer"><span>Bip de fin de repos</span>
        <input type="checkbox" id="r-son" class="pousse" ${S.reglages.son ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--accent)"></label>
    </div>
    <div class="carte">
      <label class="rangee" style="cursor:pointer"><span>Vibration</span>
        <input type="checkbox" id="r-vibrer" class="pousse" ${S.reglages.vibrer ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--accent)"></label>
    </div>

    <div class="section-titre">Tes données</div>
    <p class="consigne" style="margin:0 0 10px">Tout est stocké sur ton téléphone, rien n'est envoyé nulle part. Exporte de temps en temps pour ne rien perdre.</p>
    <div class="grille-2">
      <button class="btn" id="btn-export">Exporter</button>
      <button class="btn" id="btn-import">Importer</button>
    </div>
    <button class="btn large danger" id="btn-reset" style="margin-top:10px">Tout effacer</button>
    <p class="consigne" style="margin-top:16px;text-align:center">Fonte · ${EXOS.length} exercices · fait pour toi</p>`;

  $$('[data-obj]', ec).forEach((b) => b.addEventListener('click', () => majProfil({ objectif: b.dataset.obj })));
  $$('[data-jours]', ec).forEach((b) => b.addEventListener('click', () => majProfil({ jours: Number(b.dataset.jours) })));
  $$('[data-mat]', ec).forEach((b) => b.addEventListener('click', () => majProfil({ materiel: b.dataset.mat })));
  $$('[data-niv]', ec).forEach((b) => b.addEventListener('click', () => majProfil({ niveau: b.dataset.niv })));
  ['poids', 'taille', 'age'].forEach((k) => $('#r-' + k, ec).addEventListener('change', (ev) => {
    S.profil[k] = Number(ev.target.value) || S.profil[k];
    if (k === 'poids') S.poids.push({ date: auj(), kg: S.profil.poids });
    sauver();
  }));
  $('#r-sexe', ec).addEventListener('change', (ev) => { S.profil.sexe = ev.target.value; sauver(); });
  $('#r-son', ec).addEventListener('change', (ev) => { S.reglages.son = ev.target.checked; sauver(); });
  $('#r-vibrer', ec).addEventListener('change', (ev) => { S.reglages.vibrer = ev.target.checked; sauver(); });
  $('#btn-export', ec).addEventListener('click', exporter);
  $('#btn-import', ec).addEventListener('click', importer);
  $('#btn-reset', ec).addEventListener('click', () => {
    if (!confirm('Effacer ton programme, ton historique et tes réglages ? C\'est définitif.')) return;
    localStorage.removeItem(CLE_SAUVE);
    S = copie(ETAT_VIDE);
    etapeDebut = 0;
    va('debut');
  });
}

function majProfil(champs) {
  S.profil = { ...S.profil, ...champs };
  S.programme = genererProgramme(S.profil);
  sauver();
  rendreReglages();
  toast('Programme mis à jour');
}

function exporter() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fonte-' + auj() + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Sauvegarde téléchargée');
}

function importer() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.addEventListener('change', () => {
    const f = inp.files[0];
    if (!f) return;
    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        const donnees = JSON.parse(lecteur.result);
        if (!donnees.profil) throw new Error('fichier incomplet');
        S = { ...copie(ETAT_VIDE), ...donnees };
        sauver();
        va('accueil');
        toast('Données restaurées');
      } catch (e) {
        toast('Fichier illisible : ' + e.message);
      }
    };
    lecteur.readAsText(f);
  });
  inp.click();
}

/* ---------------- feuille modale et outils ---------------- */

function ouvrirFeuille(html) {
  $('#feuille-contenu').innerHTML = '<div class="poignee"></div>' + html;
  $('#feuille').classList.add('ouverte');
}

function fermerFeuille() {
  $('#feuille').classList.remove('ouverte');
  purgerFigurines();
  // Si on était en séance, la figure 3D de fond a pu être détachée : on la remonte.
  if (ecranCourant === 'seance' && seance) {
    const hote = $('#fig-seance');
    if (hote && !hote.querySelector('svg')) monter3D(hote, PAR_ID[seance.exos[seance.i].id], { anime: true });
  }
}

function outil1RM() {
  ouvrirFeuille(`
    <h2 style="font-size:23px;text-transform:uppercase">Calcul du maxi</h2>
    <p class="consigne">Ta charge maximale sur une répétition, estimée à partir d'une série que tu sais faire. Formule d'Epley — fiable jusqu'à une dizaine de répétitions.</p>
    <div class="grille-2" style="margin-top:14px">
      <label class="champ"><span>Charge (kg)</span><input type="number" inputmode="decimal" id="rm-kg" value="60"></label>
      <label class="champ"><span>Répétitions</span><input type="number" inputmode="numeric" id="rm-reps" value="8"></label>
    </div>
    <div class="carte" style="text-align:center">
      <div class="stat" style="border:0;background:none"><div class="v" id="rm-out">75</div><div class="l">maxi estimé (kg)</div></div>
    </div>
    <div id="rm-table"></div>`);
  const calcul = () => {
    const kg = Number($('#rm-kg').value) || 0, reps = Number($('#rm-reps').value) || 1;
    const rm = kg * (1 + reps / 30);
    $('#rm-out').textContent = Math.round(rm);
    const pourcents = [95, 90, 85, 80, 75, 70, 65, 60];
    const repsPour = { 95: 2, 90: 4, 85: 6, 80: 8, 75: 10, 70: 12, 65: 15, 60: 18 };
    $('#rm-table').innerHTML = '<div class="section-titre">Tes charges de travail</div>' + pourcents.map((p) => `
      <div class="rangee carte" style="padding:9px 12px;margin-bottom:6px">
        <span class="puce">${p} %</span>
        <span class="num pousse" style="font-size:18px">${(Math.round(rm * p / 100 / 2.5) * 2.5).toFixed(1)} kg</span>
        <span class="consigne" style="width:74px;text-align:right">≈ ${repsPour[p]} reps</span>
      </div>`).join('');
  };
  ['rm-kg', 'rm-reps'].forEach((id) => $('#' + id).addEventListener('input', calcul));
  calcul();
}

let chronoLibre = null;
function outilChrono() {
  ouvrirFeuille(`
    <h2 style="font-size:23px;text-transform:uppercase">Chronomètre</h2>
    <div style="text-align:center;padding:14px 0">
      <div class="num" id="chrono-aff" style="font-size:58px">00:00</div>
    </div>
    <div class="grille-3">
      ${[60, 90, 120, 180, 240, 300].map((s) => `<button class="btn" data-repos="${s}">${s < 60 ? s + ' s' : (s / 60) + ' min'}</button>`).join('')}
    </div>
    <div class="rangee" style="margin-top:12px;gap:10px">
      <button class="btn plein" id="chrono-go" style="flex:1">Démarrer</button>
      <button class="btn" id="chrono-raz">Remettre à zéro</button>
    </div>`);
  let t = 0, actif = false;
  clearInterval(chronoLibre);
  const aff = () => {
    $('#chrono-aff').textContent = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  };
  chronoLibre = setInterval(() => { if (actif) { t++; aff(); } }, 1000);
  $('#chrono-go').addEventListener('click', (ev) => {
    actif = !actif;
    ev.target.textContent = actif ? 'Pause' : 'Démarrer';
  });
  $('#chrono-raz').addEventListener('click', () => { t = 0; aff(); });
  $$('[data-repos]').forEach((b) => b.addEventListener('click', () => {
    fermerFeuille();
    lancerRepos(Number(b.dataset.repos), 'Minuteur libre');
  }));
}

function outilNutrition() {
  const p = S.profil, obj = OBJECTIFS[p.objectif];
  // Mifflin-St Jeor, puis facteur d'activité selon le nombre de séances.
  const base = 10 * p.poids + 6.25 * p.taille - 5 * p.age + (p.sexe === 'h' ? 5 : -161);
  const facteur = [1.35, 1.4, 1.47, 1.55, 1.62, 1.7][Math.min(5, Math.max(0, p.jours - 1))];
  const entretien = Math.round(base * facteur);
  const cible = Math.round(entretien * (1 + obj.calories / 100));
  const prot = Math.round(p.poids * obj.proteines);
  const lip = Math.round(p.poids * 0.9);
  const gluc = Math.round((cible - prot * 4 - lip * 9) / 4);
  ouvrirFeuille(`
    <h2 style="font-size:23px;text-transform:uppercase">Calories &amp; protéines</h2>
    <p class="consigne">Estimation à partir de ton poids, ta taille, ton âge et ton nombre de séances. C'est un point de départ : ajuste selon ce que la balance fait au bout de deux à trois semaines.</p>
    <div class="grille-2" style="margin-top:14px">
      <div class="stat"><div class="v">${entretien}</div><div class="l">entretien (kcal)</div></div>
      <div class="stat" style="border-color:var(--accent)"><div class="v">${cible}</div><div class="l">cible ${obj.calories > 0 ? '(+' + obj.calories + ' %)' : obj.calories < 0 ? '(' + obj.calories + ' %)' : ''}</div></div>
    </div>
    <div class="section-titre">Répartition conseillée</div>
    <div class="grille-3">
      <div class="stat"><div class="v">${prot}</div><div class="l">g protéines</div></div>
      <div class="stat"><div class="v">${lip}</div><div class="l">g lipides</div></div>
      <div class="stat"><div class="v">${Math.max(0, gluc)}</div><div class="l">g glucides</div></div>
    </div>
    <p class="consigne" style="margin-top:14px">Soit environ <b>${Math.round(prot / 4)} g de protéines par repas</b> sur quatre prises. Bois 30 à 40 ml d'eau par kilo de poids de corps.</p>`);
}

function outilPoids() {
  ouvrirFeuille(`
    <h2 style="font-size:23px;text-transform:uppercase">Noter mon poids</h2>
    <p class="consigne">Pèse-toi le matin à jeun, toujours dans les mêmes conditions. Le jour le jour n'a aucune importance : c'est la tendance sur trois semaines qui compte.</p>
    <label class="champ" style="margin-top:14px"><span>Poids du jour (kg)</span>
      <input type="number" inputmode="decimal" step="0.1" id="poids-val" value="${S.profil.poids}"></label>
    <button class="btn plein large" id="poids-ok">Enregistrer</button>
    ${S.poids.length > 1 ? '<div class="section-titre">Ta courbe</div><div class="carte">' + courbe(S.poids.map((x) => x.kg), 'kg') + '</div>' : ''}`);
  $('#poids-ok').addEventListener('click', () => {
    const kg = Number($('#poids-val').value);
    if (!kg) { toast('Entre un poids valide'); return; }
    S.poids.push({ date: auj(), kg });
    S.profil.poids = kg;
    sauver();
    fermerFeuille();
    toast('Poids noté : ' + kg + ' kg');
    if (ecranCourant === 'accueil') rendreAccueil();
  });
}

/* ---------------- échauffement, record, remplacement (séance) ---------------- */

/** Séries d'échauffement montantes pour un exercice chargé. */
function echauffement(exo, kgTravail) {
  if (exo.temps || exo.charge === 'corps' || !kgTravail || kgTravail < 20) return null;
  const barbell = /barre/.test(exo.charge || '');
  const rond = (v) => Math.max(barbell ? 20 : 2.5, Math.round(v / 2.5) * 2.5);
  const series = [];
  if (barbell) series.push({ kg: 20, reps: 8, note: 'barre à vide' });
  series.push({ kg: rond(kgTravail * 0.5), reps: 5, note: '50 %' });
  series.push({ kg: rond(kgTravail * 0.7), reps: 3, note: '70 %' });
  if (kgTravail >= 40) series.push({ kg: rond(kgTravail * 0.85), reps: 1, note: '85 %' });
  return series;
}

function carteEchauffement(e, conseil) {
  const exo = PAR_ID[e.id];
  const kgT = Number(e.faites[0].kg) || conseil.kg || S.charges[e.id] || 0;
  const series = echauffement(exo, kgT);
  if (!series) return '';
  return `<details class="echauffement">
    <summary>Échauffement conseillé</summary>
    <div class="ech-liste">
      ${series.map((x) => `<div class="ech-serie"><span class="num">${x.kg} kg</span><span>× ${x.reps}</span><span class="ech-note">${x.note}</span></div>`).join('')}
    </div>
    <p class="consigne" style="margin:8px 0 0">Ces séries ne comptent pas : elles préparent l'articulation. Repos court entre elles.</p>
  </details>`;
}

function celebrerRecord(exo, kg, reps) {
  $$('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast record';
  el.textContent = '★ Record — ' + exo.nom + ' : ' + kg + ' kg × ' + reps;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
  bip(880, 0.12); setTimeout(() => bip(1174, 0.18), 130);
  vibrer([40, 40, 130]);
}

/** Propose d'échanger l'exercice courant contre une variante du même mouvement. */
function remplacerExo() {
  const e = seance.exos[seance.i];
  const cur = PAR_ID[e.id];
  const dejaLa = new Set(seance.exos.map((x) => x.id));
  const alts = candidatsPour(cur.pattern, exosDisponibles(S.profil.materiel)).liste
    .filter((x) => !dejaLa.has(x.id));
  if (!alts.length) { toast('Aucune autre option pour ce mouvement'); return; }
  ouvrirFeuille(`
    <h2 style="font-size:23px;text-transform:uppercase">Remplacer</h2>
    <p class="consigne">Même mouvement que « ${echapper(cur.nom)} ». Tes séries et ton repos sont conservés.</p>
    <div style="margin-top:12px">
      ${alts.map((x) => `
        <button class="liste-exo" data-alt="${x.id}">
          <svg class="vignette" data-fig="${x.id}"></svg>
          <span style="flex:1;min-width:0">
            <span class="nom">${echapper(x.nom)}</span>
            <span class="meta">${x.groupes.p.map((g) => MUSCLES[g]).join(', ')}</span>
          </span>
          <span class="disque" style="--c:${couleurGroupe(x)}"></span>
        </button>`).join('')}
    </div>`);
  $$('#feuille-contenu [data-fig]').forEach((svg) => ajouteFigurine(svg, PAR_ID[svg.dataset.fig]));
  $$('#feuille-contenu [data-alt]').forEach((b) => b.addEventListener('click', () => {
    const neuf = PAR_ID[b.dataset.alt];
    const suggestion = conseilCharge(neuf.id, e);
    e.id = neuf.id;
    e.faites = Array.from({ length: e.series }, () => ({ kg: suggestion.kg || '', reps: '', fait: false }));
    fermerFeuille();
    rendreSeance();
    toast('Remplacé par ' + neuf.nom);
  }));
}

/* ---------------- suivi : calendrier, volume par muscle, mensurations ---------------- */

/** Damier des 15 dernières semaines, une case par jour, intensité = volume. */
function calendrierHTML() {
  const SEM = 15;
  const vol = {};
  S.journal.forEach((s) => { vol[s.date] = (vol[s.date] || 0) + volumeSeance(s); });
  const max = Math.max(1, ...Object.values(vol));
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const lundi = new Date(today);
  lundi.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // lundi de la semaine
  const cols = [];
  for (let w = SEM - 1; w >= 0; w--) {
    const cases = [];
    for (let d = 0; d < 7; d++) {
      const jour = new Date(lundi);
      jour.setDate(lundi.getDate() - w * 7 + d);
      const iso = jour.toISOString().slice(0, 10);
      if (jour > today) { cases.push('<i class="cal nf"></i>'); continue; }
      const v = vol[iso] || 0;
      const n = v === 0 ? 0 : Math.min(3, Math.ceil((v / max) * 3));
      cases.push(`<i class="cal n${n}" title="${iso}${v ? ' · ' + Math.round(v) + ' kg' : ''}"></i>`);
    }
    cols.push(`<div class="cal-col">${cases.join('')}</div>`);
  }
  return `<div class="calendrier">${cols.join('')}</div>`;
}

/** Nombre de séries par groupe musculaire sur les 7 derniers jours. */
function volumeMuscleHTML() {
  const sets = {};
  S.journal.filter((s) => joursEcoules(s.date) < 7).forEach((s) => s.exos.forEach((e) => {
    const exo = PAR_ID[e.id];
    if (exo) exo.groupes.p.forEach((g) => { sets[g] = (sets[g] || 0) + e.series.length; });
  }));
  const lignes = Object.entries(sets).sort((a, b) => b[1] - a[1]);
  if (!lignes.length) return '<div class="carte consigne">Aucune série enregistrée cette semaine.</div>';
  const max = Math.max(...lignes.map((l) => l[1]), 14);
  return `<div class="carte">
    ${lignes.map(([g, n]) => `
      <div class="vm-ligne">
        <span class="vm-nom">${echapper(MUSCLES[g] || g)}</span>
        <span class="vm-barre"><i style="width:${Math.min(100, (n / max) * 100)}%;background:${couleurGroupeNom(g)}"></i></span>
        <span class="num vm-n">${n}</span>
      </div>`).join('')}
    <p class="consigne" style="margin:8px 0 0">Vise 10 à 20 séries par muscle et par semaine.</p>
  </div>`;
}

const PARTIES = [
  { k: 'poids', nom: 'Poids', u: 'kg' },
  { k: 'bras', nom: 'Tour de bras', u: 'cm' },
  { k: 'poitrine', nom: 'Tour de poitrine', u: 'cm' },
  { k: 'taille', nom: 'Tour de taille', u: 'cm' },
  { k: 'cuisse', nom: 'Tour de cuisse', u: 'cm' },
];

function mesuresHTML() {
  const parts = PARTIES.filter((p) => p.k !== 'poids');
  let out = '';
  for (const p of parts) {
    const vals = S.mesures.filter((m) => m[p.k] != null).map((m) => m[p.k]);
    if (vals.length >= 2) {
      out += `<div class="carte">
        <div class="rangee" style="margin-bottom:4px">
          <span style="font-family:var(--display);text-transform:uppercase;font-size:14px">${p.nom}</span>
          <span class="puce pousse">${vals[vals.length - 1]} ${p.u}</span>
        </div>${courbe(vals, p.u)}</div>`;
    }
  }
  if (!out) out = '<div class="carte consigne">Note tes mensurations pour suivre les zones qui comptent : bras, taille, cuisses.</div>';
  return out + '<button class="btn large" id="btn-mesures-add" style="margin-top:8px">Ajouter une mesure</button>';
}

function outilMesures() {
  ouvrirFeuille(`
    <h2 style="font-size:23px;text-transform:uppercase">Ajouter une mesure</h2>
    <p class="consigne">Mesure à froid, toujours au même endroit et au même moment. Laisse vide ce que tu ne mesures pas.</p>
    <div class="grille-2" style="margin-top:14px">
      ${PARTIES.map((p) => `<label class="champ"><span>${p.nom} (${p.u})</span>
        <input type="number" inputmode="decimal" step="0.1" data-mesure="${p.k}"></label>`).join('')}
    </div>
    <button class="btn plein large" id="mesure-ok">Enregistrer</button>`);
  $('#mesure-ok').addEventListener('click', () => {
    const entree = { date: auj() };
    let rempli = false;
    $$('[data-mesure]').forEach((inp) => {
      const v = Number(inp.value);
      if (v > 0) { entree[inp.dataset.mesure] = v; rempli = true; }
    });
    if (!rempli) { toast('Entre au moins une mesure'); return; }
    S.mesures.push(entree);
    if (entree.poids) { S.poids.push({ date: auj(), kg: entree.poids }); S.profil.poids = entree.poids; }
    sauver();
    fermerFeuille();
    toast('Mesure enregistrée');
    if (ecranCourant === 'progres') rendreProgres();
  });
}

/* ---------------- calculateur de plaques ---------------- */

// Disques olympiques, du plus lourd au plus léger, avec leur couleur et leur taille.
const DISQUES = [
  { kg: 25, c: 'var(--rouge)', h: 50 }, { kg: 20, c: 'var(--bleu)', h: 46 }, { kg: 15, c: 'var(--accent)', h: 40 },
  { kg: 10, c: 'var(--vert)', h: 32 }, { kg: 5, c: 'var(--blanc-disque)', h: 24 },
  { kg: 2.5, c: 'var(--rouge)', h: 18 }, { kg: 1.25, c: '#9aa3af', h: 13 },
];

function plaquesParCote(total, barre) {
  let reste = (total - barre) / 2;
  if (reste < -0.01) return null;
  const plaques = [];
  for (const d of DISQUES) while (reste >= d.kg - 1e-9) { plaques.push(d); reste -= d.kg; }
  return { plaques, restant: Math.round(reste * 100) / 100 };
}

function outilPlaques() {
  ouvrirFeuille(`
    <h2 style="font-size:23px;text-transform:uppercase">Calculateur de plaques</h2>
    <p class="consigne">Les disques à enfiler de chaque côté de la barre, aux couleurs officielles.</p>
    <div class="grille-2" style="margin-top:14px">
      <label class="champ"><span>Charge totale (kg)</span>
        <input type="number" inputmode="decimal" step="2.5" id="pl-total" value="60"></label>
      <label class="champ"><span>Barre</span><select id="pl-barre">
        <option value="20">Olympique — 20 kg</option>
        <option value="15">Femme — 15 kg</option>
        <option value="10">Courte / EZ — 10 kg</option>
        <option value="0">Sans barre</option>
      </select></label>
    </div>
    <div id="pl-sortie"></div>
    <div class="section-titre">Convertir</div>
    <div class="grille-2">
      <label class="champ"><span>Kilos</span><input type="number" inputmode="decimal" id="pl-kg" value="60"></label>
      <label class="champ"><span>Livres (lb)</span><input type="number" inputmode="decimal" id="pl-lb" value="132.3"></label>
    </div>`);

  const calc = () => {
    const total = Number($('#pl-total').value) || 0;
    const barre = Number($('#pl-barre').value);
    const box = $('#pl-sortie');
    const r = plaquesParCote(total, barre);
    if (!r) { box.innerHTML = `<div class="carte consigne">La barre seule (${barre} kg) est déjà plus lourde que ${total} kg.</div>`; return; }
    const { plaques, restant } = r;
    const cy = 66;
    let x = 100;
    const pw = 11, gap = 3;
    let disques = '';
    for (const d of plaques) {
      disques += `<rect x="${x}" y="${cy - d.h / 2}" width="${pw}" height="${d.h}" rx="2" fill="${d.c}" stroke="rgba(0,0,0,.28)" stroke-width="1"/>`;
      x += pw + gap;
    }
    const larg = Math.max(300, x + 16);
    const svg = `<svg viewBox="0 0 ${larg} 130" style="width:100%;height:120px;display:block" aria-hidden="true">
      <line x1="18" y1="${cy}" x2="94" y2="${cy}" stroke="var(--texte-faible)" stroke-width="7" stroke-linecap="round"/>
      <rect x="92" y="${cy - 10}" width="8" height="20" rx="2" fill="var(--texte-faible)"/>
      <line x1="100" y1="${cy}" x2="${x + 6}" y2="${cy}" stroke="var(--texte-faible)" stroke-width="4"/>
      ${disques}
    </svg>`;
    const compte = [];
    plaques.forEach((d) => {
      const last = compte[compte.length - 1];
      if (last && last.kg === d.kg) last.n++; else compte.push({ kg: d.kg, n: 1 });
    });
    const resume = compte.length
      ? compte.map((c) => `<span class="puce" style="font-size:13px">${c.n} × ${c.kg} kg</span>`).join(' ')
      : '<span class="consigne">Juste la barre, rien à charger.</span>';
    box.innerHTML = `<div class="carte" style="text-align:center">${svg}
      <div style="margin:4px 0 8px;font-family:var(--display);font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:var(--texte-faible)">de chaque côté</div>
      <div class="rangee" style="flex-wrap:wrap;gap:6px;justify-content:center">${resume}</div>
      ${restant > 0 ? `<div class="consigne" style="margin-top:8px;color:var(--alerte)">Pas atteignable exactement : il manque ${restant} kg par côté avec ces disques.</div>` : ''}
    </div>`;
  };
  $('#pl-total').addEventListener('input', calc);
  $('#pl-barre').addEventListener('change', calc);
  calc();

  const kg = $('#pl-kg'), lb = $('#pl-lb');
  kg.addEventListener('input', () => { lb.value = (Number(kg.value) / 0.45359237).toFixed(1); });
  lb.addEventListener('input', () => { kg.value = (Number(lb.value) * 0.45359237).toFixed(1); });
}

/* ---------------- thème ---------------- */

const ICONES_THEME = {
  sombre: '<circle cx="12" cy="12" r="4.5"/><path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.4 5.6 16.7 7.3M7.3 16.7 5.6 18.4M18.4 18.4 16.7 16.7M7.3 7.3 5.6 5.6"/>',
  clair: '<path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.3 8.3 0 1 0 20 14.5Z"/>',
};

function appliquerTheme() {
  const t = S.reglages.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const sombre = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#icone-theme').innerHTML = sombre ? ICONES_THEME.sombre : ICONES_THEME.clair;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = sombre ? '#14171c' : '#f0efeb';
}

/* ---------------- démarrage ---------------- */

function preparerTete() {
  const tete = document.head;
  const ajouter = (nom, attrs) => {
    const el = document.createElement(nom);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    tete.appendChild(el);
    return el;
  };
  if (!document.querySelector('meta[name="viewport"]')) {
    ajouter('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' });
  }
  if (!document.querySelector('meta[name="theme-color"]')) ajouter('meta', { name: 'theme-color', content: '#14171c' });
  ajouter('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  ajouter('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  ajouter('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
  ajouter('meta', { name: 'apple-mobile-web-app-title', content: 'Fonte' });

  // Icône : un disque olympique, dessiné en SVG et embarqué dans la page.
  const icone = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#14171c"/>
    <circle cx="32" cy="32" r="19" fill="none" stroke="#f2c230" stroke-width="9"/>
    <circle cx="32" cy="32" r="6" fill="none" stroke="#f2c230" stroke-width="3"/></svg>`;
  const url = 'data:image/svg+xml,' + encodeURIComponent(icone);
  if (!document.querySelector('link[rel="icon"]')) ajouter('link', { rel: 'icon', href: url });
  if (!document.querySelector('link[rel="apple-touch-icon"]')) ajouter('link', { rel: 'apple-touch-icon', href: url });

  const manifeste = {
    name: 'Fonte — carnet de salle', short_name: 'Fonte', start_url: location.href,
    display: 'standalone', background_color: '#14171c', theme_color: '#14171c',
    icons: [{ src: url, sizes: '512x512', type: 'image/svg+xml', purpose: 'any' }],
  };
  if (!document.querySelector('link[rel="manifest"]')) {
    try {
      ajouter('link', { rel: 'manifest', href: 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(manifeste)) });
    } catch (e) { /* certains navigateurs refusent les manifestes en data: */ }
  }

  // Hors ligne complet quand la page est servie en https (GitHub Pages).
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* pas grave : l'app marche quand même */ });
  }
}

function demarrer() {
  preparerTete();
  appliquerTheme();

  $$('#nav button').forEach((b) => b.addEventListener('click', () => va(b.dataset.va)));
  $('#btn-theme').addEventListener('click', () => {
    const suite = { auto: 'light', light: 'dark', dark: 'auto' };
    S.reglages.theme = suite[S.reglages.theme] || 'auto';
    sauver();
    appliquerTheme();
    toast('Thème : ' + ({ auto: 'automatique', light: 'clair', dark: 'sombre' })[S.reglages.theme]);
  });
  $('#feuille').addEventListener('click', (ev) => { if (ev.target.id === 'feuille') fermerFeuille(); });
  $('#repos-passer').addEventListener('click', arreterRepos);
  $('#repos-plus').addEventListener('click', () => { repos.reste += 30; repos.total = Math.max(repos.total, repos.reste); majRepos(); });
  $('#repos-moins').addEventListener('click', () => { repos.reste = Math.max(1, repos.reste - 30); majRepos(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', appliquerTheme);

  // Le chrono de repos continue de tourner quand l'écran s'éteint.
  document.addEventListener('visibilitychange', () => { if (!document.hidden && repos.timer) majRepos(); });

  va(S.profil && S.programme ? 'accueil' : 'debut');
}

demarrer();
