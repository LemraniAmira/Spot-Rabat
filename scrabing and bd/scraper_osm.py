import requests
import time
from neo4j import GraphDatabase
from uuid import uuid4

# ================================
# CONFIG NEO4J
# ================================
NEO4J_URI      = "bolt://localhost:7687"
NEO4J_USER     = "neo4j"
NEO4J_PASSWORD = "EL2002EL"  # ← change ici

# ================================
# CATEGORIES A SCRAPER
# ================================
CATEGORIES = {
    "restaurant": {
        "slug": "restaurant",
        "cat_id": "cat4",
        "osm_filters": [
            '"amenity"="restaurant"',
            '"amenity"="fast_food"',
            '"amenity"="cafe"'
        ]
    },
    "sante": {
        "slug": "sante",
        "cat_id": "cat5",
        "osm_filters": [
            '"amenity"="hospital"',
            '"amenity"="clinic"',
            '"amenity"="pharmacy"',
            '"amenity"="doctors"'
        ]
    },
    "urgence": {
        "slug": "urgence",
        "cat_id": "cat2",
        "osm_filters": [
            '"amenity"="hospital"',
            '"amenity"="police"',
            '"amenity"="fire_station"'
        ]
    },
    "tourisme": {
        "slug": "tourisme",
        "cat_id": "cat3",
        "osm_filters": [
            '"tourism"="attraction"',
            '"tourism"="museum"',
            '"tourism"="hotel"',
            '"amenity"="place_of_worship"'
        ]
    },
    "sport": {
        "slug": "sport",
        "cat_id": "cat1",
        "osm_filters": [
            '"leisure"="sports_centre"',
            '"leisure"="stadium"',
            '"leisure"="fitness_centre"',
            '"leisure"="swimming_pool"'
        ]
    },
    "etudiant": {
        "slug": "etudiant",
        "cat_id": "cat6",
        "osm_filters": [
            '"amenity"="university"',
            '"amenity"="college"',
            '"amenity"="school"',
            '"amenity"="library"'
        ]
    }
}

# ================================
# SCRAPER OSM
# ================================
def scrape_category(osm_filter):
    # Utiliser les coordonnées GPS de Rabat directement (bbox)
    # bbox = (min_lat, min_lon, max_lat, max_lon)
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
            data = response.json()
            return data.get("elements", [])
        else:
            print(f"  ❌ Erreur HTTP: {response.text[:200]}")
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
    return []

def parse_place(element, category_type):
    # Récupérer lat/lon (node direct ou way avec center)
    lat = element.get("lat") or element.get("center", {}).get("lat")
    lon = element.get("lon") or element.get("center", {}).get("lon")
    
    if not lat or not lon:
        return None

    tags = element.get("tags", {})
    name = (
        tags.get("name") or
        tags.get("name:fr") or
        tags.get("name:ar") or
        "Sans nom"
    )

    return {
        "id": str(uuid4()),
        "osm_id": str(element.get("id")),
        "name": name,
        "type": category_type,
        "address": tags.get("addr:full") or tags.get("addr:street", ""),
        "phone": tags.get("phone") or tags.get("contact:phone", ""),
        "website": tags.get("website") or tags.get("contact:website", ""),
        "latitude": lat,
        "longitude": lon,
        "city": "Rabat",
        "source": "openstreetmap"
    }

# ================================
# IMPORT NEO4J
# ================================
def import_to_neo4j(places, cat_id, driver):
    with driver.session(database="neo4j") as session:
        for place in places:
            session.run("""
                MERGE (p:Place {osm_id: $osm_id})
                SET p.id        = coalesce(p.id, $id),
                    p.name      = $name,
                    p.type      = $type,
                    p.address   = $address,
                    p.phone     = $phone,
                    p.website   = $website,
                    p.latitude  = $latitude,
                    p.longitude = $longitude,
                    p.city      = $city,
                    p.source    = $source,
                    p.scraped_at = datetime()
                WITH p
                MATCH (c:Category {id: $cat_id})
                MERGE (p)-[:BELONGS_TO]->(c)
            """, {**place, "cat_id": cat_id})

# ================================
# MAIN
# ================================
def main():
    print("🚀 Connexion à Neo4j...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    total = 0

    for category_name, config in CATEGORIES.items():
        print(f"\n📍 Scraping : {category_name.upper()}")
        places_collected = []

        for osm_filter in config["osm_filters"]:
            print(f"  🔍 Filtre: {osm_filter}")
            elements = scrape_category(osm_filter)
            print(f"  ✅ {len(elements)} éléments trouvés")

            for el in elements:
                place = parse_place(el, category_name)
                if place:
                    places_collected.append(place)

            time.sleep(2)  # Respecter le rate limit OSM

        # Dédoublonner par osm_id
        seen = set()
        unique_places = []
        for p in places_collected:
            if p["osm_id"] not in seen:
                seen.add(p["osm_id"])
                unique_places.append(p)

        print(f"  💾 Import {len(unique_places)} lieux uniques dans Neo4j...")
        import_to_neo4j(unique_places, config["cat_id"], driver)
        total += len(unique_places)

    driver.close()
    print(f"\n🎉 DONE ! {total} lieux importés dans Neo4j !")

if __name__ == "__main__":
    main()
