import { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import LocationScreen from './screens/LocationScreen';
import ResultsScreen from './screens/ResultsScreen';
import { getNearbyPlaces } from './api/api';
import './App.css';

function App() {
  const [screen, setScreen]     = useState('home');
  const [category, setCategory] = useState(null);
  const [places, setPlaces]     = useState([]);
  const [userLat, setUserLat]   = useState(null);
  const [userLon, setUserLon]   = useState(null);
  const [radius, setRadius]     = useState(1000);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSelectCategory = (cat) => {
    setCategory(cat);
    setScreen('location');
  };

  const handleSearch = async (lat, lon, rad) => {
    setUserLat(lat); setUserLon(lon); setRadius(rad);
    setLoading(true); setError('');
    try {
      const res = await getNearbyPlaces(lat, lon, rad, category.slug);
      setPlaces(res.data);
      setScreen('results');
    } catch {
      setError('Aucun lieu trouvé dans ce rayon. Essaie un rayon plus grand.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Recherche globale depuis HomeScreen
  const handleGlobalSearch = (results, query) => {
    setPlaces(results);
    setUserLat(null);
    setUserLon(null);
    setRadius(0);
    setCategory({
      name:  `"${query}"`,
      icon:  '🔍',
      slug:  'search',
      color: '#1A73E8',
    });
    setScreen('results');
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-pulse">
        <div className="loading-ring" />
        <div className="loading-ring delay1" />
        <div className="loading-ring delay2" />
      </div>
      <p className="loading-text">Recherche en cours…</p>
    </div>
  );

  return (
    <div className="app-wrapper">
      {screen === 'home' && (
        <HomeScreen
          onSelectCategory={handleSelectCategory}
          onGlobalSearch={handleGlobalSearch}
        />
      )}
      {screen === 'location' && (
        <LocationScreen
          category={category}
          onSearch={handleSearch}
          onBack={() => setScreen('home')}
          error={error}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen
          places={places}
          category={category}
          userLat={userLat}
          userLon={userLon}
          radius={radius}
          isGlobalSearch={!userLat}
          onBack={() => setScreen(!userLat ? 'home' : 'location')}
        />
      )}
    </div>
  );
}

export default App;