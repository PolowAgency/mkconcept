# MK Concept — site vitrine

Salon de coiffure mixte et barbier, 235 rue de Paris, 59500 Douai.

Site statique : HTML, CSS et JavaScript, sans framework ni étape de build. Une seule dépendance, Three.js r128 (`assets/vendor/three.min.js`), chargée seulement au premier geste du visiteur.

```
python3 -m http.server 8000   # puis http://localhost:8000
```

## L'idée
Noir et blanc éditorial, d'après la référence envoyée (Hudozhnikova Fashion Hair School) : une bande noire en haut, une photo plein cadre avec le nom au centre, des titres fins, un seul accent kaki. Les photos sont passées en noir et blanc par CSS (la couleur revient au survol des réalisations). Les horaires et l'état Ouvert/Fermé sont calculés pour Douai.

## Structure
- `index.html` : contenu, SEO, Open Graph, Schema.org `HairSalon`
- `assets/css/site.css` : variables en tête (couleurs, typo, largeur)
- `assets/js/site.js` : horaires en direct, menu mobile, onglets des tarifs, filtre des réalisations
- `assets/fonts` : Jost (woff2, licence OFL)
- `assets/img` : vraies photos (`photo-*.webp`), `og.jpg`, `favicon.svg`

## Fonctionnement dégradé
- Mouvement réduit : pas d'apparition animée.
- Sans JavaScript : la page reste lisible, tous les tarifs sont listés à la suite.

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
- **Horaires** : lundi 14h–18h, mardi 9h30–19h, jeudi 10h–20h, samedi 9h–18h (Planity). Mercredi 9h30–19h et vendredi 9h–19h viennent des annuaires. Ils sont dans `index.html` (tableau et JSON-LD) et dans `HOURS` de `assets/js/site.js`.
- **Domaine** : `mkconcept-douai.fr` est un nom provisoire (canonical, OG, JSON-LD).
- **Mentions légales** : forme juridique, SIRET, hébergeur.
- **Droit à l'image** : accord écrit pour les photos de mineurs et de clientes (mariage).

## Déploiement (Vercel)
Projet statique, sans build : importer le dépôt, Framework Preset « Other », déployer. Chaque push redéploie.

`vercel.json` envoie un en-tête `X-Robots-Tag: noindex` tant que le site est en préversion. **Retirer ce bloc à la mise en ligne**, sinon Google n'indexera pas le site.
