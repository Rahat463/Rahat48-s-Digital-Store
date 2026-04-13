# bKash Digital Store

A full-stack e-commerce demo integrating the **bKash Tokenized Checkout** payment gateway.

## Tech Stack

- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Frontend:** React (Vite), React Router
- **Payment:** bKash Tokenized Checkout API (Sandbox)

## Setup

### 1. Server

```bash
cd server
npm install
npm run dev
```

The server runs on `http://localhost:5000`. Sandbox credentials are pre-configured in `.env`.

### 2. Client

```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:5173` with API proxy to the server.

## Payment Flow

1. Browse products and add to cart
2. Go to Cart, enter your name, click **"Pay with bKash"**
3. You're redirected to bKash sandbox payment page
4. Enter test PIN: `12121`, OTP: `123456`
5. bKash redirects back to the app with payment result
6. View order history with transaction IDs on the Orders page

## bKash Sandbox Test Info

| Item | Value |
|------|-------|
| Test PIN | `12121` |
| Test OTP | `123456` |
| Insufficient balance | Wallet `01823074817` |
| Debit blocked | Wallet `01823074818` |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/orders` | List all orders |
| GET | `/api/orders/:id` | Order details with items |
| POST | `/api/payment/create` | Initiate bKash payment |
| GET | `/api/payment/callback` | bKash redirect callback |
| GET | `/api/payment/status/:orderId` | Check payment status |
| POST | `/api/payment/refund/:orderId` | Refund a payment |

## Architecture

```
User --> React Frontend --> Express API --> bKash Tokenized Checkout API
                                |
                            SQLite DB
                     (orders, payments, products)
```

Key concepts implemented:
- **Token-based auth** with caching and auto-refresh
- **Idempotent payments** via unique merchantInvoiceNumber
- **Callback handling** for payment execution after user authorization
- **Payment state management** (pending -> paid -> refunded)
