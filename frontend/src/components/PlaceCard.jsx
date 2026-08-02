import './PlaceCard.css';

function PlaceCard({ place, index, onClick }) {
  const formatDist = (m) => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
  const distColor  = place.distance_m < 500 ? '#3D8C64' : place.distance_m < 1500 ? '#B8922A' : '#A04055';
  const displayName = place.name === 'Sans nom' ? 'Lieu sans nom' : place.name;

  return (
    <div className="pcard" style={{ animationDelay: `${Math.min(index * 0.03, 0.4)}s` }} onClick={onClick}>
      <div className="pcard-num">{String(index + 1).padStart(2, '0')}</div>
      <div className="pcard-info">
        <div className="pcard-name">{displayName}</div>
        {place.address && <div className="pcard-addr">{place.address}</div>}
        {place.phone    && <div className="pcard-phone">{place.phone}</div>}
      </div>
      <div className="pcard-right">
        <span className="pcard-dist" style={{ color: distColor }}>{formatDist(place.distance_m)}</span>
        <svg className="pcard-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>
    </div>
  );
}

export default PlaceCard;
