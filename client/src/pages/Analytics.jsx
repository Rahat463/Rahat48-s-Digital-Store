import { useState, useEffect } from 'react';
import { getAnalytics } from '../services/api';

const styles = {
  heading: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  statCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#E2136E',
  },
  statLabel: {
    fontSize: '0.85rem',
    color: '#666',
    marginTop: '4px',
  },
  section: {
    background: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.88rem',
  },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    borderBottom: '2px solid #eee',
    fontWeight: 600,
    color: '#555',
  },
  td: {
    padding: '8px 12px',
    borderBottom: '1px solid #f0f0f0',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  barContainer: {
    display: 'flex',
    gap: '4px',
    height: '24px',
    borderRadius: '6px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#d32f2f',
  },
};

const statusColors = {
  pending: { bg: '#fff3e0', color: '#e65100' },
  paid: { bg: '#e8f5e9', color: '#2e7d32' },
  completed: { bg: '#e8f5e9', color: '#2e7d32' },
  failed: { bg: '#ffebee', color: '#c62828' },
  cancelled: { bg: '#f5f5f5', color: '#616161' },
  refunded: { bg: '#e3f2fd', color: '#1565c0' },
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>Loading analytics...</div>;
  if (error) return <div style={styles.error}>Error: {error}</div>;
  if (!data) return null;

  const { summary, topProducts, recentOrders, reviewStats, ordersByStatus } = data;

  return (
    <div>
      <h1 style={styles.heading}>Analytics Dashboard</h1>

      {/* Summary Cards */}
      <div style={styles.grid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary.totalProducts}</div>
          <div style={styles.statLabel}>Products</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary.totalOrders}</div>
          <div style={styles.statLabel}>Orders</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary.totalUsers}</div>
          <div style={styles.statLabel}>Users</div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statValue, fontSize: '1.5rem' }}>
            {summary.totalRevenue.toLocaleString()} BDT
          </div>
          <div style={styles.statLabel}>Total Revenue</div>
        </div>
      </div>

      {/* Order Status Breakdown */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Orders by Status</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {ordersByStatus.map((s) => {
            const color = statusColors[s.status] || statusColors.pending;
            return (
              <span
                key={s.status}
                style={{
                  ...styles.statusBadge,
                  background: color.bg,
                  color: color.color,
                }}
              >
                {s.status}: {s.count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Top Products by Revenue</div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Orders</th>
                <th style={styles.th}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i}>
                  <td style={styles.td}>{p.name}</td>
                  <td style={styles.td}>{p.order_count}</td>
                  <td style={styles.td}>{p.revenue.toLocaleString()} BDT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Sentiment */}
      {reviewStats.totalReviews > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Review Sentiment</div>
          <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '12px' }}>
            {reviewStats.totalReviews} reviews | Avg rating: {reviewStats.avgRating || 'N/A'}/5
          </p>
          <div style={styles.barContainer}>
            {reviewStats.sentimentBreakdown.positive > 0 && (
              <div
                style={{
                  flex: reviewStats.sentimentBreakdown.positive,
                  background: '#4caf50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                +{reviewStats.sentimentBreakdown.positive}
              </div>
            )}
            {reviewStats.sentimentBreakdown.neutral > 0 && (
              <div
                style={{
                  flex: reviewStats.sentimentBreakdown.neutral,
                  background: '#ff9800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                ~{reviewStats.sentimentBreakdown.neutral}
              </div>
            )}
            {reviewStats.sentimentBreakdown.negative > 0 && (
              <div
                style={{
                  flex: reviewStats.sentimentBreakdown.negative,
                  background: '#f44336',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                }}
              >
                -{reviewStats.sentimentBreakdown.negative}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Recent Orders</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>ID</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => {
              const color = statusColors[o.status] || statusColors.pending;
              return (
                <tr key={o.id}>
                  <td style={styles.td}>#{o.id}</td>
                  <td style={styles.td}>{o.customer_name}</td>
                  <td style={styles.td}>{o.total_amount} BDT</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: color.bg,
                        color: color.color,
                      }}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
