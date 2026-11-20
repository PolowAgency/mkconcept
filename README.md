# MK Concept — site vitrine

Salon de coiffure mixte, barbier et head spa, 235 rue de Paris, 59500 Douai.

Site statique : HTML, CSS et JavaScript, sans framework ni étape de build. Une seule dépendance, Lenis (défilement doux, MIT).

```
python3 -m http.server 8000   # puis http://localhost:8000
```

## L'idée
Même construction et mêmes mouvements que le site Botésens (refonte POLOW), en noir et or : intro avec rideau, nom géant lettre par lettre sur une photo de l'intérieur, bandeau doré, texte qui s'allume au défilement, façade qui s'ouvre, prénoms de l'équipe qui se rejoignent, réalisations qui défilent à l'horizontale, défilement doux. Titres en Marcellus, texte en Montserrat.

## Structure
- `index.html` : contenu, SEO, Open Graph, Schema.org `HairSalon`
- `mentions-legales.html` : mentions légales
- `assets/css/site.css` : variables en tête (couleurs, polices)
- `assets/js/site.js` : horaires en direct, scènes au défilement, menu, onglets des tarifs, fenêtre des horaires
- `assets/js/lenis.min.js` : défilement doux
- `assets/fonts` : Marcellus et Montserrat (woff2, licence OFL)
- `assets/img` : vraies photos (`photo-*.webp`), cartes des prestations (`gamme-*.webp`), logo officiel (`logo-mk.webp`, tiré du logo retenu le 16/11/2026), icônes (`favicon.png`, `apple-touch-icon.png`), image de partage (`og.jpg`)

## Fonctionnement dégradé
- Mouvement réduit : pas d'intro ni d'animation, tout est affiché.
- Sans JavaScript : tout le contenu et tous les tarifs restent lisibles.

## Images
Les `photo-*.webp` sont les vraies photos fournies : recadrées, converties, métadonnées retirées. Pour en ajouter, recopier une `<figure class="ph">` dans la section Réalisations.

## Sources des informations (vérifiées le 20/11/2026)
- Horaires, tarifs, prix du head spa, note (4,9 sur 410 avis) : page Planity du salon.
- Téléphone `03 27 08 07 81` : PagesJaunes et annuaire des commerçants douaisiens.
- Forme juridique (SARL), SIREN et SIRET : PagesJaunes.
- Accord pour les photos de clientes : donné par le salon (20/11/2026).

## À compléter avant mise en ligne
- **Photos de l'équipe** : Karine et Christophe n'ont que leur initiale dans l'arche (bloc `.ph-vide`). Remplacer par `<img src="assets/img/equipe-prenom.webp" alt="Prénom, fonction">`.
- **Prix du barbier** : taille de barbe et rasage affichent « sur Planity » (Planity ne montre pas leur prix publiquement).
- **Capital social** : à ajouter dans les mentions légales.
- **Domaine** : `mkconcept-douai.fr` est un nom provisoire (canonical, OG, JSON-LD, sitemap).

## Déploiement (Vercel)
Projet statique, sans build : importer le dépôt, Framework Preset « Other », déployer. Chaque push redéploie.

`vercel.json` envoie un en-tête `X-Robots-Tag: noindex` tant que le site est en préversion. **Retirer ce bloc à la mise en ligne**, sinon Google n'indexera pas le site.

## Référencement (SEO local)
Fait dans le code : titre et description avec « coiffeur barbier Douai », Schema.org `HairSalon` (adresse, horaires, téléphone, note Planity), `robots.txt`, `sitemap.xml`.

À faire au lancement :
1. **Nom de domaine** : brancher le vrai domaine sur Vercel, puis remplacer `https://www.mkconcept-douai.fr/` (canonical, og:url, JSON-LD, sitemap) par l'adresse réelle.
2. **Retirer `noindex`** dans `vercel.json` (bloc `X-Robots-Tag`), et décommenter la ligne `Sitemap:` de `robots.txt`.
3. Déclarer le site dans Google Search Console et envoyer le sitemap.
4. **Fiche Google Business Profile** : la compléter à fond (catégorie, horaires, photos, lien vers le site, réponses aux avis). Pour une recherche « coiffeur Douai », la fiche pèse plus que le site.
5. Même nom, adresse et téléphone partout (Google, Planity, Facebook, Instagram, PagesJaunes).
