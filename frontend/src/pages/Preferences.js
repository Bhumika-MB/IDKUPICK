import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

function Preferences() {
  const [formData, setFormData] = useState({
    cuisine: [],
    budget: 'medium',
    distance: 5,
    location: null
  });
  const [group, setGroup] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const { groupId } = useParams();
  const navigate = useNavigate();

  const cuisineOptions = [
    'Italian', 'Chinese', 'Japanese', 'Mexican', 'Indian',
    'American', 'Thai', 'French', 'Mediterranean', 'Korean',
    'Vietnamese', 'Greek', 'Spanish', 'BBQ', 'Seafood'
  ];

  useEffect(() => {
    fetchGroupAndPreferences();
  }, [groupId]);

  const fetchGroupAndPreferences = async () => {
    try {
      const [groupResponse, prefResponse] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/preferences/group/${groupId}/me`)
      ]);

      setGroup(groupResponse.data.data.group);

      if (prefResponse.data.data.preference) {
        const pref = prefResponse.data.data.preference;
        setFormData({
          cuisine: pref.cuisine,
          budget: pref.budget,
          distance: pref.distance,
          location: {
            lat: pref.location.coordinates[1],
            lng: pref.location.coordinates[0]
          }
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCuisineToggle = (cuisine) => {
    if (formData.cuisine.includes(cuisine)) {
      setFormData({
        ...formData,
        cuisine: formData.cuisine.filter((c) => c !== cuisine)
      });
    } else {
      if (formData.cuisine.length < 3) {
        setFormData({
          ...formData,
          cuisine: [...formData.cuisine, cuisine]
        });
      }
    }
  };

  const handleGetLocation = () => {
    setLoadingLocation(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        });
        setLoadingLocation(false);
      },
      (error) => {
        setError('Unable to retrieve your location. Please try again.');
        setLoadingLocation(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.cuisine.length === 0) {
      setError('Please select at least one cuisine type');
      return;
    }

    if (!formData.location) {
      setError('Please share your location');
      return;
    }

    setLoading(true);

    try {
      await api.post('/preferences', {
        groupId,
        ...formData
      });
      navigate(`/group/${groupId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!group) {
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
        <div className="card" style={{ maxWidth: '800px', margin: '40px auto' }}>
          <h1 style={{ marginBottom: '10px', color: '#333' }}>Submit Your Preferences</h1>
          <p style={{ color: '#6b7280', marginBottom: '30px' }}>
            For group: <strong>{group.name}</strong>
          </p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="form-error" style={{ marginBottom: '20px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Cuisine Preferences (Select 1-3)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                {cuisineOptions.map((cuisine) => (
                  <div
                    key={cuisine}
                    onClick={() => handleCuisineToggle(cuisine)}
                    style={{
                      padding: '12px',
                      border: `2px solid ${formData.cuisine.includes(cuisine) ? '#667eea' : '#e0e0e0'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      background: formData.cuisine.includes(cuisine) ? '#f0f4ff' : 'white',
                      fontWeight: formData.cuisine.includes(cuisine) ? '600' : '400',
                      transition: 'all 0.3s'
                    }}
                  >
                    {cuisine}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                Selected: {formData.cuisine.length} / 3
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Budget Range</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                {['low', 'medium', 'high'].map((budget) => (
                  <label
                    key={budget}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '20px',
                      border: `2px solid ${formData.budget === budget ? '#667eea' : '#e0e0e0'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: formData.budget === budget ? '#f0f4ff' : 'white',
                      transition: 'all 0.3s'
                    }}
                  >
                    <input
                      type="radio"
                      name="budget"
                      value={budget}
                      checked={formData.budget === budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      style={{ display: 'none' }}
                    />
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                      {budget === 'low' ? '$' : budget === 'medium' ? '$$' : '$$$'}
                    </div>
                    <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                      {budget}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Maximum Distance (km): {formData.distance}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '5px'
              }}>
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Current Location</label>
              {formData.location ? (
                <div style={{
                  padding: '15px',
                  background: '#d1fae5',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#065f46' }}>
                      Location obtained successfully!
                    </div>
                    <div style={{ fontSize: '14px', color: '#065f46', marginTop: '5px' }}>
                      Lat: {formData.location.lat.toFixed(4)}, Lng: {formData.location.lng.toFixed(4)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleGetLocation}
                    disabled={loadingLocation}
                  >
                    Update
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={handleGetLocation}
                  disabled={loadingLocation}
                >
                  {loadingLocation ? 'Getting Location...' : 'Share My Location'}
                </button>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-success btn-block"
              disabled={loading || !formData.location}
            >
              {loading ? 'Submitting...' : 'Submit Preferences'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Preferences;
