import requests, uuid, re, time
from datetime import datetime
from neo4j import GraphDatabase

NEO4J_URI      = "neo4j://127.0.0.1:7687"
NEO4J_USER     = "neo4j"
NEO4J_PASSWORD = "EL2002EL"

OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]
BBOX = "33.9500,-6.9000,34.0500,-6.7800"

CATEGORIES = [
    { "slug": "restaurant", "filters": ['amenity~"restaurant|cafe|fast_food|food_court|bar"'] },
    { "slug": "sante",      "filters": ['amenity~"hospital|clinic|pharmacy|doctors|dentist"'] },
    { "slug": "urgence",    "filters": ['amenity~"hospital|police|fire_station"'] },
    { "slug": "tourisme",   "filters": ['tourism~"hotel|museum|attraction|viewpoint|guest_house"', 'amenity~"place_of_worship"'] },
    { "slug": "sport",      "filters": ['leisure~"sports_centre|stadium|swimming_pool|fitness_centre|pitch"'] },
    { "slug": "etudiant",   "filters": ['amenity~"university|school|college|library"'] },
]

def build_query(osm_filter):
    return (f'[out:json][timeout:60];(node[{osm_filter}]({BBOX});way[{osm_filter}]({BBOX}););out center;')

def fetch_from_overpass(query):
    for server in OVERPASS_SERVERS:
        for attempt in range(2):
            try:
                print(f"    → {server[:45]}... (tentative {attempt+1})")
                response = requests.get(server, params={"data": query}, timeout=60,
                                        headers={"User-Agent": "SpotRabat/1.0"}
                response.raise_for_status()
                elements = response.json().get("elements", [])
                print(f"    ✅ {len(elements)} éléments reçus")
                return elements
            except requests.exceptions.Timeout:
                print(f"    ⏱️  Timeout — attente 10s..."); time.sleep(10)
            except requests.exceptions.HTTPError as e:
                code = e.response.status_code if e.response else "?"
                wait = 30 if code==429 else 15
                print(f"    ⚠️  HTTP {code} — attente {wait}s..."); time.sleep(wait)
                if code not in [429,504]: break
            except Exception as e:
                print(f"    ❌ {e}"); break
        time.sleep(5)
    return []

def scrape_category(category):
    print(f"\n{'='*50}\n  Scraping : {category['slug'].upper()}\n{'='*50}")
    all_places, seen = [], set()

    for osm_filter in category["filters"]:
        print(f"\n  Filtre : [{osm_filter}]")
        elements = fetch_from_overpass(build_query(osm_filter))
        time.sleep(8)

        for el in elements:
            osm_id = str(el.get("id",""))
            if osm_id in seen: continue
            seen.add(osm_id)

            if el["type"] == "node":
                lat, lon = el.get("lat"), el.get("lon")
            elif "center" in el:
                lat, lon = el["center"].get("lat"), el["center"].get("lon")
            else:
                continue
            if lat is None or lon is None: continue

            tags = el.get("tags", {})
            all_places.append({
                "osm_id":        osm_id,
                "name":          tags.get("name") or tags.get("name:fr") or tags.get("name:ar") or tags.get("name:en") or "",
                "type":          tags.get("amenity") or tags.get("tourism") or tags.get("leisure") or tags.get("historic") or "unknown",
                "address":       build_address(tags),
                "phone":         clean_phone(tags.get("phone") or tags.get("contact:phone") or ""),
                "website":       tags.get("website") or tags.get("contact:website") or "",
                # ✅ Horaires d'ouverture
                "opening_hours": tags.get("opening_hours") or tags.get("opening_hours:covid19") or "",
                "latitude":      lat,
                "longitude":     lon,
                "city":          "Rabat",
                "source":        "openstreetmap",
            })

    print(f"\n  → {len(all_places)} lieux collectés")
    return all_places

def build_address(tags):
    parts = []
    if tags.get("addr:housenumber"): parts.append(tags["addr:housenumber"])
    if tags.get("addr:street"):      parts.append(tags["addr:street"])
    if tags.get("addr:suburb"):      parts.append(tags["addr:suburb"])
    if tags.get("addr:city"):        parts.append(tags["addr:city"])
    return ", ".join(parts) if parts else ""

def clean_phone(phone):
    if not phone: return ""
    cleaned = re.sub(r"[^\d\+\s\-]", "", phone).strip()
    return cleaned if len(cleaned) >= 8 else ""

NOMS_INVALIDES = {"yes","no","true","false","-","?","n/a","none",""}

def clean_places(places):
    original, cleaned = len(places), []
    sans_nom = doublons = 0
    seen_coords = {}

    for p in places:
        name = (p["name"] or "").strip()
        if not name or name.lower() in NOMS_INVALIDES:
            sans_nom += 1; continue
        lat, lon = p["latitude"], p["longitude"]
        if not (-90<=lat<=90) or not (-180<=lon<=180): continue
        coord_key = f"{round(lat,5)},{round(lon,5)}"
        if coord_key in seen_coords:
            doublons += 1; continue
        seen_coords[coord_key] = True
        p["name"] = re.sub(r"\s+"," ", name.strip())
        p["id"] = str(uuid.uuid4())
        p["scraped_at"] = datetime.now().isoformat()
        cleaned.append(p)

    print(f"  Avant:{original} | Sans nom:{sans_nom} | Doublons:{doublons} | ✅ Gardés:{len(cleaned)}")
    return cleaned

def update_neo4j(driver, places, slug):
    if not places:
        print(f"  ⏭️  Rien à importer"); return 0

    print(f"\n  💾 Import Neo4j — {slug} ({len(places)} lieux)")
    imported = 0

    with driver.session() as session:
        for i in range(0, len(places), 100):
            batch = places[i:i+100]
            try:
                session.run("""
                    UNWIND $places AS p
                    MERGE (place:Place {osm_id: p.osm_id, type: p.type})
                    ON CREATE SET
                        place.id            = p.id,
                        place.name          = p.name,
                        place.type          = p.type,
                        place.address       = p.address,
                        place.phone         = p.phone,
                        place.website       = p.website,
                        place.opening_hours = p.opening_hours,
                        place.latitude      = p.latitude,
                        place.longitude     = p.longitude,
                        place.city          = p.city,
                        place.source        = p.source,
                        place.scraped_at    = p.scraped_at
                    ON MATCH SET
                        place.name          = p.name,
                        place.type          = p.type,
                        place.address       = p.address,
                        place.phone         = p.phone,
                        place.website       = p.website,
                        place.opening_hours = p.opening_hours,
                        place.latitude      = p.latitude,
                        place.longitude     = p.longitude,
                        place.scraped_at    = p.scraped_at
                    WITH place
                    MATCH (cat:Category {slug: $slug})
                    MERGE (place)-[:BELONGS_TO]->(cat)
                """, places=[dict(p) for p in batch], slug=slug)
                print(f"    Batch {i//100+1} : ✅ {len(batch)} traités")
                imported += len(batch)
            except Exception as e:
                print(f"    Batch {i//100+1} : ❌ {e}")

    return imported

def clean_database(driver):
    print(f"\n{'='*50}\n  🧹 Nettoyage BD\n{'='*50}")
    with driver.session() as session:
        before = session.run("MATCH (p:Place) RETURN count(p) AS n").single()["n"]
        session.run("""
            MATCH (p:Place)
            WHERE p.name IS NULL OR trim(p.name) = ''
               OR toLower(p.name) IN ['yes','no','true','false','-','?']
            DETACH DELETE p
        """)
        after = session.run("MATCH (p:Place) RETURN count(p) AS n").single()["n"]
        print(f"  Avant:{before} | Supprimés:{before-after} | Après:{after}")

def print_stats(driver):
    print(f"\n{'='*50}\n  📊 STATISTIQUES FINALES\n{'='*50}")
    with driver.session() as session:
        total = session.run("MATCH (p:Place) RETURN count(p) AS n").single()["n"]
        print(f"  Total : {total}\n")
        cats = session.run("""
            MATCH (p:Place)-[:BELONGS_TO]->(c:Category)
            RETURN c.name AS cat, c.icon AS icon, count(p) AS total
            ORDER BY total DESC
        """)
        for r in cats:
            bar = "█" * min(int(r['total']/50), 30)
            print(f"  {r['icon']}  {r['cat']:<15} : {r['total']:>5}  {bar}")

        # Stats opening_hours
        with_hours = session.run("MATCH (p:Place) WHERE p.opening_hours IS NOT NULL AND p.opening_hours <> '' RETURN count(p) AS n").single()["n"]
        print(f"\n  🕐 Avec horaires : {with_hours} lieux ({round(with_hours/total*100)}%)")

def main():
    print("\n" + "█"*52)
    print("█      SpotRabat — Pipeline Big Data v3             █")
    print("█  Scraping OSM → Nettoyage → Neo4j + Horaires      █")
    print("█"*52)
    print(f"  Démarré : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        print("  ✅ Neo4j connecté !\n")
    except Exception as e:
        print(f"  ❌ Connexion impossible : {e}"); return

    total = 0
    for category in CATEGORIES:
        raw   = scrape_category(category)
        clean = clean_places(raw)
        n     = update_neo4j(driver, clean, category["slug"])
        total += n
        print(f"\n  ⏳ Pause 12s...")
        time.sleep(12)

    clean_database(driver)
    print_stats(driver)
    driver.close()

    print("\n" + "█"*52)
    print(f"  ✅ Pipeline terminé ! Importés : {total}")
    print(f"  Terminé : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("█"*52 + "\n")

if __name__ == "__main__":
    main()