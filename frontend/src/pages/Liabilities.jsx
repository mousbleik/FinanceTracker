import React from 'react';
import ResourcePage, { useOptions } from '../components/ResourcePage.jsx';

export default function Liabilities({ showToast }) {
  const currencies = useOptions('currencies', 'code');
  const accounts = useOptions('accounts');
  return (
    <ResourcePage
      resource="liabilities"
      title="liability"
      showToast={showToast}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'currency', label: 'Currency', type: 'select', required: true, options: currencies },
        { key: 'principal', label: 'Principal', type: 'number', step: '0.01', required: true },
        { key: 'balance', label: 'Current balance', type: 'number', step: '0.01', required: true },
        { key: 'account', label: 'Linked account', type: 'select', options: accounts },
        { key: 'opened_at', label: 'Opened at', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'principal', label: 'Principal', type: 'money', right: true },
        { key: 'balance', label: 'Balance', type: 'money', right: true },
        { key: 'currency_code', label: 'Ccy' },
      ]}
    />
  );
}
