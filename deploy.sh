#!/bin/bash
MSG=${1:-"update"}
DOWNLOADS=~/Downloads/rxcounselor
echo "Copying files..."
cp "$DOWNLOADS/app.py" app.py
cp "$DOWNLOADS/templates/index.html" templates/index.html
cp "$DOWNLOADS/templates/landing.html" templates/landing.html
cp "$DOWNLOADS/templates/mymeds.html" templates/mymeds.html
cp "$DOWNLOADS/templates/medcard.html" templates/medcard.html
cp "$DOWNLOADS/templates/symptoms.html" templates/symptoms.html
cp "$DOWNLOADS/templates/tracker.html" templates/tracker.html
cp "$DOWNLOADS/templates/manifest.json" templates/manifest.json
cp "$DOWNLOADS/templates/sw.js" templates/sw.js
cp "$DOWNLOADS/templates/icon.svg" templates/icon.svg
cp "$DOWNLOADS/templates/404.html" templates/404.html
echo "Pushing..."
git add .
git commit -m "$MSG"
git push
echo "Done!"
