import { useState, useEffect } from 'react';
import { getProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import ProductQA from '../components/ProductQA';
import RecommendationCarousel from '../components/RecommendationCarousel';

const styles = {
  heading: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
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

export default function Home({ addToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.loading}>Loading products...</div>;
  if (error) return <div style={styles.error}>Error: {error}</div>;

  return (
    <div>
      <h1 style={styles.heading}>Digital Products</h1>
      <SearchBar />
      <RecommendationCarousel addToCart={addToCart} />
      <div style={styles.grid}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={addToCart} />
        ))}
      </div>

      <div style={{ marginTop: '40px' }}>
        <ProductQA />
      </div>
    </div>
  );
}
