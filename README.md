# Fonte 🏋️

Carnet de salle pour téléphone. Une page web autonome : programme généré selon
ton objectif, séances guidées avec chrono de repos, suivi des charges, et
41 exercices dessinés **et animés** — pas des images, un moteur de cinématique.

## Installer sur le téléphone

1. Ouvre `fonte.html` (ou le lien de l'artifact) dans Chrome.
2. Menu ⋮ → **Ajouter à l'écran d'accueil**.
3. Elle se lance en plein écran, avec son icône, et fonctionne hors ligne.

Tout est stocké dans le téléphone (`localStorage`) : rien ne part sur un serveur.
Pense à **Réglages → Exporter** de temps en temps.

## Ce qu'elle fait

- **Questionnaire de départ** : objectif (prise de masse, perte de gras, force,
  endurance, remise en forme), niveau, séances par semaine, matériel disponible.
- **Programme** adapté : découpage full body / haut-bas / push-pull-legs selon
  la fréquence, séries, répétitions et repos calés sur l'objectif.
- **Séance guidée** : un exercice à la fois, saisie charge × répétitions,
  validation série par série, chrono de repos automatique (bip + vibration).
- **Progression** : la règle du double progressif — quand tu tiens le haut de la
  fourchette sur toutes les séries, l'app te dit d'ajouter 2,5 ou 5 kg.
- **Suivi** : volume par semaine, courbe de charge par exercice, records et maxi
  estimé (Epley), poids de corps, historique des séances.
- **Outils** : calcul du maxi et des charges de travail, chronomètre,
  estimation calories/protéines (Mifflin-St Jeor), suivi du poids.

## Le moteur de dessin

`src/04-dessin.js` — un squelette articulé (bassin, torse, bras, jambes) dont
chaque exercice ne définit que **deux poses**, en angles. L'app interpole entre
les deux, ajoute la charge (barre, haltères, câble, pile de la machine) calculée
à partir de la position des mains, et le décor (banc, poulie, barres parallèles).

Convention des angles : 0° = vers la droite, 90° = vers le haut, −90° = vers le
bas. Le cadre fait 200 × 170, le sol est à y = 150.

## Développer

```bash
./build.sh                 # assemble src/ → app.html + fonte.html, vérifie la syntaxe
node test-logique.js       # vérifie les 225 combinaisons de programmes possibles
node planche.js > p.svg    # planche de contrôle de tous les exercices
node planche.js squat,dips > p.svg   # ou seulement certains
```

`src/` contient dans l'ordre d'assemblage : `01-style.html`, `02-corps.html`,
`03-donnees.js` (catalogue, objectifs, découpages), `04-dessin.js` (le moteur),
`05-app.js` (état, programme, séance, progression).
