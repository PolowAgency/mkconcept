# MK Concept — site vitrine

Salon de coiffure mixte, barbier et head spa, 235 rue de Paris, 59500 Douai.

Site statique d'une seule page (`index.html`, CSS et JS intégrés), sans framework ni étape de build.

```
python3 -m http.server 8000   # puis http://localhost:8000
```

## L'idée
Même construction que le site du Carré d'Hair (refonte POLOW), en noir et or : hero avec pastille et deux boutons, cartes des prestations, galerie de réalisations, blocs de tarifs, appel à réserver, contact avec horaires et plan. La réservation passe par Planity. Titres en Fraunces (Google Fonts), texte en DM Sans (`assets/fonts`).

## Structure
- `index.html` : contenu, styles, script, SEO, Open Graph, Schema.org `HairSalon`
- `mentions-legales.html` : mentions légales
- `assets/img` : vraies photos du salon (`photo-*.webp`, `gamme-*.webp`, etc.), logo officiel (`logo-mk.webp`), icônes, image de partage (`og.jpg`)

## Sources des informations (vérifiées le 20/11/2026)
- Horaires, tarifs, prix du head spa, note (4,9 sur 410 avis) : page Planity du salon.
- Téléphone `03 27 08 07 81` : PagesJaunes et annuaire des commerçants douaisiens.
- Forme juridique (SARL), SIREN et SIRET : PagesJaunes.
- Accord pour les photos de clientes : donné par le salon (20/11/2026).

## À compléter avant mise en ligne
- **Photos de l'équipe** : à venir (Karine et Christophe), pour une éventuelle section équipe.
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
