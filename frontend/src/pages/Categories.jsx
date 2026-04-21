import React from 'react';
import ResourcePage from '../components/ResourcePage.jsx';

export default function Categories({ showToast }) {
  return (
    <ResourcePage
      resource="categories"
      title="category"
      showToast={showToast}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'kind', label: 'Kind', type: 'select', required: true, options: [
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expense' },
          { value: 'asset', label: 'Asset' },
          { value: 'liability', label: 'Liability' },
        ] },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'kind', label: 'Kind', type: 'badge' },
      ]}
    />
  );
}
