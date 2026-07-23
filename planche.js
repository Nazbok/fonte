/* Planche de contrôle : rend chaque exercice hors navigateur, pour vérifier
   que les poses tiennent debout. Usage : node planche.js > planche.svg */
const fs = require('fs');

const src = fs.readFileSync(__dirname + '/src/03-donnees.js', 'utf8')
            + fs.readFileSync(__dirname + '/src/04-dessin.js', 'utf8')
            + '\nreturn { EXOS, frame };';
const { EXOS, frame } = new Function(src)();

const CSS = {
  'fig-sol': 'stroke:#bbb', 'fig-decor': 'stroke:#999;fill:none',
  'fig-membre-loin': 'stroke:#bcc3cc', 'fig-corps': 'stroke:#1b2028',
  'fig-tete': 'fill:#1b2028',
  'fig-corps-plein': 'fill:#1b2028', 'fig-membre-loin-plein': 'fill:#bcc3cc',
  'fig-lustre': 'stroke:#ffffff30;fill:none', 'fig-lustre-plein': 'fill:#ffffff33', 'fig-ombre': 'fill:#00000024', 'fig-charge': 'stroke:#e08c10;fill:none',
  'fig-charge-plein': 'fill:#e08c10',
};

const r = (n) => Math.round(n * 10) / 10;

function baliser(s) {
  const st = CSS[s.cls] || '';
  if (s.t === 'ligne')
    return `<line x1="${r(s.x1)}" y1="${r(s.y1)}" x2="${r(s.x2)}" y2="${r(s.y2)}" style="${st}" stroke-width="${s.w ?? 3}" stroke-linecap="round"/>`;
  if (s.t === 'rect')
    return `<rect x="${r(s.x)}" y="${r(s.y)}" width="${r(s.w)}" height="${r(s.h)}" rx="2" style="${st}"${s.plein ? '' : ' fill="none" stroke-width="2.5"'}/>`;
  if (s.t === 'cercle')
    return `<circle cx="${r(s.cx)}" cy="${r(s.cy)}" r="${r(s.r)}" style="${st}"${s.w ? ` fill="none" stroke-width="${s.w}"` : ''}/>`;
  if (s.t === 'ellipse' || s.t === 'ellipse-vide')
    return `<ellipse cx="${r(s.cx)}" cy="${r(s.cy)}" rx="${r(s.rx)}" ry="${r(s.ry)}" style="${st}"${s.t === 'ellipse-vide' ? ' fill="none" stroke-width="1.8"' : ''}/>`;
  return `<polyline points="${s.points.map((p) => `${r(p.x)},${r(p.y)}`).join(' ')}" style="${st}" fill="none" stroke-width="${s.w ?? 7}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const filtre = process.argv[2] ? process.argv[2].split(',') : null;
const LISTE = filtre ? EXOS.filter((e) => filtre.includes(e.id)) : EXOS;
const COL = 3, L = 430, H = 220;
const lignes = Math.ceil(LISTE.length / COL);
let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${COL * L}" height="${lignes * H}" viewBox="0 0 ${COL * L} ${lignes * H}"><rect width="100%" height="100%" fill="#fff"/>`;

LISTE.forEach((exo, i) => {
  const cx = (i % COL) * L, cy = Math.floor(i / COL) * H;
  out += `<g transform="translate(${cx},${cy})">`;
  out += `<text x="8" y="16" font-family="sans-serif" font-size="13" font-weight="700">${i + 1}. ${exo.nom}</text>`;
  out += `<text x="8" y="30" font-family="sans-serif" font-size="10" fill="#888">${exo.decor} · ${exo.charge}</text>`;
  [0, 1].forEach((k) => {
    out += `<g transform="translate(${k * 210},34) scale(1.02)">`;
    out += `<rect x="0" y="0" width="200" height="170" fill="#f6f6f4"/>`;
    out += frame(exo, k).map(baliser).join('');
    out += `<text x="4" y="166" font-family="sans-serif" font-size="9" fill="#aaa">${k ? 'fin' : 'départ'}</text></g>`;
  });
  out += `</g>`;
});
out += '</svg>';
process.stdout.write(out);
