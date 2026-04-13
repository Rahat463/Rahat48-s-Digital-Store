import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPayment } from '../services/api';
import PaymentButton from '../components/PaymentButton';

const styles = {
  heading: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#666',
  },
  container: {
    maxWidth: '600px',
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid #eee',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemDetail: {
    fontSize: '0.85rem',
    color: '#666',
  },
  removeBtn: {
    background: 'none',
    border: '1px solid #d32f2f',
    color: '#d32f2f',
    padding: '4px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  total: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 0',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    borderTop: '2px solid #333',
    marginTop: '8px',
  },
  nameInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.95rem',
    marginTop: '16px',
  },
  error: {
    color: '#d32f2f',
    marginTop: '12px',
    fontSize: '0.9rem',
  },
};

export default function Cart({ cart, removeFromCart, clearCart }) {
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function handlePayment() {
    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createPayment(customerName.trim(), cart);

      // Redirect to bKash payment page
      if (result.bkashURL) {
        clearCart();
        window.location.href = result.bkashURL;
      } else {
        setError('Failed to get payment URL');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div style={styles.empty}>
        <h2>Your cart is empty</h2>
        <p style={{ marginTop: '8px' }}>Browse products and add items to your cart.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Your Cart</h1>

      {cart.map((item) => (
        <div key={item.productId} style={styles.item}>
          <div style={styles.itemInfo}>
            <div style={styles.itemName}>{item.name}</div>
            <div style={styles.itemDetail}>
              {item.price} BDT x {item.quantity} = {item.price * item.quantity} BDT
            </div>
          </div>
          <button style={styles.removeBtn} onClick={() => removeFromCart(item.productId)}>
            Remove
          </button>
        </div>
      ))}

      <div style={styles.total}>
        <span>Total</span>
        <span>{total} BDT</span>
      </div>

      <input
        style={styles.nameInput}
        type="text"
        placeholder="Enter your name"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />

      <PaymentButton onClick={handlePayment} loading={loading} disabled={!customerName.trim()} />

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}
