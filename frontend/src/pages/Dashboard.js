import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';

function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data.data.groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
          <div className="navbar-menu">
            <span className="navbar-user">Hi, {user?.name}!</span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Welcome to IDKUPick</h1>
          <p className="dashboard-subtitle">
            Find the perfect restaurant for your group
          </p>
        </div>

        <div className="dashboard-actions">
          <div className="action-card" onClick={() => navigate('/create-group')}>
            <div className="action-icon">➕</div>
            <div className="action-title">Create Group</div>
            <div className="action-description">
              Start a new group and invite your friends
            </div>
          </div>

          <div className="action-card" onClick={() => navigate('/join-group')}>
            <div className="action-icon">🔗</div>
            <div className="action-title">Join Group</div>
            <div className="action-description">
              Join an existing group with a code
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>Your Groups</h2>
          {groups.length === 0 ? (
            <div className="empty-state" style={{ color: '#6b7280' }}>
              <div className="empty-state-icon">🍽️</div>
              <div className="empty-state-text" style={{ color: '#333' }}>
                No groups yet. Create or join one to get started!
              </div>
            </div>
          ) : (
            <div className="groups-list">
              {groups.map((group) => (
                <div
                  key={group._id}
                  className="group-card"
                  onClick={() => navigate(`/group/${group._id}`)}
                >
                  <div className="group-header">
                    <h3 className="group-name">{group.name}</h3>
                    <span className="group-code">{group.code}</span>
                  </div>
                  <div className="group-info">
                    <span className="group-mood">{group.mood}</span>
                    <span>{group.members.length} members</span>
                    <span
                      className={`status-badge ${
                        group.status === 'active'
                          ? 'status-active'
                          : group.status === 'completed'
                          ? 'status-completed'
                          : 'status-pending'
                      }`}
                    >
                      {group.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
