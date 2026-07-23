#!/bin/bash
# Assemble les morceaux de src/ en deux fichiers :
#   app.html   — corps seul, pour publication en artifact
#   fonte.html — page autonome complète, à garder sur le téléphone
set -e
cd "$(dirname "$0")"

{
  cat src/01-style.html
  cat src/02-corps.html
  echo '<script>'
  cat src/03-donnees.js src/04-dessin.js src/04b-perso3d.js src/05-app.js
  echo '</script>'
} > app.html

{
  echo '<!doctype html>'
  echo '<html lang="fr">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<title>Fonte — carnet de salle</title>'
  echo '</head>'
  echo '<body>'
  cat app.html
  echo '</body></html>'
} > fonte.html

# Version pour GitHub Pages : vrai <head>, manifeste et icônes servis en fichiers.
mkdir -p docs
{
  echo '<!doctype html>'
  echo '<html lang="fr">'
  echo '<head>'
  echo '<meta charset="utf-8">'
  echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
  echo '<title>Fonte — carnet de salle</title>'
  echo '<meta name="description" content="Programme de musculation, séances guidées et suivi des charges.">'
  echo '<meta name="theme-color" content="#14171c">'
  echo '<link rel="manifest" href="manifest.webmanifest">'
  echo '<link rel="icon" href="icone.svg" type="image/svg+xml">'
  echo '<link rel="apple-touch-icon" href="icone-192.png">'
  echo '<meta name="mobile-web-app-capable" content="yes">'
  echo '<meta name="apple-mobile-web-app-capable" content="yes">'
  echo '<meta name="apple-mobile-web-app-title" content="Fonte">'
  echo '</head>'
  echo '<body>'
  cat app.html
  echo '</body></html>'
} > docs/index.html

# Contrôle de syntaxe du script assemblé.
cat src/03-donnees.js src/04-dessin.js src/04b-perso3d.js src/05-app.js > /tmp/fonte-check.js
node --check /tmp/fonte-check.js && echo "syntaxe ok · autonome $(wc -c < fonte.html) o · site $(wc -c < docs/index.html) o"
