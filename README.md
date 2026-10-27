# MK Concept — site vitrine

Salon de coiffure mixte et barbier, 235 rue de Paris, 59500 Douai.

Site statique : HTML, CSS et JavaScript, sans framework ni étape de build. Une seule dépendance, Three.js r128 (`assets/vendor/three.min.js`), chargée seulement au premier geste du visiteur.

```
python3 -m http.server 8000   # puis http://localhost:8000
```

## L'idée
Le hero est le salon en miniature : une scène isométrique qu'on fait tourner (quatre coins : barbier, coiffure, entrée, couleur), avec des meubles cliquables. L'enseigne « Ouvert » et l'horloge de la scène suivent l'heure réelle de Douai.

Tout le mouvement suit les principes d'Apple pour les interfaces fluides : le geste est suivi 1:1, reprend la vitesse du doigt au lâcher, se projette vers l'endroit où il allait, se pose avec un ressort, et peut être attrapé à tout instant. Cela vaut pour la scène, le carrousel des réalisations, la visionneuse, le menu et le volet « Horaires et accès ». Pas de GSAP ni de Lenis : défilement natif, petit moteur de ressorts maison.

## Structure
- `index.html` : contenu, SEO, Open Graph, Schema.org `HairSalon`
- `assets/css/main.css` : variables en tête (couleurs, typo, rythme, ressorts CSS)
- `assets/js/physics.js` : ressorts, projection d'inertie, élastique
- `assets/js/scene.js` : la scène 3D (meubles, lumières, murs qui s'abaissent)
- `assets/js/hero.js` : chargement de la 3D, geste de rotation, pastilles
- `assets/js/main.js` : intro, menu, volets, carrousel, visionneuse, tarifs, horaires
- `assets/fonts` : Bricolage Grotesque et Outfit (woff2, licence OFL)
- `assets/img` : affiches et illustrations de la scène (WebP), vraies photos (`photo-*.webp`)

## Fonctionnement dégradé
- Sans WebGL, en économie de données ou si la 3D échoue : l'affiche reste, et le contrôle sous la scène change de coin (une affiche par coin).
- Mouvement réduit : pas d'intro, pas de rebond, la scène reste utilisable.
- Sans JavaScript : tout le contenu et tous les tarifs restent lisibles.
- Appareil lent : la scène baisse sa définition d'elle-même pendant un geste.

## Mesures (Lighthouse mobile, en local)
Performance 96, accessibilité 100, bonnes pratiques 100, SEO 100.

## Images
Les affiches et illustrations viennent de la scène 3D elle-même (rendus hors ligne). Les `photo-*.webp` sont les vraies photos fournies : recadrées, converties, métadonnées retirées. Pour en ajouter, recopier une `<figure class="shot">` dans la section Réalisations (`data-cat="femme"` ou `"homme"`, `--ar` = largeur / hauteur).

## À compléter avant mise en ligne
- **Portrait de Karine** : l'arche de la section Karine affiche un plateau d'outils illustré, marqué « Portrait de Karine à venir ».
- **Texte de Karine** : la citation et le paragraphe sont des propositions, à valider ou réécrire avec elle.
- **Prix du barbier** : taille de barbe et rasage affichent « sur Planity ».
- **Avis** : la section affiche la note (4,9/5, près de 400 avis). Pour ajouter des citations, recopier 2 ou 3 avis Planity mot pour mot (emplacement indiqué en commentaire).
- **Tarifs** : relevés sur Planity via des extraits de recherche (octobre 2026), à vérifier sur la vraie page.
- **Téléphone** : `03 27 08 07 81` (annuaires). La page Facebook indique `06 28 50 60 98`.
- **Horaires** : lundi 14h–18h, mardi 9h30–19h, jeudi 10h–20h, samedi 9h–18h (Planity). Mercredi 9h30–19h et vendredi 9h–19h viennent des annuaires. Ils sont dans `index.html` (tableau et JSON-LD) et dans `HOURS` de `assets/js/main.js`.
- **Domaine** : `mkconcept-douai.fr` est un nom provisoire (canonical, OG, JSON-LD).
- **Mentions légales** : forme juridique, SIRET, hébergeur.
- **Droit à l'image** : accord écrit pour les photos de mineurs et de clientes (mariage).

## Déploiement (Vercel)
Projet statique, sans build : importer le dépôt, Framework Preset « Other », déployer. Chaque push redéploie.

`vercel.json` envoie un en-tête `X-Robots-Tag: noindex` tant que le site est en préversion. **Retirer ce bloc à la mise en ligne**, sinon Google n'indexera pas le site.
