import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Badge, EmptyState } from '../components/helpers.jsx';

export default function Users({ showToast }) {
  const [users, setUsers] = useState(null);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState({ username: '', password: '', email: '', role: 'Standard' });

  useEffect(() => {
    api.list('users').then(r => setUsers(r.results || r)).catch(e => showToast?.(e.message, 'error'));
  }, [reload]);

  async function invite(e) {
    e.preventDefault();
    try {
      await api.create('users', form);
      showToast?.(`Invited ${form.username}`, 'good');
      setForm({ username: '', password: '', email: '', role: 'Standard' });
      setReload(r => r + 1);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  }

  async function setRole(u, role) {
    try {
      await api.update('users', u.id, { role });
      setReload(r => r + 1);
    } catch (err) { showToast?.(err.message, 'error'); }
  }

  async function setActive(u, active) {
    try {
      await api.update('users', u.id, { is_active: active });
      setReload(r => r + 1);
    } catch (err) { showToast?.(err.message, 'error'); }
  }

  async function resetPassword(u) {
    const p = window.prompt(`New password for ${u.username} (min 6 chars):`);
    if (!p) return;
    try {
      await api.update('users', u.id, { password: p });
      showToast?.('Password updated', 'good');
    } catch (err) { showToast?.(err.message, 'error'); }
  }

  async function remove(u) {
    if (!window.confirm(`Delete ${u.username}?`)) return;
    try {
      await api.remove('users', u.id);
      setReload(r => r + 1);
    } catch (err) { showToast?.(err.message, 'error'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <form className="card" onSubmit={invite}>
        <h3>Invite a user</h3>
        <div className="grid grid-3">
          <div className="form-row"><label>Username *</label>
            <input required value={form.username} onChange={e => setForm(s => ({ ...s, username: e.target.value }))} />
          </div>
          <div className="form-row"><label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(s => ({ ...s, email: e.target.value }))} />
          </div>
          <div className="form-row"><label>Role *</label>
            <select value={form.role} onChange={e => setForm(s => ({ ...s, role: e.target.value }))}>
              <option value="Standard">Standard</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="form-row"><label>Temporary password *</label>
            <input type="text" required minLength={6} value={form.password} onChange={e => setForm(s => ({ ...s, password: e.target.value }))} />
          </div>
        </div>
        <button className="btn" type="submit">Create user</button>
      </form>

      {users == null ? <div className="card">Loading…</div>
       : users.length === 0 ? <EmptyState>No users.</EmptyState>
       : (
        <div className="table-wrap">
        <table className="table">
          <thead><tr>
            <th>Username</th><th>Email</th><th>Role</th><th>Active</th><th className="right">Actions</th>
          </tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td><b>{u.username}</b></td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role || 'Standard'} onChange={e => setRole(u, e.target.value)}>
                    <option value="Standard">Standard</option>
                    <option value="Admin">Admin</option>
                  </select>
                </td>
                <td>{u.is_active ? <Badge value="active" /> : <Badge value="cancelled" />}</td>
                <td className="right">
                  <div className="inline" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => resetPassword(u)}>Reset password</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setActive(u, !u.is_active)}>{u.is_active ? 'Deactivate' : 'Activate'}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(u)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
