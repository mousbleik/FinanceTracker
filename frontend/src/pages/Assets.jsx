import React from 'react';
import ResourcePage, { useOptions } from '../components/ResourcePage.jsx';
import { today } from '../components/helpers.jsx';

export default function Assets({ showToast }) {
  const currencies = useOptions('currencies', 'code');
  const categories = useOptions('categories');
  const accounts = useOptions('accounts');
  return (
    <ResourcePage
      resource="assets"
      title="asset"
      showToast={showToast}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'purchase_date', label: 'Purchase date', type: 'date', required: true, default: today() },
        { key: 'currency', label: 'Currency', type: 'select', required: true, options: currencies },
        { key: 'cost', label: 'Cost', type: 'number', step: '0.01', required: true },
        { key: 'category', label: 'Category', type: 'select', options: categories },
        { key: 'account', label: 'Paid from account', type: 'select', options: accounts },
        { key: 'disposed_at', label: 'Disposed at', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'purchase_date', label: 'Purchased' },
        { key: 'cost', label: 'Cost', type: 'money', right: true },
        { key: 'currency_code', label: 'Ccy' },
        { key: 'disposed_at', label: 'Disposed' },
      ]}
    />
  );
}
