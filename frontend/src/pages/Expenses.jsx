import React from 'react';
import ResourcePage, { useOptions } from '../components/ResourcePage.jsx';
import { today } from '../components/helpers.jsx';

export default function Expenses({ showToast }) {
  const vendors = useOptions('vendors');
  const categories = useOptions('categories');
  const currencies = useOptions('currencies', 'code');
  const accounts = useOptions('accounts');

  return (
    <ResourcePage
      resource="expenses"
      title="expense"
      showToast={showToast}
      filterFields={[
        { key: 'from', label: 'From', type: 'date' },
        { key: 'to', label: 'To', type: 'date' },
        { key: 'category', label: 'Category', type: 'select', options: categories },
        { key: 'vendor', label: 'Vendor', type: 'select', options: vendors },
        { key: 'currency', label: 'Currency', type: 'text', placeholder: 'USD' },
        { key: 'q', label: 'Search memo' },
      ]}
      fields={[
        { key: 'date', label: 'Date', type: 'date', required: true, default: today() },
        { key: 'vendor', label: 'Vendor', type: 'select', options: vendors },
        { key: 'category', label: 'Category', type: 'select', options: categories },
        { key: 'currency', label: 'Currency', type: 'select', options: currencies, required: true },
        { key: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
        { key: 'account', label: 'Account', type: 'select', options: accounts },
        { key: 'memo', label: 'Memo' },
      ]}
      columns={[
        { key: 'date', label: 'Date' },
        { key: 'vendor_name', label: 'Vendor' },
        { key: 'category_name', label: 'Category' },
        { key: 'memo', label: 'Memo' },
        { key: 'amount', label: 'Amount', type: 'money', right: true },
        { key: 'currency_code', label: 'Ccy' },
      ]}
    />
  );
}
