import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function JoinGroup() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Group code must be 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/groups/join', { code: code.toUpperCase() });
      const groupId = response.data.data.group._id;
      navigate(`/group/${groupId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group. Please check the code.');
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
          <h1 style={{ marginBottom: '20px', color: '#333', textAlign: 'center' }}>
            Join a Group
          </h1>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '30px' }}>
            Enter the 6-character group code to join
          </p>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="form-error" style={{ marginBottom: '20px', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Group Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-character code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  letterSpacing: '4px',
                  textTransform: 'uppercase'
                }}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default JoinGroup;
