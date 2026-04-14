import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const styles = {
  form: {
    display: 'flex',
    gap: '8px',
    maxWidth: '600px',
    margin: '0 auto 24px',
  },
  input: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    background: '#E2136E',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
};

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products... (e.g. 'learn web development')"
        style={styles.input}
      />
      <button type="submit" style={styles.button}>
        Search
      </button>
    </form>
  );
}
