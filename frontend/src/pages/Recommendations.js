import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const { groupId } = useParams();
  const navigate = useNavigate();

  const fetchRecommendations = useCallback(async () => {
    try {
      const [groupResponse, recResponse] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/recommendations/${groupId}`)
      ]);

      setGroup(groupResponse.data.data.group);
      setRecommendations(recResponse.data.data.recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchRecommendations();
  }, [groupId, fetchRecommendations]);

  const getPriceSymbol = (priceLevel) => {
    return '$'.repeat(priceLevel || 2);
  };

  const getDirections = (restaurant) => {
    const { lat, lng } = restaurant.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">IDKUPick</div>
          <button className="btn btn-secondary" onClick={() => navigate(`/group/${groupId}`)}>
            Back to Group
          </button>
        </div>
      </nav>

      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="dashboard-title" style={{ fontSize: '32px' }}>
            Restaurant Recommendations
          </h1>
          <p className="dashboard-subtitle">
            For group: <strong>{group?.name}</strong>
          </p>
        </div>

        {recommendations.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ color: '#6b7280' }}>
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-text" style={{ color: '#333' }}>
                No recommendations available yet
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {recommendations.map((restaurant, index) => (
              <div key={restaurant.placeId || index} className="recommendation-card">
                {restaurant.photoUrl && (
                  <img
                    src={restaurant.photoUrl}
                    alt={restaurant.name}
                    className="recommendation-image"
                    onError={(e) => {
                      // Fallback to a generic food image if Unsplash fails
                      e.target.onerror = null; // Prevent infinite loop
                      e.target.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop';
                    }}
                  />
                )}
                <div className="recommendation-content">
                  <div style={{
                    display: 'flex',
                    alignItems: 'start',
                    justifyContent: 'space-between',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <h2 className="recommendation-name">{restaurant.name}</h2>
                        {index === 0 && (
                          <span style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700'
                          }}>
                            TOP PICK
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {restaurant.rating && (
                          <div className="recommendation-rating">
                            ⭐ {restaurant.rating.toFixed(1)}
                          </div>
                        )}
                        <div style={{
                          background: '#f3f4f6',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontWeight: '700',
                          color: '#10b981'
                        }}>
                          {getPriceSymbol(restaurant.priceLevel)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="recommendation-details">
                    <div className="recommendation-address">
                      📍 {restaurant.address}
                    </div>
                  </div>

                  {restaurant.cuisine && restaurant.cuisine.length > 0 && (
                    <div className="recommendation-cuisine">
                      {restaurant.cuisine.map((cuisine, idx) => (
                        <span key={idx} className="cuisine-tag">
                          {cuisine}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    onClick={() => getDirections(restaurant)}
                    style={{ marginTop: '20px', width: '100%' }}
                  >
                    🗺️ Get Directions
                  </button>
                </div>
              </div>
            ))}

            <div className="card" style={{ marginTop: '30px', textAlign: 'center', background: '#f9fafb' }}>
              <h3 style={{ color: '#333', marginBottom: '15px' }}>
                Can't decide?
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                The top pick was selected based on your group's combined preferences!
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/group/${groupId}`)}
              >
                Back to Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Recommendations;

