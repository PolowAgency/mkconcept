# MK Concept — site vitrine

Salon de coiffure mixte et barbier, 235 rue de Paris, 59500 Douai.

Site statique : HTML, CSS et JavaScript, sans framework ni étape de build. Une seule dépendance, Three.js r128 (`assets/vendor/three.min.js`), chargée seulement au premier geste du visiteur.

```
python3 -m http.server 8000   # puis http://localhost:8000
```

## L'idée
Un site simple, comme un salon de quartier : une page, du texte direct, les tarifs tout de suite, les vraies photos, et les horaires dans une fenêtre qui s'ouvre depuis le menu. Noir et or, titres en Bodoni Moda, texte en Jost.

**Vidéo du héros** : `assets/video/salon-hero.mp4` (visite filmée du salon, vertical), lecture automatique sans son. Les photos de la section « Le salon » sont des images extraites de cette vidéo (basse définition : à remplacer par de vraies photos si possible).

## Structure
- `index.html` : contenu, SEO, Open Graph, Schema.org `HairSalon`
- `assets/css/site.css` : variables en tête
- `assets/js/site.js` : horaires en direct, fenêtre des horaires, menu, onglets, vidéo
- `assets/fonts` : Bodoni Moda et Jost (woff2, licence OFL)
- `assets/img` : vraies photos (`photo-*.webp`)

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

## Référencement (SEO local)
Fait dans le code : titre et description avec « coiffeur barbier Douai », Schema.org `HairSalon` (adresse, horaires, téléphone, note Planity 4,9 sur 405 avis), titre de page lisible par les moteurs, `robots.txt`, `sitemap.xml`, Lighthouse SEO 100.

À faire par le salon (c'est ce qui fait vraiment monter à Douai) :
1. **Fiche Google Business Profile** : à compléter à fond (catégorie « Salon de coiffure », horaires, photos, lien vers le site, réponses aux avis). Pour une recherche « coiffeur Douai », la fiche pèse plus que le site.
2. **Nom de domaine** : brancher le vrai domaine sur Vercel, puis remplacer `https://www.mkconcept-douai.fr/` (canonical, og:url, JSON-LD, sitemap) par l'adresse réelle.
3. **Retirer `noindex`** dans `vercel.json` (bloc `X-Robots-Tag`) le jour du lancement, et décommenter la ligne `Sitemap:` de `robots.txt`.
4. Déclarer le site dans Google Search Console et envoyer le sitemap.
5. Même nom, adresse et téléphone partout (Google, Planity, Facebook, Instagram, PagesJaunes). Deux numéros circulent : 03 27 08 07 81 et 06 28 50 60 98, à unifier.
6. Obtenir des avis Google récents et y répondre.
