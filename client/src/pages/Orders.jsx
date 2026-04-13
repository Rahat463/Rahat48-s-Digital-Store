import { useState, useEffect } from 'react';
import { getOrders, refundPayment } from '../services/api';

const styles = {
  heading: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px',
    color: '#666',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  th: {
    background: '#f5f5f5',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: '#555',
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '0.9rem',
  },
  refundBtn: {
    background: '#d32f2f',
    color: 'white',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
};

const statusColors = {
  paid: '#2e7d32',
  pending: '#ed6c02',
  failed: '#d32f2f',
  cancelled: '#666',
  refunded: '#1565c0',
};

function StatusBadge({ status }) {
  return (
    <span
      style={{
        color: statusColors[status] || '#333',
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  function loadOrders() {
    setLoading(true);
    getOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }

  async function handleRefund(orderId) {
    if (!window.confirm('Are you sure you want to refund this order?')) return;

    try {
      await refundPayment(orderId);
      loadOrders();
    } catch (err) {
      alert('Refund failed: ' + (err.response?.data?.error || err.message));
    }
  }

  if (loading) return <div style={styles.empty}>Loading orders...</div>;
  if (orders.length === 0) return <div style={styles.empty}>No orders yet.</div>;

  return (
    <div>
      <h1 style={styles.heading}>Order History</h1>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Order #</th>
            <th style={styles.th}>Customer</th>
            <th style={styles.th}>Amount</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Transaction ID</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td style={styles.td}>{order.id}</td>
              <td style={styles.td}>{order.customer_name}</td>
              <td style={styles.td}>{order.total_amount} BDT</td>
              <td style={styles.td}>
                <StatusBadge status={order.status} />
              </td>
              <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {order.bkash_trx_id || '-'}
              </td>
              <td style={styles.td}>
                {new Date(order.created_at).toLocaleDateString()}
              </td>
              <td style={styles.td}>
                {order.status === 'paid' && (
                  <button style={styles.refundBtn} onClick={() => handleRefund(order.id)}>
                    Refund
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
