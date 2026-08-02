import requests
import time
from neo4j import GraphDatabase
from uuid import uuid4

NEO4J_URI      = "bolt://localhost:7687"
NEO4J_USER     = "neo4j"
NEO4J_PASSWORD = "VOTRE_MOT_DE_PASSE"  # ← remplacez par votre mot de passe Neo4j

MISSING_FILTERS = [
    ("tourism"  , '"tourism"="museum"'      , "cat3"),
    ("sport"    , '"leisure"="stadium"'     , "cat1"),
    ("etudiant" , '"amenity"="university"'  , "cat6"),
    ("etudiant" , '"amenity"="library"'     , "cat6"),
]

def scrape_filter(osm_filter):
    query = f"""
    [out:json][timeout:30];
    (
        node[{osm_filter}](33.9500,-6.9000,34.0500,-6.7800);
        way[{osm_filter}](33.9500,-6.9000,34.0500,-6.7800);
    );
    out center;
    """
    try:
        response = requests.get(
    "https://overpass-api.de/api/interpreter",
    params={"data": query},
    timeout=40,
    headers={"User-Agent": "geo-app-rabat/1.0 (student project)"}
)
        print(f"  📡 Status: {response.status_code}")
        if response.status_code == 200:
            return response.json().get("elements", [])
        else:
            print(f"  ❌ Erreur: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Exception: {e}")
    return []

def parse_place(element, category_type):
    lat = element.get("lat") or element.get("center", {}).get("lat")
    lon = element.get("lon") or element.get("center", {}).get("lon")
    if not lat or not lon:
        return None
    tags = element.get("tags", {})
    name = tags.get("name") or tags.get("name:fr") or tags.get("name:ar") or "Sans nom"
    return {
        "id"       : str(uuid4()),
        "osm_id"   : str(element.get("id")),
        "name"     : name,
        "type"     : category_type,
        "address"  : tags.get("addr:full") or tags.get("addr:street", ""),
        "phone"    : tags.get("phone") or tags.get("contact:phone", ""),
        "website"  : tags.get("website") or tags.get("contact:website", ""),
        "latitude" : lat,
        "longitude": lon,
        "city"     : "Rabat",
        "source"   : "openstreetmap"
    }

def import_to_neo4j(places, cat_id, driver):
    with driver.session(database="neo4j") as session:
        for place in places:
            session.run("""
                MERGE (p:Place {osm_id: $osm_id})
                SET p.id         = coalesce(p.id, $id),
                    p.name       = $name,
                    p.type       = $type,
                    p.address    = $address,
                    p.phone      = $phone,
                    p.website    = $website,
                    p.latitude   = $latitude,
                    p.longitude  = $longitude,
                    p.city       = $city,
                    p.source     = $source,
                    p.scraped_at = datetime()
                WITH p
                MATCH (c:Category {id: $cat_id})
                MERGE (p)-[:BELONGS_TO]->(c)
            """, {**place, "cat_id": cat_id})

def main():
    print("🚀 Connexion Neo4j...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    for category_type, osm_filter, cat_id in MISSING_FILTERS:
        print(f"\n📍 [{category_type.upper()}] Filtre: {osm_filter}")
        
        print("  ⏳ Attente 5s avant requête...")
        time.sleep(5)  # ← Évite le rate limit
        
        elements = scrape_filter(osm_filter)
        print(f"  ✅ {len(elements)} éléments trouvés")

        places = []
        for el in elements:
            p = parse_place(el, category_type)
            if p:
                places.append(p)

        print(f"  💾 Import {len(places)} lieux...")
        import_to_neo4j(places, cat_id, driver)

    driver.close()

    print("\n✅ Vérification finale...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session(database="neo4j") as session:
        result = session.run("""
            MATCH (p:Place)-[:BELONGS_TO]->(c:Category)
            RETURN c.name, count(p) AS total
            ORDER BY total DESC
        """)
        print("\n📊 Résultat final :")
        for record in result:
            print(f"  {record['c.name']:15} → {record['total']}")
    driver.close()

if __name__ == "__main__":
    main()
