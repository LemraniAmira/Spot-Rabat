import './PlaceDetail.css';

function PlaceDetail({ place, categoryColor, categoryIcon, onClose }) {
  const formatDist = (m) => m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;

  return (
    <>
      {/* Backdrop */}
      <div className="detail-backdrop" onClick={onClose} />

      {/* Sheet */}
      <div className="detail-sheet">
        {/* Handle */}
        <div className="detail-handle" />

        {/* Header */}
        <div className="detail-header">
          <div
            className="detail-cat-icon"
            style={{ background: categoryColor + '20' }}
          >
            {categoryIcon}
          </div>
          <div className="detail-header-info">
            <h2 className="detail-name">
              {place.name === 'Sans nom' ? 'Lieu sans nom' : place.name}
            </h2>
            <div
              className="detail-dist-badge"
              style={{ background: categoryColor + '15', color: categoryColor }}
            >
              📏 {formatDist(place.distance_m)} de vous
            </div>
          </div>
          <button className="detail-close" onClick={onClose}>✕</button>
        </div>

        {/* Divider */}
        <div className="detail-divider" />

        {/* Info rows */}
        <div className="detail-rows">
          {place.address && (
            <div className="detail-row">
              <div className="detail-row-icon">📌</div>
              <div>
                <div className="detail-row-label">Adresse</div>
                <div className="detail-row-value">{place.address}</div>
              </div>
            </div>
          )}

          {place.phone && (
            <div className="detail-row">
              <div className="detail-row-icon">📞</div>
              <div>
                <div className="detail-row-label">Téléphone</div>
                <a href={`tel:${place.phone}`} className="detail-row-value link">
                  {place.phone}
                </a>
              </div>
            </div>
          )}

          <div className="detail-row">
            <div className="detail-row-icon"></div>
            <div>
              <div className="detail-row-label">Coordonnées GPS</div>
              <div className="detail-row-value mono">
                {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
              </div>
            </div>
          </div>

          <div className="detail-row">
            <div className="detail-row-icon">🏷️</div>
            <div>
              <div className="detail-row-label">Type</div>
              <div className="detail-row-value">{place.type}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="detail-actions">
          <a
            href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}&zoom=18`}
            target="_blank"
            rel="noreferrer"
            className="detail-action-btn secondary"
          >
            🗺️ Voir sur OSM
          </a>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="detail-action-btn primary"
            style={{ background: categoryColor }}
          >
            🧭 Itinéraire
          </a>
        </div>
      </div>
    </>
  );
}

export default PlaceDetail;