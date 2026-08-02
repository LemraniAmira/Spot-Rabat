from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from database import get_driver

router = APIRouter()


class NearbyRequest(BaseModel):
    latitude:  float
    longitude: float
    radius:    float = 1000
    category:  str
    limit:     int   = 50


# ── GET /places/search — Recherche globale par nom ──
@router.get("/places/search")
def search_places(
    q:     str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100),
):
    driver = get_driver()
    with driver.session() as session:
        result = session.run("""
            MATCH (p:Place)-[:BELONGS_TO]->(c:Category)
            WHERE toLower(p.name) CONTAINS toLower($query)
               OR toLower(p.address) CONTAINS toLower($query)
            RETURN
                p.id            AS id,
                p.name          AS name,
                p.type          AS type,
                p.address       AS address,
                p.phone         AS phone,
                p.latitude      AS latitude,
                p.longitude     AS longitude,
                p.opening_hours AS opening_hours,
                c.slug          AS category_slug,
                c.icon          AS category_icon,
                c.name          AS category_name,
                c.color         AS category_color
            ORDER BY p.name ASC
            LIMIT $limit
        """, query=q, limit=limit)

        places = []
        for r in result:
            places.append({
                "id":             r["id"],
                "name":           r["name"],
                "type":           r["type"],
                "address":        r["address"] or "",
                "phone":          r["phone"] or "",
                "latitude":       r["latitude"],
                "longitude":      r["longitude"],
                "opening_hours":  r["opening_hours"] or "",
                "category_slug":  r["category_slug"],
                "category_icon":  r["category_icon"],
                "category_name":  r["category_name"],
                "category_color": r["category_color"],
                "distance_m":     0,
            })

    return places


# ── POST /places/nearby — Lieux proches ──
@router.post("/places/nearby")
def get_nearby_places(req: NearbyRequest):
    driver = get_driver()
    with driver.session() as session:
        result = session.run("""
            MATCH (p:Place)-[:BELONGS_TO]->(c:Category {slug: $category})
            WITH p, c,
                 round(point.distance(
                   point({latitude: p.latitude, longitude: p.longitude}),
                   point({latitude: $latitude,  longitude: $longitude})
                 )) AS distance_m
            WHERE distance_m <= $radius
            RETURN
                p.id            AS id,
                p.name          AS name,
                p.type          AS type,
                p.address       AS address,
                p.phone         AS phone,
                p.latitude      AS latitude,
                p.longitude     AS longitude,
                p.opening_hours AS opening_hours,
                c.slug          AS category_slug,
                c.icon          AS category_icon,
                c.color         AS category_color,
                distance_m
            ORDER BY distance_m ASC
            LIMIT $limit
        """,
            category=req.category,
            latitude=req.latitude,
            longitude=req.longitude,
            radius=req.radius,
            limit=req.limit,
        )

        places = []
        for r in result:
            places.append({
                "id":             r["id"],
                "name":           r["name"],
                "type":           r["type"],
                "address":        r["address"] or "",
                "phone":          r["phone"] or "",
                "latitude":       r["latitude"],
                "longitude":      r["longitude"],
                "opening_hours":  r["opening_hours"] or "",
                "category_slug":  r["category_slug"],
                "category_icon":  r["category_icon"],
                "category_color": r["category_color"],
                "distance_m":     int(r["distance_m"] or 0),
            })

    return places


# ── GET /places/{id} — Détail d'un lieu ──
@router.get("/places/{place_id}")
def get_place_detail(place_id: str):
    driver = get_driver()
    with driver.session() as session:
        result = session.run("""
            MATCH (p:Place {id: $id})-[:BELONGS_TO]->(c:Category)
            RETURN
                p.id            AS id,
                p.name          AS name,
                p.type          AS type,
                p.address       AS address,
                p.phone         AS phone,
                p.website       AS website,
                p.latitude      AS latitude,
                p.longitude     AS longitude,
                p.opening_hours AS opening_hours,
                p.city          AS city,
                p.source        AS source,
                c.name          AS category_name,
                c.icon          AS category_icon,
                c.color         AS category_color
        """, id=place_id)

        record = result.single()
        if not record:
            raise HTTPException(status_code=404, detail="Lieu non trouvé")

        return {
            "id":             record["id"],
            "name":           record["name"],
            "type":           record["type"],
            "address":        record["address"] or "",
            "phone":          record["phone"] or "",
            "website":        record["website"] or "",
            "latitude":       record["latitude"],
            "longitude":      record["longitude"],
            "opening_hours":  record["opening_hours"] or "",
            "city":           record["city"] or "Rabat",
            "source":         record["source"] or "",
            "category_name":  record["category_name"],
            "category_icon":  record["category_icon"],
            "category_color": record["category_color"],
        }