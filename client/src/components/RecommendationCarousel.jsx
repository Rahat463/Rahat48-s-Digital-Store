import { useState, useEffect } from 'react';
import { getRecommendations } from '../services/api';

const styles = {
  container: {
    marginBottom: '32px',
  },
  heading: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    fontSize: '0.7rem',
    background: '#E2136E',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'white',
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #f0f0f0',
    transition: 'transform 0.2s',
    cursor: 'pointer',
  },
  name: {
    fontWeight: 600,
    fontSize: '0.95rem',
    marginBottom: '6px',
  },
  price: {
    color: '#E2136E',
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  addBtn: {
    marginTop: '10px',
    background: '#E2136E',
    color: 'white',
    border: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
    width: '100%',
  },
};

export default function RecommendationCarousel({ addToCart }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getRecommendations()
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || data.recommendations.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.heading}>
        Recommended for You
        {data.personalized && <span style={styles.badge}>Personalized</span>}
      </div>
      <div style={styles.grid}>
        {data.recommendations.map((item) => (
          <div key={item.id} style={styles.card}>
            <div style={styles.name}>{item.name}</div>
            <div style={styles.price}>{item.price} BDT</div>
            <button
              style={styles.addBtn}
              onClick={() =>
                addToCart({ id: item.id, name: item.name, price: item.price })
              }
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
