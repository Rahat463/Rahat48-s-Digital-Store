const styles = {
  card: {
    background: 'white',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s',
  },
  image: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
  },
  body: {
    padding: '16px',
  },
  name: {
    fontSize: '1.05rem',
    fontWeight: 600,
    marginBottom: '6px',
  },
  desc: {
    fontSize: '0.85rem',
    color: '#666',
    marginBottom: '12px',
    lineHeight: '1.4',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#E2136E',
  },
  button: {
    background: '#E2136E',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
};

export default function ProductCard({ product, onAdd }) {
  return (
    <div style={styles.card}>
      <img src={product.image_url} alt={product.name} style={styles.image} />
      <div style={styles.body}>
        <div style={styles.name}>{product.name}</div>
        <div style={styles.desc}>{product.description}</div>
        <div style={styles.footer}>
          <span style={styles.price}>{product.price} BDT</span>
          <button style={styles.button} onClick={() => onAdd(product)}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
