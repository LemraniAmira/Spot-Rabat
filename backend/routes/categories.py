# routes/categories.py
from fastapi import APIRouter
from database import get_driver
from models import CategoryResponse

router = APIRouter()

@router.get("/categories", response_model=list[CategoryResponse])
def get_categories():
    """
    Retourne toutes les catégories disponibles
    Utilisé par l'Écran 1 (Accueil) du frontend
    """
    driver = get_driver()
    with driver.session(database="neo4j") as session:
        result = session.run("""
            MATCH (c:Category)
            RETURN c.id AS id,
                   c.name AS name,
                   c.slug AS slug,
                   c.icon AS icon,
                   c.color AS color
            ORDER BY c.name
        """)
        return [dict(record) for record in result]