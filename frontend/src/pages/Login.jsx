import React, { useState } from 'react';

export default function Login({ onSubmit }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(username, password);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>Sakan <span>Home</span></h1>
        <p className="muted">Finance & operations console</p>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Username</label>
            <input autoFocus value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{error}</div>}
          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="login-hint">
          <b>Demo logins</b><br />
          Admin → <code>admin</code> / <code>admin12345</code><br />
          Standard → <code>user</code> / <code>user12345</code>
        </div>
      </div>
    </div>
  );
}
