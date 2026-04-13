const styles = {
  button: {
    background: '#E2136E',
    color: 'white',
    border: 'none',
    padding: '14px 32px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    width: '100%',
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  disabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};

export default function PaymentButton({ onClick, loading, disabled }) {
  return (
    <button
      style={{ ...styles.button, ...(disabled || loading ? styles.disabled : {}) }}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Processing...' : 'Pay with bKash'}
    </button>
  );
}
