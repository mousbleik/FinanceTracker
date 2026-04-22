import React from 'react';
import ResourcePage from '../components/ResourcePage.jsx';

export default function Customers({ showToast }) {
  return (
    <ResourcePage
      resource="customers"
      title="customer"
      showToast={showToast}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'email', label: 'Email' },
        { key: 'external_id', label: 'External ID' },
      ]}
      columns={[
        { key: 'code', label: 'Customer ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'external_id', label: 'External ID' },
      ]}
    />
  );
}
