import { useEffect, useState, useRef } from 'react';
import { getCategories, searchPlaces } from '../api/api';
import './HomeScreen.css';

const SERVICE_DETAILS = {
  restaurant: { desc: "Restaurants, cafés & gastronomie",    tag: "Gastronomie" },
  sante:      { desc: "Hôpitaux, pharmacies, médecins",         tag: "Santé"       },
  urgence:    { desc: "Urgences, police & pompiers",             tag: "Urgence"     },
  tourisme:   { desc: "Mosquées, musées, hôtels & culture",     tag: "Tourisme"    },
  sport:      { desc: "Stades, salles de sport & piscines",      tag: "Sport"       },
  etudiant:   { desc: "Universités, écoles & bibliothèques",    tag: "Éducation"   },
};

function HomeScreen({ onSelectCategory, onGlobalSearch }) {
  const [categories, setCategories]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [showResults, setShowResults]     = useState(false);
  const [activeTag, setActiveTag]         = useState(null);
  const searchRef   = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    getCategories()
      .then(res => setCategories(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowResults(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setSearchResults([]); setShowResults(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchPlaces(val.trim());
        setSearchResults(res.data.slice(0, 6));
        setShowResults(true);
      } catch {}
      finally { setSearching(false); }
    }, 400);
  };

  const handleSearchSubmit = async () => {
    if (search.trim().length < 2) return;
    setShowResults(false);
    try {
      const res = await searchPlaces(search.trim());
      onGlobalSearch(res.data, search.trim());
    } catch {}
  };

  const handleResultClick = (place) => {
    setShowResults(false); setSearch('');
    onGlobalSearch([place], place.name);
  };

  const filtered = activeTag
    ? categories.filter(c => (SERVICE_DETAILS[c.slug]?.tag || c.name) === activeTag)
    : categories;

  return (
    <div className="home">

      {/* ══ HERO CINÉMATIQUE ══ */}
      <header className="home-hero">
        <div className="home-hero-noise" />
        <div className="home-hero-orb orb1" />
        <div className="home-hero-orb orb2" />
        <div className="home-hero-orb orb3" />

        <div className="home-hero-inner">
          <div className="home-eyebrow">
            <span className="home-eyebrow-line" />
            <span>Rabat · Maroc</span>
            <span className="home-eyebrow-dot" />
            <span>Services de proximité</span>
            <span className="home-eyebrow-line" />
          </div>

          <h1 className="home-title">
            <span className="home-title-sm">Découvrez</span>
            <span className="home-title-lg">Spot<em> Rabat</em></span>
            <span className="home-title-sm right">autrement</span>
          </h1>

          <p className="home-sub">
            Explorez Rabat — restaurants, soins, culture, sport &amp; plus encore,
            <br />localisés autour de vous en quelques secondes.
          </p>

          {/* Barre de recherche */}
          <div className="home-search-wrap" ref={searchRef}>
            <div className="home-search-glass">
              <div className="home-search-bar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  className="home-search-input"
                  placeholder="Rechercher un lieu, restaurant, hôpital…"
                  value={search}
                  onChange={handleSearchChange}
                  onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
                />
                {searching && <span className="home-search-spinner" />}
                {search && !searching && (
                  <button className="home-search-clear" onClick={() => { setSearch(''); setShowResults(false); }}>×</button>
                )}
              </div>
              <button
                className="home-search-btn"
                onClick={handleSearchSubmit}
                disabled={search.trim().length < 2}
              >
                <span>Chercher</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            {showResults && searchResults.length > 0 && (
              <div className="home-search-dropdown">
                {searchResults.map((place, i) => (
                  <div key={place.id || i} className="hsr-item" onClick={() => handleResultClick(place)}>
                    <div className="hsr-pin">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                        <path d="M12 21s-8-7.5-8-12a8 8 0 1 1 16 0c0 4.5-8 12-8 12z"/>
                        <circle cx="12" cy="9" r="2.5"/>
                      </svg>
                    </div>
                    <div className="hsr-info">
                      <div className="hsr-name">{place.name}</div>
                      {place.address && <div className="hsr-addr">{place.address}</div>}
                    </div>
                  </div>
                ))}
                <div className="hsr-more" onClick={handleSearchSubmit}>Voir tous les résultats →</div>
              </div>
            )}
          </div>

          {/* Stats rapides */}
          <div className="home-quick-stats">
            <div className="home-qs-item"><strong>2 031</strong><span>lieux</span></div>
            <div className="home-qs-sep" />
            <div className="home-qs-item"><strong>6</strong><span>catégories</span></div>
            <div className="home-qs-sep" />
            <div className="home-qs-item"><strong>OSM</strong><span>données open source</span></div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="home-scroll-hint">
          <span>Explorer</span>
          <div className="home-scroll-line" />
        </div>
      </header>

      {/* ══ SECTION CATÉGORIES ══ */}
      <section className="home-cats-section">
        <div className="home-cats-header">
          <div className="home-cats-title-wrap">
            <h2 className="home-cats-title">Choisissez un service</h2>
            <p className="home-cats-subtitle">Tous les services essentiels de Rabat à portée de main</p>
          </div>

          {/* Filtres tags */}
          <div className="home-tags">
            <button
              className={`home-tag ${!activeTag ? 'active' : ''}`}
              onClick={() => setActiveTag(null)}
            >Tous</button>
            {Object.values(SERVICE_DETAILS).map(d => d.tag).filter((v,i,a) => a.indexOf(v) === i).map(tag => (
              <button
                key={tag}
                className={`home-tag ${activeTag === tag ? 'active' : ''}`}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              >{tag}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="home-grid">
            {[...Array(6)].map((_,i) => <div key={i} className="cat-skeleton" />)}
          </div>
        ) : (
          <div className="home-grid">
            {filtered.map((cat, i) => {
              const d = SERVICE_DETAILS[cat.slug] || {};
              return (
                <button
                  key={cat.id}
                  className="cat-card"
                  style={{ animationDelay: `${i * 0.06}s` }}
                  onClick={() => onSelectCategory(cat)}
                >
                  <div className="cat-card-inner">
                    <div className="cat-card-top">
                      <span className="cat-tag-label">{d.tag || cat.name}</span>
                      <svg className="cat-arrow-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                        <path d="M7 17L17 7M17 7H7M17 7v10"/>
                      </svg>
                    </div>
                    <h3 className="cat-name">{cat.name}</h3>
                    <p className="cat-desc">{d.desc}</p>
                    <div className="cat-card-foot">
                      
                      <div className="cat-shimmer-bar" />
                    </div>
                  </div>
                  <div className="cat-card-bg" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ══ BAND DÉCORATIF ══ */}
      <div className="home-marquee-band">
        {['RABAT', 'MAROC', 'SPOT', 'SERVICES', 'PROXIMITÉ', 'EXPLORER', 'DÉCOUVRIR', 'RABAT', 'MAROC', 'SPOT'].map((w, i) => (
          <span key={i} className={i % 2 === 0 ? 'band-text' : 'band-text gold'}>{w}</span>
        ))}
      </div>
    </div>
  );
}

export default HomeScreen;
