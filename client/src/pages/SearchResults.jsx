import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchProducts } from '../services/api';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';

const styles = {
  heading: {
    fontSize: '1.2rem',
    color: '#555',
    marginBottom: '20px',
  },
  query: {
    color: '#E2136E',
    fontWeight: 'bold',
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
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#d32f2f',
  },
  badge: {
    display: 'inline-block',
    background: '#f0f0f0',
    color: '#666',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    marginLeft: '8px',
  },
};

export default function SearchResults({ addToCart }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);
    searchProducts(query, 6)
      .then((data) => setResults(data.results))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div>
      <SearchBar />

      {!query && <div style={styles.empty}>Enter a search query to find products.</div>}

      {query && (
        <p style={styles.heading}>
          Results for <span style={styles.query}>"{query}"</span>
          {!loading && <span style={styles.badge}>{results.length} found</span>}
        </p>
      )}

      {loading && <div style={styles.loading}>Searching...</div>}
      {error && <div style={styles.error}>Error: {error}</div>}

      {!loading && !error && results.length === 0 && query && (
        <div style={styles.empty}>No products found. Try a different search.</div>
      )}

      <div style={styles.grid}>
        {results.map((result) => (
          <ProductCard
            key={result.id}
            product={{
              id: result.id,
              name: result.name,
              price: result.price,
              image_url: result.image_url,
              description: result.document,
            }}
            onAdd={addToCart}
          />
        ))}
      </div>
    </div>
  );
}
