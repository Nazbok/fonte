/* Vérifie la logique métier hors navigateur : programmes générés, prescriptions,
   progression. Usage : node test-logique.js */
const fs = require('fs');
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.structuredClone = globalThis.structuredClone || ((o) => JSON.parse(JSON.stringify(o)));

const app = fs.readFileSync('src/05-app.js', 'utf8').replace(/\ndemarrer\(\);\s*$/, '');
const ctx = new Function(
  fs.readFileSync('src/03-donnees.js', 'utf8') + app +
  '\nreturn { EXOS, PAR_ID, OBJECTIFS, MATERIELS, NIVEAUX, genererProgramme, prescrire, dureeEstimee, conseilCharge, decoupage, silhouette, courbe, S };'
)();

let echecs = 0;
const verifie = (nom, cond, info = '') => {
  if (!cond) { echecs++; console.log('  ✗ ' + nom + (info ? ' — ' + info : '')); }
};

console.log('Programmes générés\n');
for (const objectif of Object.keys(ctx.OBJECTIFS)) {
  for (const materiel of Object.keys(ctx.MATERIELS)) {
    for (const jours of [2, 3, 4, 5, 6]) {
      for (const niveau of Object.keys(ctx.NIVEAUX)) {
        const profil = { objectif, niveau, jours, materiel, poids: 75, taille: 178, age: 28, sexe: 'h' };
        const prog = ctx.genererProgramme(profil);
        const etiquette = `${objectif}/${materiel}/${jours}j/${niveau}`;
        verifie(etiquette + ' : nombre de séances', prog.length === (jours <= 2 ? 2 : jours), 'a ' + prog.length);
        for (const s of prog) {
          verifie(etiquette + ' ' + s.nom + ' : assez d\'exercices', s.exos.length >= 4, s.exos.length + ' exercices');
          verifie(etiquette + ' ' + s.nom + ' : pas de doublon',
            new Set(s.exos.map((e) => e.id)).size === s.exos.length);
          for (const p of s.exos) {
            const exo = ctx.PAR_ID[p.id];
            verifie(etiquette + ' : matériel respecté ' + p.id, ctx.MATERIELS[materiel].ok.includes(exo.mat), exo.mat);
            verifie(etiquette + ' : séries plausibles ' + p.id, p.series >= 2 && p.series <= 6, String(p.series));
            verifie(etiquette + ' : reps plausibles ' + p.id, p.reps[0] > 0 && p.reps[1] >= p.reps[0]);
            verifie(etiquette + ' : repos plausible ' + p.id, p.repos >= 30 && p.repos <= 240);
          }
          const d = ctx.dureeEstimee(s);
          verifie(etiquette + ' ' + s.nom + ' : durée réaliste', d >= 25 && d <= 110, d + ' min');
        }
      }
    }
  }
}

// Aperçu lisible de trois cas.
for (const cas of [
  { objectif: 'masse', niveau: 'intermediaire', jours: 4, materiel: 'salle' },
  { objectif: 'seche', niveau: 'debutant', jours: 3, materiel: 'maison' },
  { objectif: 'force', niveau: 'avance', jours: 5, materiel: 'halteres' },
]) {
  const prog = ctx.genererProgramme({ ...cas, poids: 80, taille: 180, age: 30, sexe: 'h' });
  console.log(`— ${ctx.OBJECTIFS[cas.objectif].nom}, ${cas.jours} j/sem, ${ctx.MATERIELS[cas.materiel].nom} (${cas.niveau})`);
  prog.forEach((s) => {
    console.log(`   ${s.nom} (${ctx.dureeEstimee(s)} min) : ` +
      s.exos.map((p) => `${ctx.PAR_ID[p.id].nom} ${p.series}×${p.reps[0]}-${p.reps[1]}`).join(' · '));
  });
  console.log('');
}

// Progression : le double progressif doit proposer de monter quand tout est au maximum.
ctx.S.journal = [{ date: '2026-07-01', cle: 'x', nom: 'test', duree: 60,
  exos: [{ id: 'developpe-couche', series: [{ kg: 60, reps: 12 }, { kg: 60, reps: 12 }, { kg: 60, reps: 12 }] }] }];
const c1 = ctx.conseilCharge('developpe-couche', { series: 3, reps: [8, 12] });
verifie('progression : propose de monter', c1.monter === true && c1.kg === 62.5, JSON.stringify(c1));
ctx.S.journal[0].exos[0].series[2].reps = 9;
const c2 = ctx.conseilCharge('developpe-couche', { series: 3, reps: [8, 12] });
verifie('progression : ne monte pas trop tôt', c2.monter === false, JSON.stringify(c2));
console.log('Progression : ' + c1.texte);
console.log('              ' + c2.texte + '\n');

// Rendus purs
verifie('silhouette produit du SVG', ctx.silhouette(ctx.PAR_ID['squat'], 'face').startsWith('<svg'));
verifie('courbe produit du SVG', ctx.courbe([70, 72, 71, 74], 'kg').includes('<path'));

console.log(echecs ? `\n${echecs} problème(s)` : '\nTout est cohérent : 225 programmes vérifiés.');
process.exit(echecs ? 1 : 0);
