import React from 'react';
import ResourcePage, { useOptions } from '../components/ResourcePage.jsx';
import { today } from '../components/helpers.jsx';

export default function Orders({ showToast }) {
  const customers = useOptions('customers');
  const currencies = useOptions('currencies', 'code');

  return (
    <ResourcePage
      resource="orders"
      title="order"
      showToast={showToast}
      filterFields={[
        { key: 'from', label: 'From', type: 'date' },
        { key: 'to', label: 'To', type: 'date' },
        { key: 'status', label: 'Status', type: 'select', options: [
          { value: 'paid', label: 'Paid' },
          { value: 'pending', label: 'Pending' },
          { value: 'refunded', label: 'Refunded' },
          { value: 'cancelled', label: 'Cancelled' },
        ] },
        { key: 'source', label: 'Source', type: 'select', options: [
          { value: 'manual', label: 'Manual' },
          { value: 'shopify', label: 'Shopify' },
          { value: 'woocommerce', label: 'WooCommerce' },
        ] },
        { key: 'q', label: 'Order #' },
      ]}
      fields={[
        { key: 'external_id', label: 'Order #' },
        { key: 'customer', label: 'Customer', type: 'select', options: customers },
        { key: 'placed_at', label: 'Placed at', type: 'date', required: true, default: today() },
        { key: 'currency', label: 'Currency', type: 'select', options: currencies, required: true },
        { key: 'subtotal', label: 'Subtotal', type: 'number', step: '0.01' },
        { key: 'tax', label: 'Tax', type: 'number', step: '0.01' },
        { key: 'shipping', label: 'Shipping', type: 'number', step: '0.01' },
        { key: 'total', label: 'Total', type: 'number', step: '0.01', required: true },
        { key: 'status', label: 'Status', type: 'select', required: true, default: 'paid', options: [
          { value: 'paid', label: 'Paid' },
          { value: 'pending', label: 'Pending' },
          { value: 'refunded', label: 'Refunded' },
          { value: 'cancelled', label: 'Cancelled' },
        ] },
      ]}
      columns={[
        { key: 'placed_at', label: 'Date' },
        { key: 'external_id', label: 'Order #' },
        { key: 'customer_code', label: 'Customer ID' },
        { key: 'customer_name', label: 'Customer' },
        { key: 'status', label: 'Status', type: 'badge' },
        { key: 'total', label: 'Total', type: 'money', right: true },
        { key: 'currency_code', label: 'Ccy' },
      ]}
    />
  );
}
