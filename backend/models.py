# models.py
from pydantic import BaseModel
from typing import Optional

class PlaceResponse(BaseModel):
    id: str
    name: str
    type: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    latitude: float
    longitude: float
    distance_m: float

class CategoryResponse(BaseModel):
    id: str
    name: str
    slug: str
    icon: str
    color: str

class NearbyRequest(BaseModel):
    latitude: float
    longitude: float
    radius: int = 1000      # rayon en mètres (défaut 1km)
    category: str           # slug de la catégorie
    limit: int = 50         # nombre max de résultats