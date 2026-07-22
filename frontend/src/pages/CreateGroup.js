import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function CreateGroup() {
  const [formData, setFormData] = useState({
    name: '',
    mood: 'casual'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const moods = [
    { value: 'casual', label: 'Casual', emoji: '😊' },
    { value: 'fancy', label: 'Fancy', emoji: '✨' },
    { value: 'quick', label: 'Quick Bite', emoji: '⚡' },
    { value: 'adventurous', label: 'Adventurous', emoji: '🌶️' },
    { value: 'comfort', label: 'Comfort Food', emoji: '🤗' },
    { value: 'healthy', label: 'Healthy', emoji: '🥗' }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/groups', formData);
      const group = response.data.data.group;
      navigate(`/dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">IDKUPick</div>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </nav>

      <div className="container">
        <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
          <h1 style={{ marginBottom: '30px', color: '#333', textAlign: 'center' }}>
            Create a New Group
          </h1>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="form-error" style={{ marginBottom: '20px', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g., Friday Night Dinner"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Select Mood</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                {moods.map((mood) => (
                  <label
                    key={mood.value}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '15px',
                      border: `2px solid ${formData.mood === mood.value ? '#667eea' : '#e0e0e0'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: formData.mood === mood.value ? '#f0f4ff' : 'white',
                      transition: 'all 0.3s'
                    }}
                  >
                    <input
                      type="radio"
                      name="mood"
                      value={mood.value}
                      checked={formData.mood === mood.value}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '24px' }}>{mood.emoji}</span>
                    <span style={{ fontWeight: '600', color: '#333' }}>{mood.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateGroup;
