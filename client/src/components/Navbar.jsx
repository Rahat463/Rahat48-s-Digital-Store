import { Link } from 'react-router-dom';

const styles = {
  nav: {
    background: '#E2136E',
    padding: '14px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  logo: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  links: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
  },
  link: {
    color: 'white',
    fontSize: '0.95rem',
    fontWeight: 500,
  },
  badge: {
    background: 'white',
    color: '#E2136E',
    borderRadius: '50%',
    padding: '2px 8px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    marginLeft: '4px',
  },
};

export default function Navbar({ cartCount }) {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.logo}>Rahat48's Digital Store</Link>
      <div style={styles.links}>
        <Link to="/" style={styles.link}>Products</Link>
        <Link to="/search" style={styles.link}>Search</Link>
        <Link to="/orders" style={styles.link}>Orders</Link>
        <Link to="/cart" style={styles.link}>
          Cart
          {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
        </Link>
      </div>
    </nav>
  );
}
