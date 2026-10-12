# MK Concept — site vitrine

Salon de coiffure mixte et barbier, 235 rue de Paris, 59500 Douai.

Site statique en HTML, CSS et JS vanilla, avec GSAP, ScrollTrigger et Lenis. Tout est hébergé dans `assets/vendor`. Il n'y a pas de build : le dossier se sert tel quel.

```
python3 -m http.server 8000   # puis http://localhost:8000
```

## Structure
- `index.html` : contenu, SEO, Open Graph et Schema.org `HairSalon`
- `assets/css/main.css` : variables (couleurs, typo, rythme, mouvement) en tête de fichier
- `assets/js/main.js` : intro compte-tours, hero, menu, curseur, jauge de scroll
- `assets/fonts` : Bodoni Moda et Hanken Grotesk (woff2, sous-ensemble latin)

## Photos
Les zones `.ph` (« Photo à venir ») sont à remplacer par un `<picture>` en AVIF et WebP, avec un repli JPG. Le modèle est en commentaire au-dessus du hero.

## À confirmer avant mise en ligne
- **Téléphone** : `03 27 08 07 81` (annuaires). La page Facebook indique `06 28 50 60 98`.
- **Horaires du lundi** : « après-midi » selon les annuaires, saisi en 14h–19h.
- **Domaine** : `mkconcept-douai.fr` est un nom provisoire (canonical, OG, JSON-LD).
- **Image OG** : `assets/img/og.jpg` est à produire avec une vraie photo.
