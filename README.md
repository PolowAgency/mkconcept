# MK Concept — site vitrine

Salon de coiffure mixte et barbier, 235 rue de Paris, 59500 Douai.

Site statique en HTML, CSS et JS vanilla, avec GSAP, ScrollTrigger et Lenis. Tout est hébergé dans `assets/vendor`. Il n'y a pas de build : le dossier se sert tel quel.

```
python3 -m http.server 8000   # puis http://localhost:8000
```

## Structure
- `index.html` : contenu, SEO, Open Graph et Schema.org `HairSalon`
- `assets/css/main.css` : variables (couleurs, typo, rythme, mouvement) en tête de fichier
- `assets/js/main.js` : intro compte-tours, menu, révélations, onglets de la carte, galerie horizontale, lightbox
- `assets/fonts` : Instrument Serif et Hanken Grotesk (woff2, sous-ensemble latin)
- `mentions-legales.html` : page à compléter

## Sections
Intro · Hero · 01 Le salon · 02 Karine · 03 Elle & lui · 04 La carte · 05 Réalisations · 06 Avis · Rendez-vous · Contact · Footer

## Photos
Les images de `assets/img/` sont des **visuels provisoires** générés par script (lumière tungstène, mèches, cuir, réservoir), pas des photos du salon. Chaque `<img>` dans un `.ph` se remplace par la vraie photo, idéalement en `<picture>` AVIF et WebP avec un repli JPG, en gardant les attributs `width` et `height`. `og.jpg` sert à l'aperçu de partage. Le modèle est en commentaire au-dessus du hero. Les photos à prévoir :
- hero : le salon, lumière chaude, horizontale
- salon : intérieur (verticale, arche) + un détail cuir ou bois (carré)
- Karine : une photo d'ambiance (bandeau horizontal) + son portrait (vertical)
- Elle / Lui : une photo coiffure femme + une photo barbier (verticales)
- réalisations : 8 photos de coupes, réparties en femme, homme et barbe

## À compléter avant mise en ligne
- **Tarifs** : relevés sur Planity via des extraits de recherche (octobre 2026), à vérifier sur la vraie page. Les prix barbier (taille de barbe, rasage) manquent et affichent « sur Planity ».
- **Avis** : la section affiche la note (4,9/5, près de 400 avis). Pour ajouter des citations, recopier 2 ou 3 avis Planity mot pour mot (emplacement indiqué en commentaire).
- **Texte de Karine** : la citation et le paragraphe sont des propositions, à valider ou réécrire avec elle.
- **Téléphone** : `03 27 08 07 81` (annuaires). La page Facebook indique `06 28 50 60 98`.
- **Horaires** : lundi 14h–18h, mardi 9h30–19h, jeudi 10h–20h, samedi 9h–18h (Planity). Mercredi 9h30–19h et vendredi 9h–19h viennent des annuaires.
- **Domaine** : `mkconcept-douai.fr` est un nom provisoire (canonical, OG, JSON-LD).
- **Image OG** : `assets/img/og.jpg` est à produire avec une vraie photo.
- **Mentions légales** : forme juridique, SIRET, hébergeur.

## Déploiement (Vercel)
Projet statique, sans build : dans Vercel, importer le dépôt, laisser le Framework Preset sur « Other » et déployer. Chaque push redéploie automatiquement.

`vercel.json` envoie un en-tête `X-Robots-Tag: noindex` tant que le site est en préversion, avec ses photos et tarifs provisoires. **Retirer ce bloc à la mise en ligne**, sinon Google n'indexera pas le site.
