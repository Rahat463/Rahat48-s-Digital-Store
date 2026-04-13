import { useSearchParams, Link } from 'react-router-dom';

const styles = {
  container: {
    textAlign: 'center',
    padding: '60px 20px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  detail: {
    fontSize: '0.95rem',
    color: '#666',
    marginBottom: '8px',
  },
  trxId: {
    background: '#f0f0f0',
    padding: '10px 16px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    margin: '16px 0',
    display: 'inline-block',
  },
  link: {
    display: 'inline-block',
    marginTop: '24px',
    padding: '10px 24px',
    background: '#E2136E',
    color: 'white',
    borderRadius: '6px',
    fontWeight: 600,
  },
};

export default function PaymentStatus() {
  const [params] = useSearchParams();

  const status = params.get('status');
  const orderId = params.get('orderId');
  const trxID = params.get('trxID');
  const reason = params.get('reason');
  const error = params.get('error');

  if (error) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.title, color: '#d32f2f' }}>Payment Error</div>
        <p style={styles.detail}>{error}</p>
        <Link to="/" style={styles.link}>Back to Store</Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.icon}>&#10004;</div>
        <div style={{ ...styles.title, color: '#2e7d32' }}>Payment Successful!</div>
        <p style={styles.detail}>Order #{orderId} has been paid.</p>
        {trxID && (
          <div>
            <p style={styles.detail}>Transaction ID:</p>
            <div style={styles.trxId}>{trxID}</div>
          </div>
        )}
        <div>
          <Link to="/orders" style={styles.link}>View Orders</Link>
        </div>
      </div>
    );
  }

  if (status === 'cancel') {
    return (
      <div style={styles.container}>
        <div style={styles.icon}>&#10060;</div>
        <div style={{ ...styles.title, color: '#ed6c02' }}>Payment Cancelled</div>
        <p style={styles.detail}>You cancelled the payment for Order #{orderId}.</p>
        <Link to="/" style={styles.link}>Back to Store</Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.icon}>&#9888;</div>
      <div style={{ ...styles.title, color: '#d32f2f' }}>Payment Failed</div>
      <p style={styles.detail}>
        {reason || `Payment for Order #${orderId} could not be completed.`}
      </p>
      <Link to="/" style={styles.link}>Try Again</Link>
    </div>
  );
}
