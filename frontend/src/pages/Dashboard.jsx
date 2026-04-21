import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fmt, today, firstOfMonth, Badge } from '../components/helpers';

export default function Dashboard() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [currency, setCurrency] = useState('');
  const [status, setStatus] = useState('');
  const [currencies, setCurrencies] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.list('currencies').then(r => setCurrencies(r.results || r)).catch(() => {});
  }, []);

  useEffect(() => {
    setError(null);
    api.dashboard({ from, to, currency, status })
      .then(setData)
      .catch(e => setError(e));
  }, [from, to, currency, status]);

  if (error) return <div className="card" style={{ color: 'var(--danger)' }}>Failed to load dashboard: {error.message}</div>;
  if (!data) return <div className="card">Loading dashboard…</div>;

  const k = data.kpis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="filters">
        <div className="form-row">
          <label>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="form-row">
          <label>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="form-row">
          <label>Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="">All</option>
            {currencies.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Order status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Any</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <button className="btn btn-ghost" onClick={() => { setFrom(firstOfMonth()); setTo(today()); setCurrency(''); setStatus(''); }}>Reset</button>
      </div>

      <div className="kpi-row">
        <Kpi label="Revenue" value={fmt(k.revenue_usd)} sub={`${k.orders_paid} paid orders · AOV ${fmt(k.avg_order_value_usd)}`} />
        <Kpi label="Expenses" value={fmt(k.expenses_usd)} sub={`Net profit ${fmt(k.net_profit_usd)} (${k.margin_pct.toFixed(1)}%)`} />
        <Kpi label="Net cash flow" value={fmt(k.net_cash_flow_usd)} sub={`In ${fmt(k.inflow_usd)} · Out ${fmt(k.outflow_usd)}`} />
        <Kpi label="Cash on hand" value={fmt(k.cash_total_usd)} sub={k.runway_months != null ? `Runway ${k.runway_months.toFixed(1)} mo` : 'Runway n/a'} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Revenue by month (USD)</h3>
          <BarChart rows={data.timeline.revenue} field="usd" label="month" color="var(--olive-500)" />
        </div>
        <div className="card">
          <h3>Expenses by month (USD)</h3>
          <BarChart rows={data.timeline.expenses} field="usd" label="month" color="var(--terracotta)" />
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3>Top categories</h3>
          <BarChart rows={data.top_categories} field="usd" label="label" color="var(--olive-600)" />
        </div>
        <div className="card">
          <h3>Top vendors</h3>
          <BarChart rows={data.top_vendors} field="usd" label="label" color="var(--amber)" />
        </div>
        <div className="card">
          <h3>Top customers</h3>
          <BarChart rows={data.top_customers} field="usd" label="label" color="var(--info)" />
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3>Order status</h3>
          {Object.entries(data.order_status_breakdown).map(([s, n]) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <Badge value={s} /><span className="money">{n}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Tasks</h3>
          {Object.entries(data.tasks_by_status).map(([s, n]) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <Badge value={s} /><span className="money">{n}</span>
            </div>
          ))}
          <div className="sub" style={{ marginTop: 8 }}>Assigned to you (open): <b>{data.my_tasks_open}</b></div>
        </div>
        <div className="card">
          <h3>Counters</h3>
          <SmallStat label="Customers" value={data.counters.customers} />
          <SmallStat label="Vendors" value={data.counters.vendors} />
          <SmallStat label="Active accounts" value={data.counters.accounts} />
          <SmallStat label="Assets" value={data.counters.assets} />
          <SmallStat label="Liabilities" value={data.counters.liabilities} />
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <h3>Recent orders</h3>
          {data.recent_orders.length === 0 && <div className="muted">None in range.</div>}
          {data.recent_orders.map(o => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{o.external_id || `#${o.id}`} · <span className="muted">{o.placed_at}</span></span>
              <span className="money">{fmt(o.total, o.currency__code)} <Badge value={o.status} /></span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Recent expenses</h3>
          {data.recent_expenses.length === 0 && <div className="muted">None in range.</div>}
          {data.recent_expenses.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{e.vendor__name || e.memo || 'Expense'} · <span className="muted">{e.date}</span></span>
              <span className="money">{fmt(e.amount, e.currency__code)}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Recent payments</h3>
          {data.recent_payments.length === 0 && <div className="muted">None in range.</div>}
          {data.recent_payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{p.account__name} · <span className="muted">{p.date}</span></span>
              <span className="money"><Badge value={p.direction} /> {fmt(p.amount, p.currency__code)}</span>
            </div>
          ))}
        </div>
      </div>

      {data.recent_audit && data.recent_audit.length > 0 && (
        <div className="card">
          <h3>Recent activity (admin)</h3>
          {data.recent_audit.map(a => (
            <div key={a.id} className="audit-item">
              <span className="muted">{new Date(a.timestamp).toLocaleString()}</span>{' · '}
              <b>{a.username || 'anon'}</b>{' '}
              <span className="a-action">{a.action}</span>{' '}
              {a.target_type && <span className="muted">{a.target_type}#{a.target_id}</span>}{' — '}
              {a.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="card">
      <h3>{label}</h3>
      <div className="big money">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function SmallStat({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span className="muted">{label}</span><span className="money"><b>{value}</b></span>
    </div>
  );
}

function BarChart({ rows, field, label, color }) {
  if (!rows || rows.length === 0) return <div className="muted">No data.</div>;
  const max = Math.max(...rows.map(r => r[field] || 0));
  return (
    <div className="bar-chart">
      {rows.map((r, i) => (
        <div key={i} className="bar-row">
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r[label]}</div>
          <div className="bar-bg"><div className="bar-fill" style={{ width: (max ? (r[field] / max) * 100 : 0) + '%', background: color }} /></div>
          <div className="right money">{fmt(r[field])}</div>
        </div>
      ))}
    </div>
  );
}
