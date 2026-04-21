import React from 'react';
import ResourcePage, { useOptions } from '../components/ResourcePage.jsx';
import { today } from '../components/helpers.jsx';

export default function Payments({ showToast }) {
  const accounts = useOptions('accounts');
  const currencies = useOptions('currencies', 'code');

  return (
    <ResourcePage
      resource="payments"
      title="payment"
      showToast={showToast}
      filterFields={[
        { key: 'from', label: 'From', type: 'date' },
        { key: 'to', label: 'To', type: 'date' },
        { key: 'direction', label: 'Direction', type: 'select', options: [
          { value: 'in', label: 'In' }, { value: 'out', label: 'Out' },
        ] },
        { key: 'account', label: 'Account', type: 'select', options: accounts },
      ]}
      fields={[
        { key: 'direction', label: 'Direction', type: 'select', required: true, options: [
          { value: 'in', label: 'Incoming' }, { value: 'out', label: 'Outgoing' },
        ] },
        { key: 'date', label: 'Date', type: 'date', required: true, default: today() },
        { key: 'account', label: 'Account', type: 'select', required: true, options: accounts },
        { key: 'currency', label: 'Currency', type: 'select', required: true, options: currencies },
        { key: 'amount', label: 'Amount', type: 'number', step: '0.01', required: true },
        { key: 'method', label: 'Method', type: 'select', options: [
          { value: 'card', label: 'Card' },
          { value: 'bank_transfer', label: 'Bank transfer' },
          { value: 'cash', label: 'Cash' },
          { value: 'stripe', label: 'Stripe' },
          { value: 'paypal', label: 'PayPal' },
          { value: 'other', label: 'Other' },
        ] },
        { key: 'memo', label: 'Memo' },
      ]}
      columns={[
        { key: 'date', label: 'Date' },
        { key: 'direction', label: 'Direction', type: 'badge' },
        { key: 'account_name', label: 'Account' },
        { key: 'method', label: 'Method' },
        { key: 'memo', label: 'Memo' },
        { key: 'amount', label: 'Amount', type: 'money', right: true },
        { key: 'currency_code', label: 'Ccy' },
      ]}
    />
  );
}
