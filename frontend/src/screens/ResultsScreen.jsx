import { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import PlaceCard from '../components/PlaceCard';
import './ResultsScreen.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl:       require('leaflet/dist/images/marker-icon.png'),
  shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
});

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#C9A84C;border:2px solid #E2C97E;border-radius:50%;box-shadow:0 0 0 4px rgba(201,168,76,0.2),0 2px 8px rgba(0,0,0,0.5);"></div>`,
  iconSize: [14,14], iconAnchor: [7,7],
});
const placeIcon = L.divIcon({
  className: '',
  html: `<div style="width:10px;height:10px;background:#4A4540;border:1.5px solid #9A9080;border-radius:50%;"></div>`,
  iconSize: [10,10], iconAnchor: [5,5],
});
const selectedIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;background:#C9A84C;border:2.5px solid #E2C97E;border-radius:50%;box-shadow:0 0 0 6px rgba(201,168,76,0.25),0 0 20px rgba(201,168,76,0.4);animation:markerPulse 1.4s ease-in-out infinite;"></div>`,
  iconSize: [18,18], iconAnchor: [9,9],
});

const DISTANCE_OPTIONS = [
  { label: 'Tous',    value: Infinity },
  { label: '< 500m', value: 500 },
  { label: '< 1km',  value: 1000 },
  { label: '< 2km',  value: 2000 },
];
const SORT_OPTIONS = [
  { label: 'Distance', value: 'distance' },
  { label: 'Nom A→Z',  value: 'name' },
  { label: 'Type',     value: 'type' },
];

function SetView({ lat, lon }) {
  const map = useMap();
  useMemo(() => { if(lat && lon) map.setView([lat, lon], 15); }, [lat, lon, map]);
  return null;
}
function FlyToPlace({ place }) {
  const map = useMap();
  useEffect(() => {
    if (place) map.flyTo([place.latitude, place.longitude], 17, { animate: true, duration: 1.2 });
  }, [place, map]);
  return null;
}
function RoutingLine({ userLat, userLon, place }) {
  const map = useMap();
  const polyRef = useRef(null);
  useEffect(() => {
    if (polyRef.current) { polyRef.current.remove(); polyRef.current = null; }
    if (!place || !userLat || !userLon) return;
    const url = `https://router.project-osrm.org/route/v1/walking/${userLon},${userLat};${place.longitude},${place.latitude}?overview=full&geometries=geojson`;
    fetch(url).then(r=>r.json()).then(data => {
      if (data.routes?.[0]) {
        const coords = data.routes[0].geometry.coordinates.map(([lng,lat])=>[lat,lng]);
        polyRef.current = L.polyline(coords,{color:'#C9A84C',weight:3,opacity:0.8,lineCap:'round'}).addTo(map);
      }
    }).catch(()=>{
      if (!userLat || !userLon) return;
      polyRef.current = L.polyline([[userLat,userLon],[place.latitude,place.longitude]],{color:'#C9A84C',weight:2,opacity:0.6,dashArray:'6 4'}).addTo(map);
    });
    return () => { if(polyRef.current){ polyRef.current.remove(); polyRef.current=null; } };
  }, [place, map, userLat, userLon]);
  return null;
}

function OpeningHours({ hours }) {
  if (!hours) return null;
  const is24 = hours.includes('24/7');
  return (
    <div className="dp-info-row">
      <span className="dp-info-label">Horaires</span>
      <div className="dp-info-val">
        <span>{hours}</span>
        {is24 && <span className="dp-badge dp-badge-open">Ouvert 24h/24</span>}
      </div>
    </div>
  );
}

function DetailPanel({ place, categoryIcon, routeInfo, onClose }) {
  const fmt = (m) => m < 1000 ? `${m} m` : `${(m/1000).toFixed(1)} km`;
  const distColor = place.distance_m < 500 ? 'var(--green)' : place.distance_m < 1500 ? '#B8922A' : 'var(--red)';

  return (
    <div className="detail-panel">
      <div className="dp-header">
        <button className="dp-close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
        <div className="dp-header-content">
          <h2 className="dp-name">{place.name === 'Sans nom' ? 'Lieu sans nom' : place.name}</h2>
          {place.distance_m > 0 && (
            <span className="dp-dist" style={{ color: distColor }}>
              {fmt(place.distance_m)} à vol d'oiseau
            </span>
          )}
        </div>
      </div>

      <div className="dp-body">
        {routeInfo && (
          <div className="dp-route-card">
            <div className="dp-route-stat">
              <span className="dp-route-val">{routeInfo.distance}</span>
              <span className="dp-route-label">via les rues</span>
            </div>
            <div className="dp-route-sep" />
            <div className="dp-route-stat">
              <span className="dp-route-val">{routeInfo.duration}</span>
              <span className="dp-route-label">à pied</span>
            </div>
          </div>
        )}

        <div className="dp-info-block">
          {place.address && (
            <div className="dp-info-row">
              <span className="dp-info-label">Adresse</span>
              <span className="dp-info-val">{place.address}</span>
            </div>
          )}
          {place.phone && (
            <div className="dp-info-row">
              <span className="dp-info-label">Téléphone</span>
              <a href={`tel:${place.phone}`} className="dp-info-val dp-link">{place.phone}</a>
            </div>
          )}
          <OpeningHours hours={place.opening_hours} />
          <div className="dp-info-row">
            <span className="dp-info-label">Type</span>
            <span className="dp-info-val">{place.type}</span>
          </div>
          <div className="dp-info-row">
            <span className="dp-info-label">Coordonnées</span>
            <span className="dp-info-val dp-mono">{place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}</span>
          </div>
        </div>

        <div className="dp-actions">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
            target="_blank" rel="noreferrer"
            className="dp-action-primary"
          >
            <span>Ouvrir dans Google Maps</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <a
            href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}&zoom=18`}
            target="_blank" rel="noreferrer"
            className="dp-action-secondary"
          >OpenStreetMap</a>
          <button className="dp-action-secondary" onClick={() => {
            const text = `${place.name} — ${place.address||'Rabat, Maroc'}\nhttps://www.google.com/maps?q=${place.latitude},${place.longitude}`;
            if (navigator.share) navigator.share({title:place.name,text});
            else { navigator.clipboard.writeText(text); alert('Lien copié !'); }
          }}>Partager</button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

function ResultsScreen({ places, category, userLat, userLon, radius, isGlobalSearch, onBack }) {
  const [selected, setSelected]   = useState(null);
  const [search, setSearch]       = useState('');
  const [maxDist, setMaxDist]     = useState(Infinity);
  const [sortBy, setSortBy]       = useState('distance');
  const [page, setPage]           = useState(1);
  const [routeInfo, setRouteInfo] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const listRef = useRef(null);

  const fmt     = (r) => r >= 1000 ? `${r/1000} km` : `${r} m`;
  const fmtDist = (m) => m < 1000 ? `${m} m` : `${(m/1000).toFixed(1)} km`;

  const filtered = useMemo(() => {
    let result = places.filter(p => {
      const q = search.toLowerCase();
      return (p.name.toLowerCase().includes(q) || (p.address||'').toLowerCase().includes(q))
        && (isGlobalSearch ? true : p.distance_m <= maxDist);
    });
    if (sortBy === 'name')     result = [...result].sort((a,b) => a.name.localeCompare(b.name));
    if (sortBy === 'type')     result = [...result].sort((a,b) => (a.type||'').localeCompare(b.type||''));
    if (sortBy === 'distance') result = [...result].sort((a,b) => a.distance_m - b.distance_m);
    return result;
  }, [places, search, maxDist, sortBy, isGlobalSearch]);

  const displayed = filtered.slice(0, page * PAGE_SIZE);
  const hasMore   = displayed.length < filtered.length;

  const handleListScroll = (e) => setShowScrollTop(e.target.scrollTop > 200);
  const scrollToTop      = () => listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const handleSelectPlace = (place) => {
    setSelected(place); setRouteInfo(null);
    if (!userLat || !userLon) return;
    const url = `https://router.project-osrm.org/route/v1/walking/${userLon},${userLat};${place.longitude},${place.latitude}?overview=full&geometries=geojson`;
    fetch(url).then(r=>r.json()).then(data => {
      if (data.routes?.[0]) {
        const d = data.routes[0].distance, t = data.routes[0].duration;
        setRouteInfo({
          distance: d < 1000 ? `${Math.round(d)} m` : `${(d/1000).toFixed(1)} km`,
          duration: t < 60   ? `${Math.round(t)} s`  : `${Math.round(t/60)} min`,
        });
      }
    }).catch(()=>{});
  };

  const defaultLat = userLat || 34.0181;
  const defaultLon = userLon || -5.0078;

  return (
    <div className="res">
      {/* Topbar */}
      <div className="res-topbar">
        <button className="res-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="res-topbar-center">
          <h1 className="res-topbar-title">{category.name}</h1>
          <p className="res-topbar-sub">
            {filtered.length === places.length
              ? `${places.length} résultats${!isGlobalSearch ? ` · ${fmt(radius)}` : ''}`
              : `${displayed.length} / ${filtered.length} résultats`}
          </p>
        </div>
        {selected && (
          <button className="res-list-btn" onClick={() => { setSelected(null); setRouteInfo(null); }}>
            Liste
          </button>
        )}
      </div>

      {/* Contrôles */}
      {!selected && (
        <div className="res-controls">
          <div className="res-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="res-search"
              placeholder="Nom ou adresse…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {search && (
              <button className="res-search-x" onClick={() => { setSearch(''); setPage(1); }}>×</button>
            )}
          </div>
          <div className="res-ctrl-row">
            {!isGlobalSearch && (
              <div className="res-filters">
                {DISTANCE_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    className={`res-chip ${maxDist === o.value ? 'active' : ''}`}
                    onClick={() => { setMaxDist(o.value); setPage(1); }}
                  >{o.label}</button>
                ))}
              </div>
            )}
            <select
              className="res-sort"
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Layout principal */}
      <div className="res-main">
        {/* Carte */}
        {!isGlobalSearch && (
          <div className="res-map-wrap">
            <MapContainer center={[defaultLat,defaultLon]} zoom={15} className="res-map" zoomControl={true}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OSM"/>
              <SetView lat={defaultLat} lon={defaultLon}/>
              <FlyToPlace place={selected}/>
              {userLat && userLon && <RoutingLine userLat={userLat} userLon={userLon} place={selected}/>}
              {userLat && userLon && (
                <>
                  <Circle center={[userLat,userLon]} radius={radius}
                    pathOptions={{color:'#C9A84C',fillColor:'#C9A84C',fillOpacity:0.05,weight:1,dashArray:'5 5'}}/>
                  <Marker position={[userLat,userLon]} icon={userIcon}>
                    <Popup><strong>Vous êtes ici</strong></Popup>
                  </Marker>
                </>
              )}
              {filtered.map(place => {
                const isSel = selected?.id === place.id;
                return (
                  <Marker key={place.id} position={[place.latitude,place.longitude]}
                    icon={isSel ? selectedIcon : placeIcon} zIndexOffset={isSel ? 1000 : 0}
                    eventHandlers={{click:()=>handleSelectPlace(place)}}>
                    <Popup>
                      <strong style={{fontSize:13,color:'var(--text)'}}>{place.name==='Sans nom'?'Lieu':place.name}</strong><br/>
                      {place.distance_m>0 && <span style={{color:'#C9A84C',fontWeight:600}}>{fmtDist(place.distance_m)}</span>}
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            <div className="map-legend">
              <div className="map-leg-item"><span className="map-dot you"/>Vous</div>
              <div className="map-leg-item"><span className="map-dot place"/>Lieu</div>
              <div className="map-leg-item"><span className="map-dot sel"/>Sélectionné</div>
              {selected && <div className="map-leg-item"><span className="map-line"/>Trajet</div>}
            </div>
          </div>
        )}

        {/* Panel droit */}
        <div className={`res-right ${isGlobalSearch ? 'full' : ''}`}>
          {selected ? (
            <DetailPanel
              place={selected}
              categoryIcon={category.icon}
              routeInfo={routeInfo}
              onClose={() => { setSelected(null); setRouteInfo(null); }}
            />
          ) : (
            <div className="res-list" ref={listRef} onScroll={handleListScroll}>
              {/* Header liste */}
              <div className="res-list-header">
                <span className="res-list-kicker">Résultats</span>
                <span className="res-list-count">{filtered.length} lieux trouvés</span>
              </div>

              {filtered.length === 0 ? (
                <div className="res-empty">
                  <p className="res-empty-title">Aucun résultat</p>
                  <p className="res-empty-sub">Essaie un autre terme ou filtre</p>
                </div>
              ) : (
                <>
                  {displayed.map((place, i) => (
                    <PlaceCard key={place.id} place={place} index={i}
                      onClick={() => handleSelectPlace(place)}/>
                  ))}
                  {hasMore && (
                    <button className="res-load-more" onClick={() => setPage(p => p + 1)}>
                      Afficher {filtered.length - displayed.length} résultats supplémentaires
                    </button>
                  )}
                  {showScrollTop && (
                    <button className="res-scroll-top" onClick={scrollToTop}>↑</button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultsScreen;
