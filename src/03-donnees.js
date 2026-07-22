/* ------------------------------------------------------------------
   Le catalogue.

   `mat` = matériel minimum : maison ⊂ halteres ⊂ salle.
   `poses` = les deux extrémités du mouvement (voir 04-dessin.js).
------------------------------------------------------------------ */

// Positions de départ réutilisées d'un exercice à l'autre.
const DEBOUT   = { x: 100, y: 97,  torse: 90, cuisse: -90, mollet: -90, pied: 0 };
const COUCHE   = { x: 86,  y: 107, torse: 0,  cuisse: 205, mollet: -80, pied: -20 };
const ASSIS    = { x: 100, y: 122, torse: 88, cuisse: 0,   mollet: -90, pied: 10 };
const INCLINE  = { x: 78,  y: 116, torse: 20, cuisse: 200, mollet: -80, pied: 0 };
const PENCHE   = { x: 104, y: 100, torse: 40, cuisse: -95, mollet: -88, pied: 0 };
const SUSPENDU = { x: 100, y: 92,  torse: 90, cuisse: -85, mollet: -92, pied: -10 };

const EXOS = [
  /* ---------------- pectoraux ---------------- */
  {
    id: 'developpe-couche', nom: 'Développé couché', mat: 'salle',
    pattern: 'pousse-h', compose: true, pas: 2.5, decor: 'banc', charge: 'barre',
    groupes: { p: ['pecs'], s: ['triceps', 'epaules'] },
    poses: [
      { ...COUCHE, bras: 152, avant: -6 },
      { ...COUCHE, bras: 78,  avant: 96 },
    ],
    consigne: 'Omoplates serrées et plaquées au banc, pieds ancrés au sol. Descends la barre au bas des pectoraux en contrôlant, puis pousse.',
    erreur: 'Rebondir la barre sur la poitrine, ou décoller les fesses du banc.',
  },
  {
    id: 'developpe-incline', nom: 'Développé incliné', mat: 'halteres',
    pattern: 'pousse-h', compose: true, pas: 2, decor: 'banc-incline', charge: 'halteres',
    groupes: { p: ['pecs'], s: ['epaules', 'triceps'] },
    poses: [
      { ...INCLINE, bras: 150, avant: 22 },
      { ...INCLINE, bras: 105, avant: 110 },
    ],
    consigne: 'Banc à 30°, pas plus : au-delà ce sont les épaules qui travaillent. Coudes à 45° du buste.',
    erreur: 'Cogner les haltères en haut et relâcher la tension.',
  },
  {
    id: 'ecarte-poulie', nom: 'Écarté à la poulie', mat: 'salle',
    pattern: 'iso-pec', pas: 2.5, decor: 'poulies', charge: 'poignee-double',
    groupes: { p: ['pecs'], s: ['epaules'] },
    poses: [
      { ...DEBOUT, torse: 90, bras: 12, avant: 4, bras2: 168, avant2: 176, cuisse: -98, mollet: -92, cuisse2: -82, mollet2: -88 },
      { ...DEBOUT, torse: 90, bras: -60, avant: -80, bras2: 240, avant2: 260, cuisse: -98, mollet: -92, cuisse2: -82, mollet2: -88 },
    ],
    consigne: 'Un pas en avant, buste légèrement penché. Coudes à peine fléchis, fixes : seules les épaules bougent.',
    erreur: 'Plier les bras et transformer l\'écarté en développé.',
  },
  {
    id: 'pompes', nom: 'Pompes', mat: 'maison',
    pattern: 'pousse-h', compose: true, corps: true, decor: 'sol', charge: 'corps',
    groupes: { p: ['pecs'], s: ['triceps', 'epaules', 'abdos'] },
    poses: [
      { x: 100, y: 136, torse: 12, bras: -134, avant: -16, cuisse: 196, mollet: 194, pied: -70 },
      { x: 100, y: 124, torse: 18, bras: -52, avant: -111, cuisse: 200, mollet: 198, pied: -70 },
    ],
    consigne: 'Corps gainé d\'une seule pièce, mains sous les épaules. Descends jusqu\'à frôler le sol.',
    erreur: 'Laisser les hanches s\'affaisser ou pointer les fesses vers le haut.',
  },
  {
    id: 'dips', nom: 'Dips', mat: 'salle',
    pattern: 'pousse-v', compose: true, corps: true, decor: 'cadre', charge: 'corps',
    groupes: { p: ['pecs', 'triceps'], s: ['epaules'] },
    poses: [
      { x: 100, y: 114, torse: 96, bras: -150, avant: -35, cuisse: -100, mollet: 200, pied: 250 },
      { x: 100, y: 93,  torse: 92, bras: -90,  avant: -90, cuisse: -100, mollet: 200, pied: 250 },
    ],
    consigne: 'Buste légèrement penché en avant pour les pectoraux, vertical pour les triceps. Descends jusqu\'à l\'horizontale des bras.',
    erreur: 'Descendre trop bas et forcer sur les épaules.',
  },

  /* ---------------- dos ---------------- */
  {
    id: 'traction', nom: 'Tractions', mat: 'salle',
    pattern: 'tire-v', compose: true, corps: true, decor: 'barre-fixe', charge: 'barre-fixe',
    groupes: { p: ['dorsaux'], s: ['biceps', 'trapezes'] },
    poses: [
      { x: 100, y: 101, torse: 90, bras: 60, avant: 75, bras2: 120, avant2: 105, cuisse: -80, mollet: -130, cuisse2: -88, mollet2: -124, pied: -20 },
      { x: 100, y: 81, torse: 90, bras: 20, avant: 120, bras2: 160, avant2: 60, cuisse: -80, mollet: -130, cuisse2: -88, mollet2: -124, pied: -20 },
    ],
    consigne: 'Pars bras tendus, tire les coudes vers les hanches en sortant la poitrine. Menton au-dessus de la barre.',
    erreur: 'Se balancer pour s\'aider et écourter l\'amplitude.',
  },
  {
    id: 'tirage-vertical', nom: 'Tirage vertical', mat: 'salle',
    pattern: 'tire-v', compose: true, pas: 5, decor: 'poulie-haute', charge: 'poignee',
    groupes: { p: ['dorsaux'], s: ['biceps'] },
    poses: [
      { ...ASSIS, torse: 96, bras: 66, avant: 70 },
      { ...ASSIS, torse: 102, bras: 6, avant: 128 },
    ],
    consigne: 'Cuisses bloquées, léger recul du buste. Amène la barre à la clavicule, coudes vers le bas.',
    erreur: 'Tirer derrière la nuque, inutile et risqué pour les épaules.',
  },
  {
    id: 'rowing-barre', nom: 'Rowing barre', mat: 'salle',
    pattern: 'tire-h', compose: true, pas: 2.5, decor: 'sol', charge: 'barre',
    groupes: { p: ['dorsaux'], s: ['biceps', 'lombaires', 'trapezes'] },
    poses: [
      { ...PENCHE, bras: -88, avant: -92 },
      { ...PENCHE, bras: -140, avant: -30 },
    ],
    consigne: 'Buste à 45°, dos plat, genoux légèrement fléchis. Tire la barre vers le nombril.',
    erreur: 'Arrondir le bas du dos ou se redresser à chaque répétition.',
  },
  {
    id: 'rowing-haltere', nom: 'Rowing haltère', mat: 'halteres',
    pattern: 'tire-h', compose: true, unilateral: true, pas: 2, decor: 'banc', charge: 'haltere-un',
    groupes: { p: ['dorsaux'], s: ['biceps', 'epaules-arr'] },
    poses: [
      { x: 104, y: 96, torse: 30, bras: -88, avant: -90, cuisse: -95, mollet: -88, pied: 0 },
      { x: 104, y: 96, torse: 30, bras: -150, avant: -24, cuisse: -95, mollet: -88, pied: 0 },
    ],
    consigne: 'Un genou et une main sur le banc, dos parallèle au sol. Tire le coude vers la hanche.',
    erreur: 'Tourner le buste pour arracher la charge.',
  },
  {
    id: 'tirage-horizontal', nom: 'Tirage horizontal', mat: 'salle',
    pattern: 'tire-h', compose: true, pas: 5, decor: 'poulie-basse', charge: 'poignee',
    groupes: { p: ['dorsaux'], s: ['biceps', 'trapezes'] },
    poses: [
      { ...ASSIS, torse: 74, bras: -14, avant: -8 },
      { ...ASSIS, torse: 94, bras: -150, avant: -18 },
    ],
    consigne: 'Buste droit, tire la poignée au niveau du nombril en serrant les omoplates.',
    erreur: 'Se balancer d\'avant en arrière avec tout le buste.',
  },
  {
    id: 'souleve-de-terre', nom: 'Soulevé de terre', mat: 'salle',
    pattern: 'hinge', compose: true, pas: 5, decor: 'sol', charge: 'barre',
    groupes: { p: ['ischios', 'fessiers', 'lombaires'], s: ['dorsaux', 'trapezes', 'quadriceps'] },
    poses: [
      { x: 88, y: 120, torse: 40, bras: -88, avant: -90, cuisse: -17, mollet: -122, pied: 0 },
      { ...DEBOUT, bras: -88, avant: -90 },
    ],
    consigne: 'Barre contre les tibias, dos plat, poitrine haute. Pousse le sol avec les jambes puis verrouille les hanches.',
    erreur: 'Tirer avec le bas du dos arrondi — c\'est là que ça casse.',
  },

  {
    id: 'goblet-squat', nom: 'Goblet squat', mat: 'halteres',
    pattern: 'squat', compose: true, pas: 2, decor: 'sol', charge: 'haltere-un',
    groupes: { p: ['quadriceps', 'fessiers'], s: ['abdos', 'adducteurs'] },
    poses: [
      { x: 100, y: 122, torse: 74, bras: 130, avant: 30, cuisse: -160, mollet: -48, pied: 0 },
      { ...DEBOUT, bras: 130, avant: 30 },
    ],
    consigne: 'Haltère tenu contre la poitrine, coudes qui glissent entre les genoux. Le contrepoids devant t\'aide à rester droit.',
    erreur: 'Laisser l\'haltère s\'éloigner du buste.',
  },
  {
    id: 'rowing-halteres', nom: 'Rowing deux haltères', mat: 'halteres',
    pattern: 'tire-h', compose: true, pas: 2, decor: 'sol', charge: 'halteres',
    groupes: { p: ['dorsaux'], s: ['biceps', 'epaules-arr', 'lombaires'] },
    poses: [
      { ...PENCHE, torse: 36, bras: -88, avant: -92 },
      { ...PENCHE, torse: 36, bras: -142, avant: -28 },
    ],
    consigne: 'Buste penché à 45°, dos plat. Tire les deux haltères vers les hanches, coudes serrés.',
    erreur: 'Se redresser au fil des répétitions jusqu\'à être presque debout.',
  },
  /* ---------------- épaules ---------------- */
  {
    id: 'developpe-militaire', nom: 'Développé militaire', mat: 'halteres',
    pattern: 'pousse-v', compose: true, pas: 2, decor: 'banc-assis', charge: 'halteres',
    groupes: { p: ['epaules'], s: ['triceps', 'trapezes'] },
    poses: [
      { ...ASSIS, bras: 140, avant: 60 },
      { ...ASSIS, bras: 96,  avant: 92 },
    ],
    consigne: 'Gainage serré, côtes basses. Monte jusqu\'à bras tendus sans cambrer le bas du dos.',
    erreur: 'Cambrer et transformer le mouvement en développé incliné.',
  },
  {
    id: 'elevations-laterales', nom: 'Élévations latérales', mat: 'halteres',
    pattern: 'iso-epaule', pas: 1, decor: 'sol', charge: 'halteres',
    groupes: { p: ['epaules'], s: ['trapezes'] },
    poses: [
      { ...DEBOUT, torse: 88, bras: -84, avant: -88 },
      { ...DEBOUT, torse: 88, bras: -8,  avant: -14 },
    ],
    consigne: 'Léger, vraiment. Monte jusqu\'à l\'horizontale, coudes à peine fléchis, comme si tu versais une carafe.',
    erreur: 'Balancer le buste et monter au-dessus de l\'épaule.',
  },
  {
    id: 'oiseau', nom: 'Oiseau', mat: 'halteres',
    pattern: 'iso-epaule', pas: 1, decor: 'sol', charge: 'halteres',
    groupes: { p: ['epaules-arr'], s: ['trapezes', 'dorsaux'] },
    poses: [
      { ...PENCHE, torse: 34, bras: -86, avant: -90 },
      { ...PENCHE, torse: 34, bras: -6, avant: -10 },
    ],
    consigne: 'Buste penché presque à l\'horizontale, bras qui s\'ouvrent sur les côtés. Les épaules arrière, personne ne les travaille assez.',
    erreur: 'Se redresser progressivement pour aider avec le dos.',
  },
  {
    id: 'face-pull', nom: 'Face pull', mat: 'salle',
    pattern: 'iso-epaule', pas: 2.5, decor: 'poulie-haute', charge: 'poignee',
    groupes: { p: ['epaules-arr'], s: ['trapezes'] },
    poses: [
      { ...DEBOUT, torse: 92, bras: 16, avant: 10 },
      { ...DEBOUT, torse: 92, bras: 150, avant: 44 },
    ],
    consigne: 'Corde à hauteur du visage, tire vers le front en écartant les mains. Le meilleur exercice pour des épaules qui durent.',
    erreur: 'Trop lourd : les coudes tombent et les trapèzes prennent tout.',
  },

  /* ---------------- bras ---------------- */
  {
    id: 'curl-barre', nom: 'Curl barre', mat: 'halteres',
    pattern: 'iso-biceps', pas: 2, decor: 'sol', charge: 'barre',
    groupes: { p: ['biceps'], s: ['avant-bras'] },
    poses: [
      { ...DEBOUT, bras: -86, avant: -88 },
      { ...DEBOUT, bras: -74, avant: 24 },
    ],
    consigne: 'Coudes collés au buste, ils ne bougent pas. Monte jusqu\'à la contraction, redescends en freinant.',
    erreur: 'Reculer les coudes et balancer le dos pour lancer la barre.',
  },
  {
    id: 'curl-marteau', nom: 'Curl marteau', mat: 'halteres',
    pattern: 'iso-biceps', pas: 1, decor: 'sol', charge: 'halteres',
    groupes: { p: ['biceps', 'avant-bras'], s: [] },
    poses: [
      { ...DEBOUT, bras: -86, avant: -90 },
      { ...DEBOUT, bras: -78, avant: 20 },
    ],
    consigne: 'Prise neutre, pouces vers le haut. Cible le brachial : c\'est lui qui donne l\'épaisseur au bras.',
    erreur: 'Monter trop haut jusqu\'à ce que le biceps se relâche.',
  },
  {
    id: 'extension-triceps', nom: 'Extension triceps', mat: 'salle',
    pattern: 'iso-triceps', pas: 2.5, decor: 'poulie-haute', charge: 'poignee',
    groupes: { p: ['triceps'], s: [] },
    poses: [
      { ...DEBOUT, torse: 92, bras: -70, avant: 40 },
      { ...DEBOUT, torse: 92, bras: -78, avant: -84 },
    ],
    consigne: 'Coudes verrouillés le long du corps. Seuls les avant-bras descendent, jusqu\'à l\'extension complète.',
    erreur: 'Ouvrir les coudes vers l\'avant et pousser avec les épaules.',
  },
  {
    id: 'barre-au-front', nom: 'Barre au front', mat: 'halteres',
    pattern: 'iso-triceps', pas: 2, decor: 'banc', charge: 'barre',
    groupes: { p: ['triceps'], s: [] },
    poses: [
      { ...COUCHE, bras: 108, avant: 168 },
      { ...COUCHE, bras: 92,  avant: 88 },
    ],
    consigne: 'Coudes fixes pointés vers le plafond, seuls les avant-bras bougent. Descends la barre vers le front.',
    erreur: 'Laisser les coudes s\'écarter et pousser comme un développé.',
  },
  {
    id: 'dips-banc', nom: 'Dips sur banc', mat: 'maison',
    pattern: 'iso-triceps', corps: true, decor: 'banc', charge: 'corps',
    groupes: { p: ['triceps'], s: ['pecs', 'epaules'] },
    poses: [
      { x: 108, y: 138, torse: 95, bras: 20, avant: -47, cuisse: 190, mollet: 195, pied: -60 },
      { x: 112, y: 124, torse: 95, bras: -8, avant: -64, cuisse: 190, mollet: 195, pied: -60 },
    ],
    consigne: 'Mains sur le banc derrière toi, dos qui frôle le banc. Descends jusqu\'à 90° au coude.',
    erreur: 'S\'éloigner du banc : les épaules encaissent tout.',
  },

  /* ---------------- jambes ---------------- */
  {
    id: 'squat', nom: 'Squat barre', mat: 'salle',
    pattern: 'squat', compose: true, pas: 5, decor: 'sol', charge: 'barre',
    groupes: { p: ['quadriceps', 'fessiers'], s: ['abdos', 'lombaires', 'adducteurs'] },
    poses: [
      { x: 100, y: 122, torse: 62, bras: 140, avant: 30, cuisse: -160, mollet: -48, pied: 0 },
      { ...DEBOUT, bras: 140, avant: 30 },
    ],
    consigne: 'Barre sur les trapèzes, pieds largeur d\'épaules. Descends hanches en arrière jusqu\'à la cuisse parallèle, talons ancrés.',
    erreur: 'Décoller les talons ou laisser les genoux rentrer vers l\'intérieur.',
  },
  {
    id: 'presse-cuisses', nom: 'Presse à cuisses', mat: 'salle',
    pattern: 'squat', compose: true, pas: 10, decor: 'presse', charge: 'pile',
    groupes: { p: ['quadriceps', 'fessiers'], s: ['ischios'] },
    poses: [
      { x: 76, y: 112, torse: 195, bras: 250, avant: 300, cuisse: 45, mollet: -16, cuisse2: 52, mollet2: -10, pied: 80 },
      { x: 76, y: 112, torse: 195, bras: 250, avant: 300, cuisse: 25, mollet: 10, cuisse2: 30, mollet2: 16, pied: 100 },
    ],
    consigne: 'Dos et bassin bien plaqués. Descends jusqu\'à 90° au genou sans que le bas du dos décolle.',
    erreur: 'Verrouiller violemment les genoux en fin de poussée.',
  },
  {
    id: 'fentes', nom: 'Fentes', mat: 'halteres',
    pattern: 'fente', compose: true, unilateral: true, pas: 2, decor: 'sol', charge: 'halteres',
    groupes: { p: ['quadriceps', 'fessiers'], s: ['ischios', 'abdos'] },
    poses: [
      { x: 100, y: 112, torse: 86, bras: -86, avant: -90, cuisse: -27, mollet: -81, cuisse2: -129, mollet2: -145, pied: 0, pied2: -60 },
      { ...DEBOUT, bras: -86, avant: -90 },
    ],
    consigne: 'Grand pas en avant, buste droit, genou arrière qui descend vers le sol. Pousse sur le talon avant pour remonter.',
    erreur: 'Genou avant qui dépasse largement la pointe du pied.',
  },
  {
    id: 'souleve-roumain', nom: 'Soulevé de terre roumain', mat: 'halteres',
    pattern: 'hinge', compose: true, pas: 2.5, decor: 'sol', charge: 'barre',
    groupes: { p: ['ischios', 'fessiers'], s: ['lombaires'] },
    poses: [
      { x: 100, y: 100, torse: 24, bras: -84, avant: -88, cuisse: -96, mollet: -86, pied: 0 },
      { ...DEBOUT, bras: -86, avant: -90 },
    ],
    consigne: 'Jambes quasi tendues, hanches qui reculent, barre qui frôle les cuisses. Tu dois sentir l\'étirement à l\'arrière des cuisses.',
    erreur: 'Plier les genoux pour descendre plus bas : ce n\'est plus le même exercice.',
  },
  {
    id: 'leg-extension', nom: 'Leg extension', mat: 'salle',
    pattern: 'iso-quad', pas: 5, decor: 'machine', charge: 'pile',
    groupes: { p: ['quadriceps'], s: [] },
    poses: [
      { ...ASSIS, torse: 96, bras: -60, avant: -110, cuisse: 0, mollet: -88 },
      { ...ASSIS, torse: 96, bras: -60, avant: -110, cuisse: 0, mollet: -4 },
    ],
    consigne: 'Marque une seconde en haut, contraction complète. Redescends lentement sans lâcher la charge.',
    erreur: 'Lancer la charge par à-coups avec le bassin qui décolle.',
  },
  {
    id: 'leg-curl', nom: 'Leg curl', mat: 'salle',
    pattern: 'iso-ischio', pas: 5, decor: 'machine', charge: 'pile',
    groupes: { p: ['ischios'], s: ['mollets'] },
    poses: [
      { x: 100, y: 128, torse: 6, bras: -40, avant: -80, cuisse: 186, mollet: 184, pied: -60 },
      { x: 100, y: 128, torse: 6, bras: -40, avant: -80, cuisse: 186, mollet: 250, pied: -20 },
    ],
    consigne: 'Bassin plaqué, amène les talons vers les fesses. Contrôle la descente, c\'est là que tout se joue.',
    erreur: 'Décoller les hanches pour aider avec le bas du dos.',
  },
  {
    id: 'mollets-debout', nom: 'Mollets debout', mat: 'maison',
    pattern: 'iso-mollet', pas: 5, decor: 'sol', charge: 'halteres',
    groupes: { p: ['mollets'], s: [] },
    poses: [
      { ...DEBOUT, bras: -88, avant: -90 },
      { ...DEBOUT, y: 88, bras: -88, avant: -90, pied: -30 },
    ],
    consigne: 'Amplitude complète : talon bas en étirement, puis le plus haut possible sur la pointe. Une seconde en haut.',
    erreur: 'Faire de petits rebonds sans amplitude.',
  },
  {
    id: 'hip-thrust', nom: 'Hip thrust', mat: 'salle',
    pattern: 'hinge', compose: true, pas: 5, decor: 'banc', charge: 'barre',
    groupes: { p: ['fessiers'], s: ['ischios', 'abdos'] },
    poses: [
      { x: 96, y: 138, torse: 22, bras: -50, avant: -100, cuisse: -30, mollet: -120, pied: -20 },
      { x: 96, y: 116, torse: 4,  bras: -50, avant: -100, cuisse: -34, mollet: -128, pied: -20 },
    ],
    consigne: 'Haut du dos appuyé sur le banc, menton rentré. Monte jusqu\'à ce que le buste soit parallèle au sol, serre les fessiers.',
    erreur: 'Cambrer le bas du dos au lieu de finir avec les fessiers.',
  },

  /* ---------------- tronc ---------------- */
  {
    id: 'gainage', nom: 'Gainage', mat: 'maison',
    pattern: 'gainage', temps: true, corps: true, decor: 'sol', charge: 'corps',
    groupes: { p: ['abdos'], s: ['obliques', 'lombaires', 'epaules'] },
    poses: [
      { x: 95, y: 134, torse: 10, bras: -97, avant: 0, cuisse: 190, mollet: 188, pied: -60 },
      { x: 95, y: 132, torse: 11, bras: -95, avant: 0, cuisse: 190, mollet: 188, pied: -60 },
    ],
    consigne: 'Coudes sous les épaules, corps en ligne droite. Serre les fessiers et rentre les côtes : la position doit être dure tout de suite.',
    erreur: 'Tenir cinq minutes en laissant le bassin s\'affaisser. Mieux vaut 40 s parfaites.',
  },
  {
    id: 'crunch', nom: 'Crunch', mat: 'maison',
    pattern: 'abdos', corps: true, decor: 'sol', charge: 'corps',
    groupes: { p: ['abdos'], s: [] },
    poses: [
      { x: 86, y: 142, torse: 8, bras: 100, avant: -20, cuisse: 150, mollet: -110, pied: -10 },
      { x: 86, y: 142, torse: 38, bras: 90, avant: -30, cuisse: 150, mollet: -110, pied: -10 },
    ],
    consigne: 'Décolle seulement les omoplates en enroulant le buste. Souffle en montant, pas de traction sur la nuque.',
    erreur: 'Tirer sur la tête avec les mains et monter le buste entier.',
  },
  {
    id: 'releve-jambes', nom: 'Relevé de jambes', mat: 'maison',
    pattern: 'abdos', corps: true, decor: 'sol', charge: 'corps',
    groupes: { p: ['abdos'], s: ['obliques'] },
    poses: [
      { x: 80, y: 142, torse: 5, bras: 180, avant: 180, cuisse: 185, mollet: 185, pied: -30 },
      { x: 80, y: 142, torse: 5, bras: 180, avant: 180, cuisse: 100, mollet: 95, pied: 20 },
    ],
    consigne: 'Bas du dos collé au sol, jambes tendues qui montent à la verticale. Descends sans laisser le dos se creuser.',
    erreur: 'Descendre trop bas et décoller les lombaires du sol.',
  },
  {
    id: 'mountain-climber', nom: 'Mountain climber', mat: 'maison',
    pattern: 'abdos', temps: true, corps: true, decor: 'sol', charge: 'corps',
    groupes: { p: ['abdos'], s: ['epaules', 'quadriceps'] }, duree: 1.1,
    poses: [
      { x: 100, y: 126, torse: 18, bras: -55, avant: -125, cuisse: 200, mollet: 198, cuisse2: 250, mollet2: 300, pied: -70 },
      { x: 100, y: 126, torse: 18, bras: -55, avant: -125, cuisse: 250, mollet: 300, cuisse2: 200, mollet2: 198, pied: -70 },
    ],
    consigne: 'Position de pompe, ramène alternativement un genou vers la poitrine. Le bassin reste bas et stable.',
    erreur: 'Monter les fesses à chaque alternance.',
  },

  {
    id: 'squat-corps', nom: 'Squat au poids du corps', mat: 'maison',
    pattern: 'squat', compose: true, corps: true, decor: 'sol', charge: 'corps',
    groupes: { p: ['quadriceps', 'fessiers'], s: ['abdos', 'adducteurs'] },
    poses: [
      { x: 100, y: 122, torse: 70, bras: 4, avant: 0, cuisse: -160, mollet: -48, pied: 0 },
      { ...DEBOUT, bras: 4, avant: 0 },
    ],
    consigne: 'Pieds largeur d\'épaules, bras tendus devant pour l\'équilibre. Descends hanches en arrière, poitrine haute, talons au sol.',
    erreur: 'Descendre en arrondissant le bas du dos sur la fin du mouvement.',
  },
  {
    id: 'fente-corps', nom: 'Fentes au poids du corps', mat: 'maison',
    pattern: 'fente', compose: true, corps: true, unilateral: true, decor: 'sol', charge: 'corps',
    groupes: { p: ['quadriceps', 'fessiers'], s: ['ischios', 'abdos'] },
    poses: [
      { x: 100, y: 112, torse: 86, bras: -70, avant: -100, cuisse: -27, mollet: -81, cuisse2: -129, mollet2: -145, pied: 0, pied2: -60 },
      { ...DEBOUT, bras: -70, avant: -100 },
    ],
    consigne: 'Mains aux hanches, grand pas en avant, genou arrière vers le sol. Pousse sur le talon avant pour revenir.',
    erreur: 'Pencher le buste en avant et perdre l\'équilibre.',
  },
  {
    id: 'pont-fessier', nom: 'Pont fessier', mat: 'maison',
    pattern: 'hinge', corps: true, decor: 'sol', charge: 'corps',
    groupes: { p: ['fessiers'], s: ['ischios', 'lombaires', 'abdos'] },
    poses: [
      { x: 100, y: 144, torse: 5, bras: 185, avant: 182, cuisse: 150, mollet: -105, pied: -10 },
      { x: 100, y: 128, torse: -14, bras: 190, avant: 186, cuisse: 172, mollet: -72, pied: -10 },
    ],
    consigne: 'Dos au sol, talons près des fesses. Monte le bassin en serrant les fessiers, marque une seconde en haut.',
    erreur: 'Pousser avec le bas du dos au lieu des fessiers.',
  },
  {
    id: 'superman', nom: 'Superman', mat: 'maison',
    pattern: 'gainage', temps: true, corps: true, decor: 'sol', charge: 'corps',
    groupes: { p: ['lombaires'], s: ['fessiers', 'epaules-arr', 'trapezes'] },
    poses: [
      { x: 80, y: 146, torse: 0, bras: 5, avant: 2, cuisse: 182, mollet: 180, pied: -40 },
      { x: 80, y: 144, torse: 8, bras: 26, avant: 22, cuisse: 196, mollet: 202, pied: -20 },
    ],
    consigne: 'À plat ventre, décolle bras et jambes en même temps sans à-coup. Regard vers le sol, nuque neutre.',
    erreur: 'Casser la nuque en regardant devant soi.',
  },
  /* ---------------- cardio ---------------- */
  {
    id: 'corde-a-sauter', nom: 'Corde à sauter', mat: 'maison',
    pattern: 'cardio', temps: true, corps: true, decor: 'sol', charge: 'corde', duree: 0.9,
    groupes: { p: ['mollets'], s: ['quadriceps', 'epaules'] },
    poses: [
      { ...DEBOUT, bras: -120, avant: -20, cuisse: -92, mollet: -88 },
      { ...DEBOUT, y: 88, bras: -110, avant: -6, cuisse: -94, mollet: -86, pied: -40 },
    ],
    consigne: 'Petits sauts sur l\'avant du pied, poignets qui font tourner la corde. Coudes près du corps.',
    erreur: 'Sauter beaucoup trop haut et s\'épuiser en trente secondes.',
  },
  {
    id: 'burpees', nom: 'Burpees', mat: 'maison',
    pattern: 'cardio', temps: true, corps: true, decor: 'sol', charge: 'corps', duree: 1.6,
    groupes: { p: ['quadriceps', 'pecs'], s: ['abdos', 'epaules', 'fessiers'] },
    poses: [
      { x: 100, y: 124, torse: 18, bras: -55, avant: -125, cuisse: 200, mollet: 198, pied: -70 },
      { x: 100, y: 92, torse: 90, bras: 100, avant: 96, cuisse: -92, mollet: -88, pied: -30 },
    ],
    consigne: 'Planche, pompe, ramène les pieds, saute bras tendus. Enchaîne à ton rythme mais sans t\'arrêter.',
    erreur: 'Bâcler la pompe et arrondir le dos en ramenant les pieds.',
  },
  {
    id: 'rameur', nom: 'Rameur', mat: 'salle',
    pattern: 'cardio', temps: true, pas: 0, decor: 'poulie-basse', charge: 'poignee', duree: 1.8,
    groupes: { p: ['dorsaux', 'quadriceps'], s: ['biceps', 'lombaires', 'fessiers'] },
    poses: [
      { x: 88, y: 124, torse: 66, bras: -20, avant: -8, cuisse: -14, mollet: -108, pied: 20 },
      { x: 104, y: 124, torse: 104, bras: -160, avant: -20, cuisse: -4, mollet: -60, pied: 20 },
    ],
    consigne: 'Ordre : jambes, buste, bras. Retour dans l\'ordre inverse. La puissance vient des jambes, pas des bras.',
    erreur: 'Tirer avec les bras avant d\'avoir poussé sur les jambes.',
  },
];

const PAR_ID = Object.fromEntries(EXOS.map((e) => [e.id, e]));

/* ---------------- muscles ---------------- */

const MUSCLES = {
  pecs: 'Pectoraux', epaules: 'Épaules', 'epaules-arr': 'Épaules arrière',
  biceps: 'Biceps', triceps: 'Triceps', 'avant-bras': 'Avant-bras',
  abdos: 'Abdominaux', obliques: 'Obliques', dorsaux: 'Dorsaux',
  trapezes: 'Trapèzes', lombaires: 'Lombaires', fessiers: 'Fessiers',
  quadriceps: 'Quadriceps', ischios: 'Ischios', adducteurs: 'Adducteurs', mollets: 'Mollets',
};

/* ---------------- objectifs ---------------- */

const OBJECTIFS = {
  masse: {
    nom: 'Prise de masse', couleur: 'var(--rouge)',
    desc: 'Prendre du muscle. Séries moyennes, charges lourdes, repos confortable.',
    series: [3, 4], reps: [8, 12], repos: 90, reposCompose: 120,
    cardio: 'Deux séances légères par semaine, pas plus : le cardio mange ta récupération.',
    exosMax: 7, calories: +12, proteines: 1.9,
  },
  seche: {
    nom: 'Perte de gras', couleur: 'var(--bleu)',
    desc: 'Fondre en gardant le muscle. Séries longues, peu de repos, cardio en fin de séance.',
    series: [3, 4], reps: [12, 15], repos: 60, reposCompose: 75,
    cardio: '15 à 25 min après la séance, ou 8 000 pas par jour. Garde les charges lourdes : c\'est ce qui protège le muscle.',
    exosMax: 6, calories: -18, proteines: 2.2,
  },
  force: {
    nom: 'Force', couleur: 'var(--violet)',
    desc: 'Soulever plus lourd. Peu de répétitions, beaucoup de repos, technique irréprochable.',
    series: [4, 5], reps: [3, 6], repos: 180, reposCompose: 210,
    cardio: 'Léger et à distance des séances, pour ne pas grignoter la récupération nerveuse.',
    exosMax: 4, calories: +8, proteines: 1.9,
  },
  endurance: {
    nom: 'Endurance musculaire', couleur: 'var(--vert)',
    desc: 'Tenir plus longtemps. Séries longues, repos courts, enchaînements.',
    series: [3, 3], reps: [15, 20], repos: 45, reposCompose: 60,
    cardio: '20 à 40 min, deux à quatre fois par semaine.',
    exosMax: 6, calories: 0, proteines: 1.7,
  },
  forme: {
    nom: 'Remise en forme', couleur: 'var(--accent)',
    desc: 'Reprendre proprement, sans se blesser. Mouvements simples, progression douce.',
    series: [3, 3], reps: [10, 12], repos: 75, reposCompose: 90,
    cardio: '20 min à allure conversationnelle, deux à trois fois par semaine.',
    exosMax: 5, calories: 0, proteines: 1.6,
  },
};

const NIVEAUX = {
  debutant: { nom: 'Débutant', desc: 'Moins d\'un an de pratique régulière.', exos: 5, volume: 0.85 },
  intermediaire: { nom: 'Intermédiaire', desc: 'Un à trois ans, technique en place.', exos: 6, volume: 1 },
  avance: { nom: 'Avancé', desc: 'Plus de trois ans, progression lente.', exos: 7, volume: 1.15 },
};

const MATERIELS = {
  salle: { nom: 'Salle complète', desc: 'Barres, machines, poulies.', ok: ['salle', 'halteres', 'maison'] },
  halteres: { nom: 'Haltères et banc', desc: 'De quoi charger, sans machines.', ok: ['halteres', 'maison'] },
  maison: { nom: 'Poids du corps', desc: 'Rien d\'autre que toi et un tapis.', ok: ['maison'] },
};

/* ---------------- découpage des semaines ---------------- */

// Chaque séance est une suite de « briques » : un pattern de mouvement,
// et si l'exercice doit être composé (polyarticulaire) ou d'isolation.
const SEANCES = {
  'full-a': { nom: 'Full body A', briques: ['squat', 'pousse-h', 'tire-v', 'iso-epaule', 'gainage', 'iso-biceps', 'iso-mollet'] },
  'full-b': { nom: 'Full body B', briques: ['hinge', 'pousse-v', 'tire-h', 'fente', 'abdos', 'iso-triceps', 'iso-epaule'] },
  'full-c': { nom: 'Full body C', briques: ['fente', 'pousse-h', 'tire-h', 'iso-quad', 'iso-epaule', 'abdos', 'iso-biceps'] },
  push: { nom: 'Poussée', briques: ['pousse-h', 'pousse-v', 'pousse-h', 'iso-pec', 'iso-epaule', 'iso-triceps', 'iso-triceps'] },
  pull: { nom: 'Tirage', briques: ['tire-v', 'tire-h', 'tire-h', 'iso-epaule', 'iso-biceps', 'iso-biceps', 'abdos'] },
  legs: { nom: 'Jambes', briques: ['squat', 'hinge', 'fente', 'iso-quad', 'iso-ischio', 'iso-mollet', 'abdos'] },
  haut: { nom: 'Haut du corps', briques: ['pousse-h', 'tire-v', 'pousse-v', 'tire-h', 'iso-epaule', 'iso-biceps', 'iso-triceps'] },
  bas: { nom: 'Bas du corps', briques: ['squat', 'hinge', 'fente', 'iso-quad', 'iso-ischio', 'iso-mollet', 'gainage'] },
};

/** Quel découpage pour combien de jours par semaine. */
function decoupage(jours, niveau) {
  if (jours <= 2) return ['full-a', 'full-b'];
  if (jours === 3) return niveau === 'debutant' ? ['full-a', 'full-b', 'full-c'] : ['push', 'pull', 'legs'];
  if (jours === 4) return ['haut', 'bas', 'haut', 'bas'];
  if (jours === 5) return ['push', 'pull', 'legs', 'haut', 'bas'];
  return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
}

const JOURS_NOM = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

/* ---------------- conseils ---------------- */

const CONSEILS = [
  'La progression, c\'est ajouter une répétition ou 2,5 kg par rapport à la dernière fois. Rien de plus.',
  'Un muscle a besoin de 10 à 20 séries par semaine pour grossir. Compte les tiennes.',
  'Dors. Sept à neuf heures. Aucun programme ne rattrape un manque de sommeil.',
  'Les deux dernières répétitions doivent être difficiles. Si elles ne le sont pas, la série ne compte qu\'à moitié.',
  'Échauffe-toi avec la barre à vide, puis deux séries légères. Jamais lourd à froid.',
  'Bois. Une perte de 2 % d\'eau corporelle coûte déjà de la force.',
  'Change de programme tous les deux à trois mois, pas toutes les semaines.',
  'Si une articulation fait mal — pas le muscle, l\'articulation — arrête l\'exercice et remplace-le.',
  'Les protéines, réparties sur la journée : 25 à 40 g par repas plutôt que tout le soir.',
  'Une séance ratée ne casse rien. Trois semaines sans venir, si.',
  'Filme-toi de profil sur les gros mouvements : tu verras en dix secondes ce que dix conseils n\'expliquent pas.',
  'La courbature n\'est pas un indicateur de progrès. La charge sur la barre, si.',
];
