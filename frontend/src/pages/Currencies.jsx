import React from 'react';
import ResourcePage from '../components/ResourcePage.jsx';

export default function Currencies({ showToast }) {
  return (
    <ResourcePage
      resource="currencies"
      title="currency"
      showToast={showToast}
      fields={[
        { key: 'code', label: 'Code (3 letters)', required: true },
        { key: 'name', label: 'Name', required: true },
      ]}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
      ]}
    />
  );
}
