import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export function getProducts() {
  return api.get('/products').then((res) => res.data);
}

export function getOrders() {
  return api.get('/orders').then((res) => res.data);
}

export function getOrder(orderId) {
  return api.get(`/orders/${orderId}`).then((res) => res.data);
}

export function createPayment(customerName, cartItems) {
  return api.post('/payment/create', { customerName, cartItems }).then((res) => res.data);
}

export function getPaymentStatus(orderId) {
  return api.get(`/payment/status/${orderId}`).then((res) => res.data);
}

export function refundPayment(orderId, reason) {
  return api.post(`/payment/refund/${orderId}`, { reason }).then((res) => res.data);
}
