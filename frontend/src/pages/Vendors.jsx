import React from 'react';
import ResourcePage from '../components/ResourcePage.jsx';

export default function Vendors({ showToast }) {
  return (
    <ResourcePage
      resource="vendors"
      title="vendor"
      showToast={showToast}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'contact', label: 'Contact info' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'contact', label: 'Contact' },
      ]}
    />
  );
}
