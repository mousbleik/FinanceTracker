import React from 'react';
import ResourcePage, { useOptions } from '../components/ResourcePage.jsx';
import { today } from '../components/helpers.jsx';

export default function FxRates({ showToast }) {
  const currencies = useOptions('currencies', 'code');
  return (
    <ResourcePage
      resource="fxrates"
      title="FX rate"
      showToast={showToast}
      fields={[
        { key: 'currency', label: 'Currency', type: 'select', required: true, options: currencies },
        { key: 'date', label: 'Date', type: 'date', required: true, default: today() },
        { key: 'rate_to_usd', label: 'Rate to USD', type: 'number', step: '0.00000001', required: true, placeholder: 'e.g. 1.08' },
      ]}
      columns={[
        { key: 'currency_code', label: 'Currency' },
        { key: 'date', label: 'Date' },
        { key: 'rate_to_usd', label: 'Rate (→ USD)', right: true },
      ]}
    />
  );
}
