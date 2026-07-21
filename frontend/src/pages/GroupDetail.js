import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

function GroupDetail() {
  const [group, setGroup] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { groupId } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroupData();
    const interval = setInterval(fetchSubmissionStatus, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      const [groupResponse, statusResponse] = await Promise.all([
        axios.get(`/api/groups/${groupId}`),
        axios.get(`/api/preferences/group/${groupId}/status`)
      ]);
      setGroup(groupResponse.data.data.group);
      setSubmissionStatus(statusResponse.data.data);
    } catch (error) {
      console.error('Error fetching group data:', error);
      setGroup(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionStatus = async () => {
    try {
      const response = await axios.get(`/api/preferences/group/${groupId}/status`);
      setSubmissionStatus(response.data.data);
    } catch (error) {
      console.error('Error fetching submission status:', error);
    }
  };

  const handleGenerateRecommendations = async () => {
    try {
      await axios.post(`/api/recommendations/${groupId}`);
      navigate(`/group/${groupId}/recommendations`);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert(error.response?.data?.message || 'Failed to generate recommendations');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!group) {
    return <div>Group not found</div>;
  }

  const currentUserMember = group.members.find(
    (m) => m.user?._id === user?.id || m.user === user?.id
  );
  const hasSubmitted = currentUserMember?.hasSubmittedPreferences;

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
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
            <div>
              <h1 style={{ color: '#333', marginBottom: '10px' }}>{group.name}</h1>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <span className="group-mood" style={{ fontSize: '16px' }}>{group.mood}</span>
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
            <div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>
                  Group Code
                </div>
                <div className="group-code" style={{ fontSize: '18px' }}>{group.code}</div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#333', marginBottom: '15px' }}>
              Members ({group.members.length})
            </h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {group.members.map((member) => (
                <div
                  key={member.user._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#333' }}>
                      {member.user.name}
                      {member.user._id === group.creator._id && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '12px',
                          background: '#667eea',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Creator
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {member.user.email}
                    </div>
                  </div>
                  <div>
                    {member.hasSubmittedPreferences ? (
                      <span style={{
                        color: '#10b981',
                        fontWeight: '600',
                        fontSize: '20px'
                      }}>✓</span>
                    ) : (
                      <span style={{
                        color: '#ef4444',
                        fontWeight: '600',
                        fontSize: '20px'
                      }}>⏳</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {submissionStatus && (
            <div style={{
              padding: '20px',
              background: submissionStatus.allSubmitted ? '#d1fae5' : '#fef3c7',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                {submissionStatus.allSubmitted
                  ? '🎉 All members have submitted their preferences!'
                  : `⏳ Waiting for preferences: ${submissionStatus.submittedCount} / ${submissionStatus.totalCount}`}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {!hasSubmitted ? (
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/group/${groupId}/preferences`)}
                style={{ flex: 1 }}
              >
                Submit Your Preferences
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/group/${groupId}/preferences`)}
                style={{ flex: 1 }}
              >
                Update Your Preferences
              </button>
            )}

            {submissionStatus?.allSubmitted && (
              <button
                className="btn btn-success"
                onClick={handleGenerateRecommendations}
                style={{ flex: 1 }}
              >
                Get Restaurant Recommendations
              </button>
            )}

            {group.recommendation?.restaurants?.length > 0 && (
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/group/${groupId}/recommendations`)}
                style={{ flex: 1 }}
              >
                View Recommendations
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupDetail;
