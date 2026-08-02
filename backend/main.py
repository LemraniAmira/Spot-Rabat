# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.categories import router as categories_router
from routes.places import router as places_router

# ─────────────────────────────────────
# Création de l'application FastAPI
# ─────────────────────────────────────
app = FastAPI(
    title="GeoSearch Rabat API",
    description="API de géolocalisation des services de proximité à Rabat",
    version="1.0.0"
)

# ─────────────────────────────────────
# CORS — Autoriser le Frontend React
# ─────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # URL du frontend React
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────
# Enregistrer les routes
# ─────────────────────────────────────
app.include_router(categories_router, prefix="/api")
app.include_router(places_router,     prefix="/api")

# ─────────────────────────────────────
# Route de test
# ─────────────────────────────────────
@app.get("/")
def root():
    return {"message": "GeoSearch Rabat API", "status": "running"}
