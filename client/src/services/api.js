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

export function searchProducts(query, limit = 5) {
  return api.get('/search', { params: { q: query, limit } }).then((res) => res.data);
}

/**
 * Send a chat message to the AI agent. Streams the response.
 */
export async function sendChatMessage(message, onChunk) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        onChunk(data);
      }
    }
  }
}

/**
 * Ask a product question via RAG. Returns an EventSource-like stream.
 * Uses fetch + ReadableStream since we need to POST with a body.
 */
export async function askProductQuestion(question, onChunk) {
  const res = await fetch('/api/products/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        onChunk(data);
      }
    }
  }
}
