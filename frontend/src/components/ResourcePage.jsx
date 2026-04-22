import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { EmptyState, fmt, Badge } from './helpers.jsx';

/**
 * Generic CRUD list + create form.
 * columns: [{key, label, render?, type?}]
 * fields: [{key, label, type, options?, required?, placeholder?}]
 */
export default function ResourcePage({
  resource, title, columns, fields,
  filterFields = [], defaultFilters = {},
  showToast, canDelete = true,
}) {
  const [items, setItems] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState(initialForm(fields));
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.list(resource, filters).then(r => setItems(r.results || r)).catch(e => showToast?.(e.message, 'error'));
  }, [resource, JSON.stringify(filters), reload]);

  function initialForm(flds) {
    const o = {};
    for (const f of flds) o[f.key] = f.default ?? '';
    return o;
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {};
      for (const f of fields) {
        let v = form[f.key];
        if (v === '' && !f.required) continue;
        if (f.type === 'number' && v !== '') v = Number(v);
        payload[f.key] = v;
      }
      if (editing) {
        await api.update(resource, editing, payload);
        showToast?.('Updated', 'good');
      } else {
        await api.create(resource, payload);
        showToast?.('Created', 'good');
      }
      setForm(initialForm(fields));
      setEditing(null);
      setReload(r => r + 1);
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.remove(resource, id);
      showToast?.('Deleted', 'good');
      setReload(r => r + 1);
    } catch (err) {
      showToast?.(err.message, 'error');
    }
  }

  function startEdit(row) {
    const next = initialForm(fields);
    for (const f of fields) next[f.key] = row[f.key] ?? '';
    setForm(next);
    setEditing(row.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {filterFields.length > 0 && (
        <div className="filters">
          {filterFields.map(f => (
            <div key={f.key} className="form-row">
              <label>{f.label}</label>
              {f.type === 'select' ? (
                <select value={filters[f.key] || ''} onChange={e => setFilters(s => ({ ...s, [f.key]: e.target.value }))}>
                  <option value="">All</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type={f.type || 'text'} value={filters[f.key] || ''} onChange={e => setFilters(s => ({ ...s, [f.key]: e.target.value }))} placeholder={f.placeholder} />
              )}
            </div>
          ))}
          <button className="btn btn-ghost" onClick={() => setFilters({})}>Clear</button>
        </div>
      )}

      {fields.length > 0 && (
        <form className="card" onSubmit={submit}>
          <h3>{editing ? 'Edit ' + title : 'New ' + title}</h3>
          <div className="grid grid-3">
            {fields.map(f => (
              <div key={f.key} className="form-row">
                <label>{f.label}{f.required ? ' *' : ''}</label>
                {f.type === 'select' ? (
                  <select
                    value={form[f.key] || ''}
                    onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                    required={f.required}
                  >
                    <option value="">—</option>
                    {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea rows={3}
                    value={form[f.key] || ''}
                    onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={form[f.key] ?? ''}
                    onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    step={f.step}
                    required={f.required}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="inline" style={{ marginTop: 8 }}>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save' : 'Add'}
            </button>
            {editing && (
              <button className="btn btn-ghost" type="button" onClick={() => { setEditing(null); setForm(initialForm(fields)); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {items == null ? (
        <div className="card">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState>No {title.toLowerCase()} yet.</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {columns.map(c => <th key={c.key} className={c.right ? 'right' : ''}>{c.label}</th>)}
                <th className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => (
                <tr key={row.id}>
                  {columns.map(c => (
                    <td key={c.key} className={c.right ? 'right' : ''}>
                      {c.render ? c.render(row) : c.type === 'money' ? <span className="money">{fmt(row[c.key], row.currency_code || 'USD')}</span>
                        : c.type === 'badge' ? <Badge value={row[c.key]} />
                        : row[c.key]}
                    </td>
                  ))}
                  <td className="right">
                    <div className="inline" style={{ justifyContent: 'flex-end' }}>
                      {fields.length > 0 && <button className="btn btn-sm btn-ghost" onClick={() => startEdit(row)}>Edit</button>}
                      {canDelete && <button className="btn btn-sm btn-danger" onClick={() => remove(row.id)}>Delete</button>}
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

export function useOptions(resource, labelKey = 'name') {
  const [opts, setOpts] = useState([]);
  useEffect(() => {
    api.list(resource).then(r => {
      const items = r.results || r;
      setOpts(items.map(i => {
        const primary = i[labelKey] || i.code || `#${i.id}`;
        const label = resource === 'customers' && i.code && i.name
          ? `${i.code} — ${i.name}` : primary;
        return { value: i.id, label };
      }));
    }).catch(() => setOpts([]));
  }, [resource, labelKey]);
  return opts;
}
