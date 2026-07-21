import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      setMessage(
        `Password reset instructions sent! Reset token: ${response.data.resetToken} (In production, this would be sent via email)`
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Forgot Password</h1>
        <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '30px' }}>
          Enter your email and we'll send you instructions to reset your password.
        </p>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="form-error" style={{ marginBottom: '20px', textAlign: 'center' }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{
              marginBottom: '20px',
              padding: '12px',
              background: '#d1fae5',
              color: '#065f46',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              {message}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <div className="auth-link">
          Remember your password? <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
