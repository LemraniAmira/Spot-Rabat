# 📍 Spot Rabat

> Application web de géolocalisation des services de proximité à Rabat  
> Base de données graphe Neo4j · API FastAPI · Frontend React · Données OpenStreetMap
---

## Table des matières

1. [Présentation du projet](#présentation-du-projet)
2. [Architecture globale](#architecture-globale)
3. [Structure des fichiers](#structure-des-fichiers)
4. [Base de données Neo4j](#base-de-données-neo4j)
5. [Scraping OpenStreetMap](#scraping-openstreetmap)
6. [Backend FastAPI](#backend-fastapi)
7. [Frontend React](#frontend-react)
8. [Installation et lancement](#installation-et-lancement)
9. [Utilisation de l'application](#utilisation-de-lapplication)
10. [Technologies utilisées](#technologies-utilisées)
11. [Choix techniques justifiés](#choix-techniques-justifiés)

---

## Présentation du projet

**Spot Rabat** est une application web full-stack qui permet à un utilisateur de trouver les services les plus proches de lui dans la ville de Rabat. L'utilisateur choisit une catégorie de service (restaurant, hôpital, université…), un rayon de recherche, et l'application retourne automatiquement les lieux triés du plus proche au plus éloigné, affichés sur une carte interactive.

### Problème résolu

Trouver un service de proximité à Rabat est difficile : les données sont éparpillées, aucune application locale n'existe, et les outils comme Google Maps ne couvrent pas bien les services locaux marocains. Spot Rabat centralise 2 031 lieux réels issus d'OpenStreetMap dans une base Neo4j et les rend accessibles en moins de 100ms.

### Lien avec le Big Data

| Dimension | Application dans Spot Rabat |
|-----------|----------------------------|
| **Volume** | 2 031 lieux géolocalisés, extensible à toutes les villes du Maroc |
| **Variété** | 6 catégories, données hétérogènes (noms, GPS, téléphones, horaires) |
| **Vélocité** | Requêtes géospatiales en temps réel, réponse API < 100ms |

---

## Architecture globale

```
OpenStreetMap (Overpass API)
        ↓
  scraper_osm.py          ← Collecte les données GPS de Rabat
        ↓
   Neo4j Graph DB         ← Stocke les lieux et leurs relations
        ↓
  FastAPI (Python)        ← Expose une API REST
        ↓
   React.js               ← Interface utilisateur
        ↓
  Leaflet (carte)         ← Affichage sur OpenStreetMap
```

**Flux complet d'une recherche :**
1. L'utilisateur choisit "Restaurant" et un rayon de 1km
2. React envoie `POST /api/places/nearby` avec latitude, longitude, rayon
3. FastAPI reçoit la requête et exécute une requête Cypher dans Neo4j
4. Neo4j calcule `point.distance()` pour chaque restaurant et filtre par rayon
5. Les résultats triés par distance sont retournés en JSON
6. React affiche les marqueurs sur la carte Leaflet et la liste à droite

---

## Structure des fichiers

```
geo-app-rabat/
│
├── backend/                        ← Serveur API Python
│   ├── main.py                     ← Point d'entrée FastAPI, configuration CORS
│   ├── database.py                 ← Connexion au driver Neo4j
│   ├── models.py                   ← Schémas de validation Pydantic
│   └── routes/
│       ├── categories.py           ← Endpoint GET /api/categories
│       └── places.py               ← Endpoints recherche et détail des lieux
│
├── frontend/                       ← Interface utilisateur React
│   └── src/
│       ├── App.js                  ← Composant racine, gestion des écrans
│       ├── api/
│       │   └── api.js              ← Fonctions d'appel à l'API backend
│       └── screens/
│           ├── HomeScreen.jsx      ← Écran d'accueil avec catégories
│           ├── HomeScreen.css
│           ├── LocationScreen.jsx  ← Écran de sélection du rayon
│           ├── LocationScreen.css
│           ├── ResultsScreen.jsx   ← Carte + liste des résultats
│           └── ResultsScreen.css
│
└── scrabing and bd/                ← Scripts de collecte des données
    ├── scraper_osm.py              ← Scraper principal (version simple)
    ├── scraper_missing.py          ← Scraper pour les catégories manquantes
    ├── pipeline_SpotRabat.py         ← Pipeline complet avec nettoyage avancé
    └── neo4j-2026-03-02T23-27-43.dump  ← Export de la base Neo4j
```

---

## Base de données Neo4j

### Pourquoi Neo4j ?

Neo4j est une base de données **orientée graphe** (NoSQL). Contrairement aux bases relationnelles SQL, elle stocke les données sous forme de **nœuds** connectés par des **relations**. C'est idéal pour ce projet car :

- La fonction `point.distance()` est **native** dans Neo4j — pas besoin d'extensions
- Les relations entre lieux et catégories sont des **connexions directes**, pas des jointures lentes
- La performance reste **constante** même avec des milliers de nœuds
- Le langage **Cypher** permet des requêtes géospatiales en quelques lignes

### Modèle de données

**Nœud Place** — représente un lieu géographique

| Propriété | Type | Description |
|-----------|------|-------------|
| `id` | String | UUID unique généré à l'import |
| `osm_id` | String | Identifiant OpenStreetMap (clé de déduplication) |
| `name` | String | Nom du lieu |
| `type` | String | Type OSM (restaurant, hospital, university…) |
| `latitude` | Float | Coordonnée GPS latitude |
| `longitude` | Float | Coordonnée GPS longitude |
| `address` | String | Adresse complète (si disponible) |
| `phone` | String | Numéro de téléphone (si disponible) |
| `website` | String | Site web (si disponible) |
| `opening_hours` | String | Horaires d'ouverture (si disponibles) |
| `city` | String | Ville — "Rabat" |
| `source` | String | Source — "openstreetmap" |
| `scraped_at` | DateTime | Date de collecte |

**Nœud Category** — représente une catégorie de service

| Propriété | Type | Description |
|-----------|------|-------------|
| `id` | String | Identifiant unique (cat1 à cat6) |
| `name` | String | Nom affiché (Restaurant, Santé…) |
| `slug` | String | Identifiant URL (restaurant, sante…) |
| `icon` | String | Emoji représentatif |
| `color` | String | Couleur hexadécimale pour l'UI |

**Relation BELONGS_TO**
```
(p:Place)-[:BELONGS_TO]->(c:Category)
```
Chaque lieu appartient à exactement une catégorie.

### Les 6 catégories

| ID | Slug | Nom | Lieux | Filtres OSM |
|----|------|-----|-------|-------------|
| cat1 | sport | Sport | 333 | leisure=sports_centre, stadium, fitness_centre, swimming_pool |
| cat2 | urgence | Urgence | 45 | amenity=hospital, police, fire_station |
| cat3 | tourisme | Tourisme | 311 | tourism=attraction, museum, hotel + amenity=place_of_worship |
| cat4 | restaurant | Restaurant | 842 | amenity=restaurant, fast_food, cafe |
| cat5 | sante | Santé | 283 | amenity=hospital, clinic, pharmacy, doctors |
| cat6 | etudiant | Étudiant | 243 | amenity=university, college, school, library |

**Total : 2 031 lieux — 2 031 relations BELONGS_TO**

### Requête géospatiale principale

```cypher
MATCH (p:Place)-[:BELONGS_TO]->(c:Category {slug: $category})
WITH p, c,
     round(point.distance(
       point({latitude: p.latitude, longitude: p.longitude}),
       point({latitude: $latitude,  longitude: $longitude})
     )) AS distance_m
WHERE distance_m <= $radius
RETURN
    p.id, p.name, p.type, p.address, p.phone,
    p.latitude, p.longitude, p.opening_hours,
    c.slug, c.icon, c.color,
    distance_m
ORDER BY distance_m ASC
LIMIT $limit
```

**Explication ligne par ligne :**
- `MATCH` — cherche tous les lieux de la catégorie demandée
- `point.distance()` — calcule la distance en mètres entre la position de l'utilisateur et chaque lieu
- `WHERE distance_m <= $radius` — garde seulement les lieux dans le rayon choisi
- `ORDER BY distance_m ASC` — trie du plus proche au plus éloigné
- `LIMIT` — retourne au maximum 50 résultats

---

## Scraping OpenStreetMap

### Principe

Le scraper interroge l'**API Overpass** d'OpenStreetMap — une API gratuite qui permet de récupérer toutes les données géographiques dans une zone délimitée par une **bounding box** GPS.

La bounding box de Rabat :
```
min_lat=33.95, min_lon=-6.90, max_lat=34.05, max_lon=-6.78
```

### Fichier `scraper_osm.py` — Version simple

Rôle : scraper basique pour une première collecte.

Fonctionnement :
1. Pour chaque catégorie, envoie une requête HTTP GET à `overpass-api.de`
2. La requête contient un filtre OSM et la bounding box de Rabat
3. Reçoit un JSON avec tous les éléments correspondants
4. Extrait latitude, longitude, nom, adresse, téléphone
5. Importe dans Neo4j avec `MERGE` (pas de doublons)
6. Attend 2 secondes entre chaque requête pour respecter le rate limit

Modification apportée : ajout du header `User-Agent` pour éviter l'erreur HTTP 406.


---

## Backend FastAPI

### Fichier `main.py`

Point d'entrée de l'application. Configure :
- L'application FastAPI avec titre et description
- Le middleware **CORS** pour autoriser les requêtes depuis `localhost:3000` (React)
- L'enregistrement des deux routers (categories et places)
- Une route de test `GET /` pour vérifier que le serveur tourne

### Fichier `database.py`

Gère la connexion à Neo4j via le driver officiel Python `neo4j`. Crée un driver global réutilisé par toutes les routes. Paramètres : URI `bolt://127.0.0.1:7687`, utilisateur `neo4j`, mot de passe configuré.

### Fichier `models.py`

Définit les schémas de données avec **Pydantic** :
- `PlaceResponse` — structure d'un lieu retourné par l'API
- `CategoryResponse` — structure d'une catégorie
- `NearbyRequest` — structure de la requête de recherche (latitude, longitude, rayon, catégorie)

Pydantic valide automatiquement les types des données entrantes et sortantes.

### Fichier `routes/categories.py`

**`GET /api/categories`**  
Retourne les 6 catégories depuis Neo4j. Utilisé par l'écran d'accueil React pour afficher la grille.

### Fichier `routes/places.py`

**`POST /api/places/nearby`**  
Corps de la requête : `{ latitude, longitude, radius, category }`  
Exécute la requête géospatiale Cypher et retourne les lieux triés par distance.

**`GET /api/places/search?q=xxx`**  
Recherche globale par nom ou adresse. Utilisé par la barre de recherche de l'accueil.

**`GET /api/places/{id}`**  
Retourne le détail complet d'un lieu spécifique. Utilisé quand l'utilisateur clique sur un résultat.

### Documentation automatique

FastAPI génère automatiquement une interface Swagger accessible sur :
```
http://localhost:8000/docs
```

---

## Frontend React

### Fichier `App.js`

Composant racine qui gère la navigation entre les 3 écrans via un état `currentScreen`. Pas de React Router — la navigation est gérée manuellement avec des props.

### Fichier `api/api.js`

Centralise tous les appels HTTP vers le backend avec **Axios** :
- `getCategories()` — appelle `GET /api/categories`
- `getNearbyPlaces(lat, lon, radius, category)` — appelle `POST /api/places/nearby`
- `getPlaceDetail(id)` — appelle `GET /api/places/{id}`
- `searchPlaces(query)` — appelle `GET /api/places/search`

### Écran 1 — `HomeScreen.jsx`

Affiche :
- Le titre "Spot Rabat" en design noir et or
- La barre de recherche globale avec suggestions en temps réel
- La grille des 6 catégories avec icône, nom et nombre de lieux
- Le footer avec les statistiques (2 031 lieux, 6 catégories, OSM)

Au clic sur une catégorie → navigation vers LocationScreen.

### Écran 2 — `LocationScreen.jsx`

Affiche :
- La catégorie sélectionnée
- 3 boutons de rayon : 500m, 1km, 5km
- Un message d'information sur la localisation

Au clic sur "Rechercher" → utilise les coordonnées fixes du centre de Rabat (33.9716, -6.8498) et navigue vers ResultsScreen.

### Écran 3 — `ResultsScreen.jsx`

Affiche côte à côte :
- **Gauche (55%)** : carte Leaflet avec les marqueurs des lieux trouvés
- **Droite (45%)** : liste triée par distance avec nom, adresse, distance

Fonctionnalités :
- Clic sur un marqueur ou un résultat → panel de détail
- Barre de recherche pour filtrer les résultats par nom
- Filtres par distance (500m, 1km, 2km)
- Bouton "Charger plus" pour paginer les résultats
- Bouton "Itinéraire" → ouvre Google Maps

---

## Installation et lancement

### Prérequis

- **Neo4j Desktop** 1.6.1+ — [télécharger](https://neo4j.com/download/)
- **Python** 3.10+ — [télécharger](https://python.org)
- **Node.js** 18+ — [télécharger](https://nodejs.org)

### 1. Démarrer Neo4j

1. Ouvrir Neo4j Desktop
2. Cliquer sur **Start** sur la DBMS "Graph DBMS"
3. Attendre que le statut passe à **ACTIVE** (vert)

### 2. Initialiser les catégories (première fois uniquement)

Ouvrir Neo4j Browser (`Open` dans Neo4j Desktop) et exécuter :

```cypher
MERGE (c1:Category {id: "cat1"}) SET c1.name = "Sport",      c1.slug = "sport",      c1.icon = "⚽", c1.color = "#e74c3c"
MERGE (c2:Category {id: "cat2"}) SET c2.name = "Urgence",    c2.slug = "urgence",    c2.icon = "🚨", c2.color = "#e74c3c"
MERGE (c3:Category {id: "cat3"}) SET c3.name = "Tourisme",   c3.slug = "tourisme",   c3.icon = "🏛️", c3.color = "#9b59b6"
MERGE (c4:Category {id: "cat4"}) SET c4.name = "Restaurant", c4.slug = "restaurant", c4.icon = "🍽️", c4.color = "#e67e22"
MERGE (c5:Category {id: "cat5"}) SET c5.name = "Santé",      c5.slug = "sante",      c5.icon = "🏥", c5.color = "#2ecc71"
MERGE (c6:Category {id: "cat6"}) SET c6.name = "Étudiant",   c6.slug = "etudiant",   c6.icon = "🎓", c6.color = "#3498db"
```

### 3. Scraper les données (première fois uniquement)

```bash
cd "scrabing and bd"
py scraper_osm.py
```

Durée : environ 5–10 minutes. Résultat attendu : `2031 lieux importés dans Neo4j`.

### 4. Créer les relations (première fois uniquement)

Dans Neo4j Browser :

```cypher
MATCH (p:Place) WHERE p.type = "restaurant" MATCH (c:Category {id: "cat4"}) MERGE (p)-[:BELONGS_TO]->(c);
MATCH (p:Place) WHERE p.type = "sante"      MATCH (c:Category {id: "cat5"}) MERGE (p)-[:BELONGS_TO]->(c);
MATCH (p:Place) WHERE p.type = "urgence"    MATCH (c:Category {id: "cat2"}) MERGE (p)-[:BELONGS_TO]->(c);
MATCH (p:Place) WHERE p.type = "tourisme"   MATCH (c:Category {id: "cat3"}) MERGE (p)-[:BELONGS_TO]->(c);
MATCH (p:Place) WHERE p.type = "sport"      MATCH (c:Category {id: "cat1"}) MERGE (p)-[:BELONGS_TO]->(c);
MATCH (p:Place) WHERE p.type = "etudiant"   MATCH (c:Category {id: "cat6"}) MERGE (p)-[:BELONGS_TO]->(c);
```

### 5. Lancer le backend

```bash
cd backend
pip install fastapi uvicorn neo4j
py -m uvicorn main:app --reload
```

Serveur disponible sur : `http://localhost:8000`  
Documentation Swagger : `http://localhost:8000/docs`

### 6. Lancer le frontend

Dans un nouveau terminal :

```bash
cd frontend
npm install
npm start
```

Application disponible sur : `http://localhost:3000`

### Lancement quotidien (après première installation)

À chaque fois que vous voulez utiliser l'app :

```
1. Neo4j Desktop → Start → attendre ACTIVE
2. Terminal 1 → cd backend → py -m uvicorn main:app --reload
3. Terminal 2 → cd frontend → npm start
4. Navigateur → http://localhost:3000
```

---

## Utilisation de l'application

### Recherche par catégorie

1. Sur l'accueil, cliquer sur une catégorie (ex: "Restaurant")
2. Choisir le rayon de recherche : 500m, 1km ou 5km
3. Cliquer sur "Rechercher autour de moi"
4. Les résultats s'affichent sur la carte et dans la liste, triés par distance

### Recherche par nom

1. Sur l'accueil, taper dans la barre de recherche
2. Les suggestions apparaissent en temps réel
3. Cliquer sur un résultat pour voir son emplacement sur la carte

### Détail d'un lieu

1. Cliquer sur un marqueur sur la carte ou un élément de la liste
2. Le panel de détail s'ouvre avec : nom, adresse, téléphone, horaires
3. Bouton "Itinéraire" → ouvre Google Maps avec l'itinéraire

---

## Technologies utilisées

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Neo4j Desktop** | 5.24 | Base de données graphe locale |
| **Python** | 3.13 | Langage backend et scraping |
| **FastAPI** | dernière | Framework API REST Python |
| **Uvicorn** | dernière | Serveur ASGI pour FastAPI |
| **neo4j (driver)** | dernière | Connexion Python → Neo4j |
| **Pydantic** | v2 | Validation des données API |
| **requests** | dernière | Requêtes HTTP pour le scraping |
| **Node.js** | 18+ | Runtime JavaScript pour React |
| **React** | 18 | Framework frontend JavaScript |
| **Axios** | dernière | Requêtes HTTP depuis React |
| **Leaflet** | dernière | Carte interactive OpenStreetMap |
| **OpenStreetMap** | — | Source des données géographiques |
| **Overpass API** | — | API de requête OSM |

---

## Choix techniques justifiés

### Neo4j vs SQL

| Critère | SQL (PostgreSQL) | Neo4j Graphe |
|---------|-----------------|--------------|
| Structure | Tables & colonnes | Nœuds & Relations |
| Géospatial | PostGIS (extension) | `point.distance()` natif |
| Requêtes voisins | Jointures lentes | Relations directes |
| Performance | Dégrade avec les JOINs | Constante |
| Flexibilité | Schéma rigide | Schéma flexible |

**Choix : Neo4j** — pour la simplicité des requêtes géospatiales et la performance native.

### FastAPI vs Flask vs Django

| Critère | Flask | Django | FastAPI |
|---------|-------|--------|---------|
| Performance | Moyenne | Faible | Haute |
| Documentation auto | Non | Non | Swagger auto |
| Validation données | Manuelle | Forms | Pydantic auto |
| Modernité | Ancien | Ancien | Moderne (async) |

**Choix : FastAPI** — pour la performance, la validation automatique et la documentation Swagger.

### OpenStreetMap vs Google Maps API

| Critère | Google Maps API | OpenStreetMap |
|---------|----------------|---------------|
| Coût | Payant au-delà d'un quota | 100% gratuit |
| Clé API | Obligatoire | Non requise |
| Couverture Maroc | Bonne | Très bonne |
| Open Data | Non | Oui (ODbL) |

**Choix : OpenStreetMap** — gratuit, légal, excellent pour le Maroc.

---

## Données — Ville de Rabat

**Bounding Box GPS utilisée :**
```
min_lat = 33.9500  |  min_lon = -6.9000
max_lat = 34.0500  |  max_lon = -6.7800
```


---

*Projet réalisé dans le cadre du module Bases de Données NoSQL — Master BDSI, USMBA Fès, 2025–2026*
