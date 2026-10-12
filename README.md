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
Chaque `.ph` (« Photo à venir ») se remplace par un `<picture>` en AVIF et WebP, avec un repli JPG. Le modèle est en commentaire au-dessus du hero. Les photos à prévoir :
- hero : le salon, lumière chaude, horizontale
- salon : intérieur (verticale, arche) + un détail cuir ou bois (carré)
- Karine : sa moto (bandeau horizontal) + son portrait (vertical)
- Elle / Lui : une photo coiffure femme + une photo barbier (verticales)
- réalisations : 8 photos de coupes, réparties en femme, homme et barbe

## À compléter avant mise en ligne
- **Tarifs** : remplacer chaque `xx` dans la section La carte par les prix Planity.
- **Avis** : recopier 3 vrais avis Google ou Planity mot pour mot.
- **Texte de Karine** : la citation et le paragraphe sont des propositions, à valider ou réécrire avec elle.
- **Téléphone** : `03 27 08 07 81` (annuaires). La page Facebook indique `06 28 50 60 98`.
- **Horaires du lundi** : « après-midi » selon les annuaires, saisi en 14h–19h.
- **Domaine** : `mkconcept-douai.fr` est un nom provisoire (canonical, OG, JSON-LD).
- **Image OG** : `assets/img/og.jpg` est à produire avec une vraie photo.
- **Mentions légales** : forme juridique, SIRET, hébergeur.

## Déploiement (Vercel)
Projet statique, sans build : dans Vercel, importer le dépôt, laisser le Framework Preset sur « Other » et déployer. Chaque push redéploie automatiquement.

`vercel.json` envoie un en-tête `X-Robots-Tag: noindex` tant que le site est en préversion, avec ses photos et tarifs provisoires. **Retirer ce bloc à la mise en ligne**, sinon Google n'indexera pas le site.
