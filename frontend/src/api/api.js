import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:8000/api' });

export function getCategories() {
  return API.get('/categories');
}

export function getNearbyPlaces(latitude, longitude, radius, category) {
  return API.post('/places/nearby', { latitude, longitude, radius, category });
}

export function getPlaceDetail(id) {
  return API.get(`/places/${id}`);
}

// ✅ Nouveau — Recherche globale par nom
export function searchPlaces(query) {
  return API.get('/places/search', { params: { q: query, limit: 20 } });
}