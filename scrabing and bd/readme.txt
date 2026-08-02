#1 Contraintes d'unicité
CREATE CONSTRAINT place_id IF NOT EXISTS 
FOR (p:Place) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT category_id IF NOT EXISTS 
FOR (c:Category) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT user_id IF NOT EXISTS 
FOR (u:User) REQUIRE u.id IS UNIQUE;

#2 Index pour recherche rapide
CREATE INDEX place_type IF NOT EXISTS FOR (p:Place) ON (p.type);
CREATE INDEX place_city IF NOT EXISTS FOR (p:Place) ON (p.city);
CREATE INDEX place_source IF NOT EXISTS FOR (p:Place) ON (p.source);

#3 Insérer les Catégories
CREATE (c1:Category {id: "cat1", name: "Sport",      icon: "🏃", slug: "sport",       color: "#4CAF50"})
CREATE (c2:Category {id: "cat2", name: "Urgence",    icon: "🚑", slug: "urgence",     color: "#F44336"})
CREATE (c3:Category {id: "cat3", name: "Tourisme",   icon: "🕌", slug: "tourisme",    color: "#9C27B0"})
CREATE (c4:Category {id: "cat4", name: "Restaurant", icon: "🍽️", slug: "restaurant",  color: "#FF9800"})
CREATE (c5:Category {id: "cat5", name: "Santé",      icon: "🏥", slug: "sante",       color: "#2196F3"})
CREATE (c6:Category {id: "cat6", name: "Étudiant",   icon: "🎓", slug: "etudiant",    color: "#607D8B"})

__________OSM (Overpass API)___________
scraper_osm.py

# 1. Installer les dépendances
pip install requests neo4j

# 2. Changer le mot de passe dans le script
# NEO4J_PASSWORD = "TON_MOT_DE_PASSE"

# 3. Lancer
python scraper_osm.py

# 4. Compter les lieux par catégorie
MATCH (p:Place)-[:BELONGS_TO]->(c:Category)
RETURN c.name, count(p) AS total
ORDER BY total DESC

# 5. missing
scraper_missing.py
scraper_final.py

# 6. TESTER BD 
## Vérifications DES PLACES

### 1️⃣ Voir tous les noeuds
```cypher
MATCH (n) RETURN n LIMIT 25
```

### 2️⃣ Compter par catégorie
```cypher
MATCH (p:Place)-[:BELONGS_TO]->(c:Category)
RETURN c.name, count(p) AS total
ORDER BY total DESC
```

### 3️⃣ Voir exemples de lieux
```cypher
MATCH (p:Place)-[:BELONGS_TO]->(c:Category {slug: "restaurant"})
RETURN p.name, p.latitude, p.longitude, p.address, p.phone
LIMIT 10
```

### 4️⃣ Vérifier les coordonnées GPS (pas nulles)
```cypher
MATCH (p:Place)
WHERE p.latitude IS NULL OR p.longitude IS NULL
RETURN count(p) AS sans_coordonnees
```

### 5️⃣ Vérifier les lieux avec nom correct
```cypher
MATCH (p:Place)
WHERE p.name = "Sans nom"
RETURN count(p) AS sans_nom
```

### 6️⃣ Tester la requête géospatiale (le plus important ✅)
```cypher
// Restaurants dans 1km autour du centre de Fès
MATCH (p:Place)-[:BELONGS_TO]->(c:Category {slug: "restaurant"})
WITH p,
     round(point.distance(
       point({latitude: p.latitude, longitude: p.longitude}),
       point({latitude: 34.0331, longitude: -5.0003})
     )) AS distance_m
WHERE distance_m <= 1000
RETURN p.name, p.address, distance_m
ORDER BY distance_m ASC
LIMIT 10
```

-----------------------------------------------
## Vérifier les Relations 

### 1️⃣ Voir toutes les relations existantes
```cypher
MATCH ()-[r]->()
RETURN type(r), count(r) AS total
```

### 2️⃣ Vérifier Place → Category
```cypher
MATCH (p:Place)-[r:BELONGS_TO]->(c:Category)
RETURN p.name, type(r), c.name
LIMIT 15
```

### 3️⃣ Vérifier visuellement (graph)
```cypher
MATCH (p:Place)-[:BELONGS_TO]->(c:Category)
RETURN p, c
LIMIT 20
```

### 4️⃣ Lieux SANS relation (problème si > 0)
```cypher
MATCH (p:Place)
WHERE NOT (p)-[:BELONGS_TO]->()
RETURN count(p) AS lieux_orphelins
```

### 5️⃣ Catégories SANS lieux (problème si existe)
```cypher
MATCH (c:Category)
WHERE NOT ()-[:BELONGS_TO]->(c)
RETURN c.name AS categorie_vide
```

### 6️⃣ Résumé complet de la BD
```cypher
MATCH (p:Place)-[:BELONGS_TO]->(c:Category)
RETURN 
  c.name        AS Categorie,
  count(p)      AS NombreLieux,
  count(p.phone) AS AvecTelephone,
  count(p.address) AS AvecAdresse
ORDER BY NombreLieux DESC
```

---

