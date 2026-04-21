import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fmt, today, firstOfMonth } from '../components/helpers.jsx';

export default function Reports() {
  const [tab, setTab] = useState('pnl');
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [asOf, setAsOf] = useState(today());
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null); setData(null);
    const call = tab === 'balance' ? api.report('balance-sheet', { as_of: asOf })
                 : tab === 'cash' ? api.report('cashflow', { from, to })
                 : api.report('pnl', { from, to });
    call.then(setData).catch(e => setError(e));
  }, [tab, from, to, asOf]);

  const csvUrl = tab === 'balance'
    ? api.reportCsvUrl('balance-sheet', { as_of: asOf })
    : tab === 'cash'
      ? api.reportCsvUrl('cashflow', { from, to })
      : api.reportCsvUrl('pnl', { from, to });

  async function download() {
    const res = await fetch(csvUrl, { headers: { Authorization: `Token ${api.token.get()}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = csvUrl.split('/').filter(Boolean).slice(-1)[0] + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="inline">
        <button className={`btn ${tab === 'pnl' ? '' : 'btn-ghost'}`} onClick={() => setTab('pnl')}>Profit & Loss</button>
        <button className={`btn ${tab === 'cash' ? '' : 'btn-ghost'}`} onClick={() => setTab('cash')}>Cash flow</button>
        <button className={`btn ${tab === 'balance' ? '' : 'btn-ghost'}`} onClick={() => setTab('balance')}>Balance sheet</button>
      </div>

      <div className="filters">
        {tab === 'balance' ? (
          <div className="form-row"><label>As of</label><input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} /></div>
        ) : (
          <>
            <div className="form-row"><label>From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div className="form-row"><label>To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
          </>
        )}
        <button className="btn" onClick={download}>Download CSV</button>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)' }}>{error.message}</div>}
      {!data ? <div className="card">Loading…</div> : (
        <div className="grid grid-2">
          {tab === 'pnl' && <PnL data={data} />}
          {tab === 'cash' && <CashFlow data={data} />}
          {tab === 'balance' && <BalanceSheet data={data} />}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span>{k}</span>
      <span className="money">{fmt(v)}</span>
    </div>
  );
}

function PnL({ data }) {
  return (
    <>
      <div className="card">
        <h3>Revenue</h3>
        {Object.entries(data.revenue).map(([k, v]) => <Row key={k} k={k} v={v} />)}
        <Row k={<b>Total revenue</b>} v={data.revenue_total} />
      </div>
      <div className="card">
        <h3>Expenses</h3>
        {Object.entries(data.expenses).map(([k, v]) => <Row key={k} k={k} v={v} />)}
        <Row k={<b>Total expenses</b>} v={data.expenses_total} />
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 16 }}>
          Net profit: <span className="money" style={{ color: data.net_profit >= 0 ? 'var(--good)' : 'var(--danger)' }}>{fmt(data.net_profit)}</span>
        </div>
      </div>
    </>
  );
}

function CashFlow({ data }) {
  return (
    <>
      <div className="card">
        <h3>By account</h3>
        <table className="table" style={{ boxShadow: 'none', border: 'none' }}>
          <thead><tr><th>Account</th><th className="right">In</th><th className="right">Out</th><th className="right">Net</th></tr></thead>
          <tbody>
            {Object.entries(data.by_account).map(([k, v]) => (
              <tr key={k}><td>{k}</td>
                <td className="right money">{fmt(v.in)}</td>
                <td className="right money">{fmt(v.out)}</td>
                <td className="right money"><b>{fmt(v.net)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>Totals</h3>
        <Row k="Inflow" v={data.inflow_total} />
        <Row k="Outflow" v={data.outflow_total} />
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 16 }}>
          Net cash flow: <span className="money" style={{ color: data.net_cash_flow >= 0 ? 'var(--good)' : 'var(--danger)' }}>{fmt(data.net_cash_flow)}</span>
        </div>
      </div>
    </>
  );
}

function BalanceSheet({ data }) {
  return (
    <>
      <div className="card">
        <h3>Assets</h3>
        <div style={{ fontWeight: 600, margin: '6px 0' }}>Cash</div>
        {Object.entries(data.cash_by_account).map(([k, v]) => <Row key={k} k={k} v={v} />)}
        <Row k={<b>Cash total</b>} v={data.cash_total} />
        <div style={{ fontWeight: 600, margin: '10px 0 6px' }}>Fixed assets</div>
        {data.fixed_assets.map((a, i) => <Row key={i} k={a.name} v={a.usd} />)}
        <Row k={<b>Fixed assets total</b>} v={data.fixed_assets_total} />
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 16 }}>
          Total assets: <span className="money">{fmt(data.total_assets)}</span>
        </div>
      </div>
      <div className="card">
        <h3>Liabilities & Equity</h3>
        {data.liabilities.map((l, i) => <Row key={i} k={l.name} v={l.usd} />)}
        <Row k={<b>Liabilities total</b>} v={data.liabilities_total} />
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 16 }}>
          Equity: <span className="money" style={{ color: data.equity >= 0 ? 'var(--good)' : 'var(--danger)' }}>{fmt(data.equity)}</span>
        </div>
      </div>
    </>
  );
}
