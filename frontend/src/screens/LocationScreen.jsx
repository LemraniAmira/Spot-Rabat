import { useState } from 'react';
import './LocationScreen.css';

const RADII = [
  { label: '500m',  value: 500,  desc: 'À pied · ~6 min' },
  { label: '1 km',  value: 1000, desc: 'Proche · ~12 min' },
  { label: '5 km',  value: 5000, desc: 'Large  · ~25 min' },
];

function LocationScreen({ category, onSearch, onBack, error }) {
  const [radius, setRadius]   = useState(1000);
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const handleSearch = () => {
    setLoading(true); setGpsError('');
    const RABAT_LAT = 33.9716, RABAT_LNG = -6.8498;
    setTimeout(() => { onSearch(RABAT_LAT, RABAT_LNG, radius); setLoading(false); }, 500);
  };

  const errMsg = gpsError || error;

  return (
    <div className="loc">
      <div className="loc-topbar">
        <button className="loc-back" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className="loc-topbar-info">
          <span className="loc-topbar-label">Zone de recherche</span>
          <span className="loc-topbar-cat">{category.name}</span>
        </div>
      </div>

      <div className="loc-body">
        {/* Carte catégorie */}
        <div className="loc-cat-banner">
          <div className="loc-cat-banner-orb" />
          <div className="loc-cat-text">
            <span className="loc-cat-kicker">Service sélectionné</span>
            <h2 className="loc-cat-name">{category.name}</h2>
          </div>
          <div className="loc-cat-check">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        </div>

        {/* Sélecteur rayon */}
        <div className="loc-section">
          <p className="loc-section-label">Rayon de recherche</p>
          <div className="loc-radii">
            {RADII.map(r => (
              <button
                key={r.value}
                className={`loc-radius-btn ${radius === r.value ? 'active' : ''}`}
                onClick={() => setRadius(r.value)}
              >
                <span className="loc-radius-val">{r.label}</span>
                <span className="loc-radius-sub">{r.desc}</span>
                {radius === r.value && <div className="loc-radius-ring" />}
              </button>
            ))}
          </div>
        </div>

        {/* Info localisation */}
        <div className="loc-info-card">
          <div className="loc-info-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
              <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <p className="loc-info-text">
            Localisation fixée sur le centre de <strong>Rabat</strong>. Les résultats seront triés par distance réelle.
          </p>
        </div>

        {errMsg && (
          <div className="loc-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {errMsg}
          </div>
        )}

        <button className="loc-search-btn" onClick={handleSearch} disabled={loading}>
          {loading ? (
            <><span className="loc-spinner"/><span>Localisation…</span></>
          ) : (
            <>
              <span>Lancer la recherche</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default LocationScreen;
