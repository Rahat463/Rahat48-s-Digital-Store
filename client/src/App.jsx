import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Cart from './pages/Cart';
import PaymentStatus from './pages/PaymentStatus';
import Orders from './pages/Orders';
import SearchResults from './pages/SearchResults';

export default function App() {
  const [cart, setCart] = useState([]);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  function clearCart() {
    setCart([]);
  }

  return (
    <>
      <Navbar cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px' }}>
        <Routes>
          <Route path="/" element={<Home addToCart={addToCart} />} />
          <Route
            path="/cart"
            element={
              <Cart
                cart={cart}
                removeFromCart={removeFromCart}
                clearCart={clearCart}
              />
            }
          />
          <Route path="/search" element={<SearchResults addToCart={addToCart} />} />
          <Route path="/payment-status" element={<PaymentStatus />} />
          <Route path="/orders" element={<Orders />} />
        </Routes>
      </div>
    </>
  );
}
