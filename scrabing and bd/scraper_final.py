import requests
import time
from neo4j import GraphDatabase
from uuid import uuid4

NEO4J_URI      = "bolt://localhost:7687"
NEO4J_USER     = "neo4j"
NEO4J_PASSWORD = "EL2002EL"

MISSING = [
    ("tourisme", '"tourism"="museum"',     "cat3"),
    ("etudiant", '"amenity"="university"', "cat6"),
]

def scrape_with_retry(osm_filter, max_retries=3):
    query = f"""
    [out:json][timeout:60];
    (
      node[{osm_filter}](33.9500,-5.1000,34.1500,-4.9000);
      way[{osm_filter}](33.9500,-5.1000,34.1500,-4.9000);
    );
    out center;
    """
    for attempt in range(1, max_retries + 1):
        print(f"  🔄 Tentative {attempt}/{max_retries}...")
        try:
            response = requests.get(
                "https://overpass-api.de/api/interpreter",
                params={"data": query},
                timeout=60
            )
            print(f"  📡 Status: {response.status_code}")
            if response.status_code == 200:
                return response.json().get("elements", [])
            else:
                print(f"  ⚠️ Erreur {response.status_code} — attente 10s...")
                time.sleep(10)
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            time.sleep(10)
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
        "city"     : "Fès",
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

    for category_type, osm_filter, cat_id in MISSING:
        print(f"\n📍 [{category_type.upper()}] {osm_filter}")
        time.sleep(8)  # ← attente plus longue
        elements = scrape_with_retry(osm_filter)
        print(f"  ✅ {len(elements)} éléments trouvés")
        places = [p for el in elements if (p := parse_place(el, category_type))]
        print(f"  💾 Import {len(places)} lieux...")
        import_to_neo4j(places, cat_id, driver)

    # Résultat final
    with driver.session(database="neo4j") as session:
        result = session.run("""
            MATCH (p:Place)-[:BELONGS_TO]->(c:Category)
            RETURN c.name, count(p) AS total
            ORDER BY total DESC
        """)
        print("\n📊 Résultat final :")
        for r in result:
            print(f"  {r['c.name']:15} → {r['total']}")

    driver.close()

if __name__ == "__main__":
    main()