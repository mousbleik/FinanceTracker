import React from 'react';
import ResourcePage, { useOptions } from '../components/ResourcePage.jsx';

export default function Accounts({ showToast }) {
  const currencies = useOptions('currencies', 'code');
  return (
    <ResourcePage
      resource="accounts"
      title="account"
      showToast={showToast}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'type', label: 'Type', type: 'select', required: true, options: [
          { value: 'bank', label: 'Bank' },
          { value: 'cash', label: 'Cash' },
          { value: 'card', label: 'Credit card' },
          { value: 'stripe', label: 'Stripe' },
          { value: 'paypal', label: 'PayPal' },
          { value: 'other', label: 'Other' },
        ] },
        { key: 'currency', label: 'Currency', type: 'select', required: true, options: currencies },
        { key: 'opening_balance', label: 'Opening balance', type: 'number', step: '0.01', default: '0' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'currency_code', label: 'Ccy' },
        { key: 'opening_balance', label: 'Opening balance', type: 'money', right: true },
      ]}
    />
  );
}
