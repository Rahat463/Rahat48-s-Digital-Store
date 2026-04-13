# Payment Gateway - Complete Learning Guide (From Zero)

> This guide teaches you everything about the backend, payment gateway, security,
> and tech stack used in this project. Read it top to bottom like a conversation.

---

## Table of Contents

1. [The Big Picture — What Problem Are We Solving?](#1-the-big-picture)
2. [Tech Stack — Why These Tools?](#2-tech-stack)
3. [Backend Architecture — How It's Organized](#3-backend-architecture)
4. [Database Design — Why These Tables?](#4-database-design)
5. [Payment Gateway — The Core Concept](#5-payment-gateway)
6. [bKash API — Step by Step](#6-bkash-api-step-by-step)
7. [Backend Code — File by File Breakdown](#7-backend-code-walkthrough)
8. [Security — What Matters and Why](#8-security)
9. [Error Handling & Edge Cases](#9-error-handling)
10. [What Happens in Production?](#10-production-considerations)
11. [Interview Q&A — Expected Questions](#11-interview-qa)

---

## 1. The Big Picture

### What problem does a payment gateway solve?

Imagine you're buying a course online. You click "Pay" — but how does the money
actually move from YOUR wallet to the SELLER's account?

```
You (Buyer)  →  ???  →  Seller (Merchant)
```

That "???" is the **payment gateway**. It's a middleman that:

1. Securely collects your payment info (wallet number, PIN)
2. Talks to your bank/wallet provider to deduct money
3. Transfers money to the seller's account
4. Tells the seller "payment is done, deliver the product"

**Without a payment gateway**, the seller would need to:
- Directly access banking systems (impossible for small businesses)
- Handle sensitive financial data (huge security liability)
- Build fraud detection (extremely complex)

### Real-world analogy

Think of a **cashier at a store**:
- You give money to the cashier (not directly to the product manufacturer)
- The cashier verifies the money is real
- The cashier gives you a receipt
- The store gets the money later through settlement

**bKash payment gateway = digital cashier**

### Our project flow

```
┌─────────────────────────────────────────────────────────┐
│                    FULL PAYMENT FLOW                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. User browses products on our React frontend         │
│                    │                                    │
│                    ▼                                    │
│  2. User adds items to cart, clicks "Pay with bKash"    │
│                    │                                    │
│                    ▼                                    │
│  3. Frontend calls OUR backend: POST /api/payment/create│
│                    │                                    │
│                    ▼                                    │
│  4. Our backend calls bKash API: "Create Payment"       │
│     bKash returns a payment URL                         │
│                    │                                    │
│                    ▼                                    │
│  5. We redirect user to bKash's payment page            │
│     (the pink page you saw in the screenshot)           │
│                    │                                    │
│                    ▼                                    │
│  6. User enters wallet number, PIN, OTP on bKash's page │
│     (we NEVER see the PIN/OTP — bKash handles it)       │
│                    │                                    │
│                    ▼                                    │
│  7. bKash verifies payment, redirects user back to      │
│     OUR callback URL with paymentID + status            │
│                    │                                    │
│                    ▼                                    │
│  8. Our backend calls bKash API: "Execute Payment"      │
│     (this actually finalizes the money transfer)        │
│                    │                                    │
│                    ▼                                    │
│  9. We update our database: order = "paid"              │
│     Redirect user to success page                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key insight**: The user's PIN and OTP are entered on bKash's own page.
Our app NEVER sees or handles that sensitive data. This is by design — security.

---

## 2. Tech Stack

### Node.js — The Runtime

**What is it?** JavaScript running outside the browser, on the server.

**Why use it?**
- Same language (JS) for frontend and backend — easier for you
- Non-blocking I/O — great for handling many API calls (like calling bKash)
- Huge ecosystem (npm packages for everything)

**In our project:** Node.js runs our Express server.

### Express.js — The Web Framework

**What is it?** A minimal framework for building HTTP APIs in Node.js.

**Why use it?**
- Most popular Node.js framework
- Simple: define routes → handle requests → send responses
- Middleware system for reusable logic (CORS, JSON parsing, error handling)

**Core concept — Routes:**
```javascript
// When someone sends GET request to /api/products,
// run this function and send back product data
app.get('/api/products', (req, res) => {
    const products = getProductsFromDB();
    res.json(products);  // Send JSON response
});
```

**Core concept — Middleware:**
```javascript
// Middleware = functions that run BEFORE your route handler
// They sit in the middle (hence "middleware")

app.use(express.json());  // Parses JSON request bodies
app.use(cors());          // Allows cross-origin requests

// Request flow:
// Client → cors() → json() → YOUR ROUTE HANDLER → Response
```

### SQLite (via better-sqlite3) — The Database

**What is it?** A file-based SQL database. No server needed.

**Why use it?**
- Zero setup — just `npm install`, no MySQL/PostgreSQL server to run
- Data stored in a single file (`store.db`)
- Perfect for small projects and prototypes
- Uses standard SQL, so knowledge transfers to any SQL database

**In production**, you'd use PostgreSQL or MySQL. But for learning, SQLite is ideal.

**better-sqlite3 vs sqlite3:**
- `sqlite3` (the other npm package) is async with callbacks — messy
- `better-sqlite3` is **synchronous** — simpler, faster, no callback hell

```javascript
// better-sqlite3 (what we use) — clean and simple
const product = db.prepare('SELECT * FROM products WHERE id = ?').get(1);

// sqlite3 (the other one) — callback mess
db.get('SELECT * FROM products WHERE id = ?', [1], (err, row) => {
    if (err) { /* handle error */ }
    // use row here
});
```

### Axios — HTTP Client

**What is it?** A library for making HTTP requests from Node.js (or browser).

**Why use it?**
- Cleaner API than Node's built-in `http` module
- Automatic JSON parsing
- Request/response interceptors
- Timeout support (critical for payment APIs)

**In our project:** Backend uses Axios to call bKash's API.

```javascript
// Making a POST request to bKash
const { data } = await axios.post(
    'https://bkash-sandbox-url/tokenized/checkout/create',
    { amount: '499', currency: 'BDT' },       // Request body
    { headers: { Authorization: token } }       // Headers
);
// `data` automatically contains the parsed JSON response
```

### dotenv — Environment Variables

**What is it?** Loads variables from a `.env` file into `process.env`.

**Why use it?**
- Keeps secrets (API keys, passwords) OUT of your code
- Different `.env` files for development vs production
- `.env` is gitignored — secrets never go to GitHub

```
# .env file (NEVER commit this)
BKASH_APP_KEY=4f6o0cjiki2rfm34kfdadl1eqq
BKASH_APP_SECRET=2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b

# In your code:
const key = process.env.BKASH_APP_KEY;  // reads from .env
```

### CORS (Cross-Origin Resource Sharing)

**What is it?** A browser security feature.

**The problem:** Your React app runs on `localhost:5173`, but your API runs on
`localhost:5000`. Browsers block requests between different origins by default.

**The solution:** Our Express server says "I allow requests from localhost:5173":
```javascript
app.use(cors({ origin: 'http://localhost:5173' }));
```

Without this, every API call from the frontend would fail.

---

## 3. Backend Architecture

### Folder structure — WHY this layout?

```
server/src/
├── index.js          ← Entry point. Wires everything together.
├── config/
│   └── bkash.js      ← bKash credentials in one place
├── routes/
│   ├── products.js   ← Handles /api/products/* requests
│   ├── orders.js     ← Handles /api/orders/* requests
│   └── payment.js    ← Handles /api/payment/* requests
├── services/
│   └── bkashService.js ← ALL bKash API communication lives here
├── db/
│   └── database.js   ← Database setup, tables, seed data
└── middleware/
    └── errorHandler.js ← Catches errors, sends clean responses
```

**Why separate into folders?**

This follows the **Separation of Concerns** principle:

- **Routes** = WHAT endpoints exist, request validation
- **Services** = HOW to talk to external APIs (bKash)
- **DB** = HOW to store/retrieve data
- **Config** = WHERE to find credentials
- **Middleware** = CROSS-CUTTING concerns (error handling, auth)

**Interview answer:** "I used a layered architecture — routes handle HTTP concerns,
services handle business logic and external API calls, and the database layer
handles persistence. This makes the code testable and each layer can change
independently."

### Request lifecycle

```
Client Request
     │
     ▼
┌─────────────┐
│  Express     │  1. cors() - Check if origin is allowed
│  Middleware   │  2. express.json() - Parse JSON body
│  Stack       │  3. Route matching
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Route      │  4. Validate input
│   Handler    │  5. Call service/database
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Service     │  6. Call bKash API (if payment)
│  Layer       │  7. Process response
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Database    │  8. Save/retrieve data
│  Layer       │
└──────┬──────┘
       │
       ▼
  JSON Response back to Client
```

If ANY step throws an error → **errorHandler middleware** catches it.

---

## 4. Database Design

### Why these tables?

```sql
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   products   │     │    orders     │     │   payments   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ name         │     │ customer_name│     │ order_id (FK)│──→ orders.id
│ description  │     │ total_amount │     │ bkash_payment│
│ price        │     │ status       │     │ bkash_trx_id │
│ image_url    │     │ created_at   │     │ amount       │
└──────┬───────┘     └──────┬───────┘     │ status       │
       │                    │              │ created_at   │
       │              ┌─────┴──────┐      └──────────────┘
       │              │order_items │
       └──────────────┤            │
                      ├────────────┤
                      │ id (PK)    │
                      │ order_id   │──→ orders.id
                      │ product_id │──→ products.id
                      │ quantity   │
                      │ price      │
                      └────────────┘
```

### Why separate `orders` and `payments`?

**Can't we just put payment info in the orders table?**

No! Because:
1. An order can exist WITHOUT a payment (user abandoned checkout)
2. A failed payment might be retried → multiple payment attempts for one order
3. Separation of concerns — order is about WHAT was bought, payment is about HOW it was paid

This is called **normalization** in database design.

### Why store `price` in `order_items` AND `products`?

Because product prices can change! If a course costs 499 BDT today and 599 BDT
tomorrow, the order should remember the price AT THE TIME OF PURCHASE.

This is called **capturing the price at transaction time**.

### Payment statuses — a state machine

```
                   ┌─── User cancels ──→ [cancelled]
                   │
[pending] → [initiated] → [completed] → [refunded]
                   │
                   └─── API error ────→ [failed]
```

- **pending**: Order created, payment not started
- **initiated**: bKash createPayment called, waiting for user
- **completed**: Payment executed successfully, money transferred
- **cancelled**: User clicked cancel on bKash page
- **failed**: Something went wrong (timeout, insufficient balance)
- **refunded**: Money returned to customer

---

## 5. Payment Gateway — The Core Concept

### What is "Tokenized Checkout"?

bKash offers different integration methods. We use **Tokenized Checkout (URL-based)**:

1. We call bKash API → get a payment URL
2. We redirect user to that URL (bKash's own page)
3. User enters their credentials on bKash's page
4. bKash redirects back to us

**Why "tokenized"?** Because we never see the user's real credentials.
Instead, we work with tokens:
- `id_token` — proves WE are a legitimate merchant
- `paymentID` — identifies a specific payment transaction
- `trxID` — the final transaction ID after payment completes

### Why tokens instead of username/password on every call?

```
BAD approach (no tokens):
Every API call: "Hey bKash, I'm merchant X, password Y, do Z"
  → Password sent 100 times = 100 chances for interception

GOOD approach (tokens):
Login once:  "Hey bKash, I'm merchant X, password Y, give me a token"
Every call:  "Hey bKash, here's my token, do Z"
  → Password sent once. Token is temporary (1 hour) so even if
    intercepted, damage is limited.
```

This is the same concept behind JWT (JSON Web Tokens) used in web authentication.

### The three-step payment dance

Think of it like a three-step verification:

```
Step 1: CREATE  — "I want to charge customer 499 BDT"
        bKash:    "OK, here's a payment page URL. Send the customer there."

Step 2: AUTHORIZE — Customer enters PIN + OTP on bKash's page
        bKash:     "Customer approved! Redirecting them back to you."

Step 3: EXECUTE  — "Great, finalize the payment"
        bKash:    "Done! Here's the transaction ID: TRX12345"
```

**Why not just one step?**

Security and user consent. The CREATE step doesn't move money — it just
reserves the intent. The user must AUTHORIZE on bKash's secure page.
Then we EXECUTE to actually transfer. This prevents merchants from
charging users without their knowledge.

---

## 6. bKash API — Step by Step

### Step 0: Authentication (Grant Token)

**Purpose:** Prove to bKash that we're a legitimate merchant.

```
POST https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant

Headers:
  Content-Type: application/json
  username: sandboxTokenizedUser02           ← Merchant username
  password: sandboxTokenizedUser02@12345     ← Merchant password

Body:
{
  "app_key": "4f6o0cjiki2rfm34kfdadl1eqq",  ← App identifier
  "app_secret": "2is7hdktrekvrbljjh44..."     ← App secret
}

Response:
{
  "statusCode": "0000",                       ← 0000 = success
  "statusMessage": "Successful",
  "id_token": "eyJraWQiOiJ...",              ← USE THIS for all future calls
  "token_type": "Bearer",
  "expires_in": 3600,                         ← Valid for 1 hour (3600 seconds)
  "refresh_token": "eyJhbGciOiJ..."          ← Use to get new id_token without password
}
```

**Code implementation:**
```javascript
// server/src/services/bkashService.js

let tokenStore = {
  id_token: null,
  expires_at: null,
};

async function grantToken() {
  // OPTIMIZATION: Don't call bKash if we already have a valid token
  // Check with 5-minute buffer (don't wait until the last second)
  if (tokenStore.id_token && tokenStore.expires_at > Date.now() + 5 * 60 * 1000) {
    return tokenStore.id_token;  // Reuse cached token
  }

  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/token/grant`,
    { app_key: bkashConfig.appKey, app_secret: bkashConfig.appSecret },
    {
      headers: {
        'Content-Type': 'application/json',
        username: bkashConfig.username,
        password: bkashConfig.password,
      },
      timeout: 30000, // 30 seconds — bKash requirement
    }
  );

  // Cache the token for future use
  tokenStore = {
    id_token: data.id_token,
    expires_at: Date.now() + 55 * 60 * 1000, // 55 min (safe buffer)
  };

  return data.id_token;
}
```

**Why cache the token?**
- bKash rate-limits token requests
- Each API call needs a token → without caching, you'd call grant token
  before EVERY operation (wasteful)
- Token is valid for 1 hour — cache it, reuse it

**Why 55 minutes instead of 60?**
- Token expires at exactly 60 minutes
- If you use it at 59:59 and the request takes 2 seconds → token expires mid-request
- 5-minute buffer = safety margin

### Step 1: Create Payment

**Purpose:** Tell bKash "I want to charge X amount" and get a payment page URL.

```
POST /tokenized/checkout/create

Headers:
  Content-Type: application/json
  Authorization: <id_token from Step 0>      ← Proves we're authenticated
  X-APP-Key: 4f6o0cjiki2rfm34kfdadl1eqq     ← Identifies our app

Body:
{
  "mode": "0011",                             ← URL-based checkout mode
  "payerReference": " ",                      ← Customer reference (space = none)
  "callbackURL": "http://localhost:5000/api/payment/callback",  ← WHERE bKash sends user back
  "amount": "499",                            ← Amount in BDT (must be string!)
  "currency": "BDT",
  "intent": "sale",                           ← "sale" = immediate payment
  "merchantInvoiceNumber": "INV-1-17760..."   ← YOUR unique invoice number
}

Response:
{
  "statusCode": "0000",
  "paymentID": "TR0011Vf...",                 ← Unique ID for this payment
  "bkashURL": "https://sandbox.payment.bkash.com/?paymentId=TR...",  ← REDIRECT USER HERE
  "callbackURL": "http://localhost:5000/api/payment/callback",
  "successCallbackURL": "...",
  "amount": "499",
  "intent": "sale",
  "currency": "BDT"
}
```

**Key parameters explained:**

- **`mode: "0011"`** — This tells bKash we want "URL-based checkout" (user goes to
  bKash's page). Other modes exist for in-app payment, subscription, etc.

- **`callbackURL`** — THE MOST IMPORTANT PARAMETER. After the user pays (or cancels)
  on bKash's page, bKash redirects them to THIS URL. This is how we know the
  payment outcome.

- **`merchantInvoiceNumber`** — YOUR unique identifier. This prevents
  **double charging**. If you accidentally call createPayment twice with the
  same invoice number, bKash recognizes it's a duplicate.

  ```
  This is called IDEMPOTENCY — a critical concept in payment systems.

  Idempotent = doing something twice produces the same result as doing it once.

  Real-world example:
  - Pressing an elevator button twice doesn't call two elevators
  - Paying invoice INV-001 twice doesn't charge you twice
  ```

- **`intent: "sale"`** — Immediate payment. Alternative is "authorization"
  (hold money now, charge later — like hotel reservations).

### Step 2: User Authorization (on bKash's page)

This step happens ENTIRELY on bKash's side. Our code does nothing here.

```
1. User lands on bkashURL (the pink page you saw)
2. Enters wallet number (01770618575 in sandbox)
3. Enters PIN (12121)
4. Enters OTP (123456)
5. bKash processes internally
6. bKash redirects user to:
   http://localhost:5000/api/payment/callback?paymentID=TR0011Vf...&status=success
```

**What if user cancels?**
```
bKash redirects to:
http://localhost:5000/api/payment/callback?paymentID=TR0011Vf...&status=cancel
```

**What if payment fails?**
```
bKash redirects to:
http://localhost:5000/api/payment/callback?paymentID=TR0011Vf...&status=failure
```

### Step 3: Execute Payment (in our callback)

**Purpose:** FINALIZE the payment. Create only reserves the intent — Execute
actually moves the money.

```
POST /tokenized/checkout/execute

Headers:
  Authorization: <id_token>
  X-APP-Key: <app_key>

Body:
{
  "paymentID": "TR0011Vf..."      ← The payment to execute
}

Response (success):
{
  "statusCode": "0000",
  "paymentID": "TR0011Vf...",
  "trxID": "BIF0GRSW23",          ← FINAL TRANSACTION ID (like a receipt number)
  "transactionStatus": "Completed",
  "amount": "499",
  "currency": "BDT",
  "customerMsisdn": "01770618575"  ← Customer's wallet number
}
```

**Why is Execute separate from Create?**

```
Without separate Execute (BAD):
  Create → Money moves immediately
  Problem: What if user didn't actually authorize? Fraud!

With separate Execute (GOOD):
  Create → Reserves intent only
  User authorizes on bKash page
  Execute → NOW money moves (with proof that user authorized)

This is called the "two-phase commit" pattern in distributed systems.
```

### Step 4: Query Payment (optional)

**Purpose:** Check the current status of any payment. Useful for:
- User claims "I paid but order shows pending" → query bKash to verify
- Reconciliation — batch-check all payments at end of day

```
POST /tokenized/checkout/payment/status

Body:
{
  "paymentID": "TR0011Vf..."
}

Response:
{
  "paymentID": "TR0011Vf...",
  "transactionStatus": "Completed",  ← or "Initiated", "Expired", etc.
  "trxID": "BIF0GRSW23",
  "amount": "499"
}
```

### Step 5: Refund Payment (optional)

**Purpose:** Return money to the customer.

```
POST /tokenized/checkout/payment/refund

Body:
{
  "paymentID": "TR0011Vf...",
  "trxID": "BIF0GRSW23",
  "amount": "499",              ← Can be partial (e.g., "200")
  "reason": "Customer request",
  "sku": "refund"
}
```

---

## 7. Backend Code Walkthrough

### File 1: `src/index.js` — The Entry Point

```javascript
require('dotenv').config();
// ↑ MUST be the first line. Loads .env variables into process.env
// After this line, process.env.BKASH_APP_KEY etc. are available

const express = require('express');
const cors = require('cors');

const app = express();

// === MIDDLEWARE (runs on EVERY request, in order) ===

app.use(cors({ origin: process.env.CLIENT_URL }));
// ↑ "Allow requests from http://localhost:5173 (our React app)"
// Without this: browser blocks all API calls → app broken

app.use(express.json());
// ↑ "Parse JSON request bodies"
// Without this: req.body is undefined → can't read POST data

// === DATABASE ===
const { initDB } = require('./db/database');
initDB();  // Creates tables + seeds data on first run

// === ROUTES ===
app.use('/api/products', productRoutes);
// ↑ Any request starting with /api/products goes to products.js
// GET /api/products → products.js handles it
// GET /api/products/3 → products.js handles it

app.use('/api/payment', paymentRoutes);
// ↑ POST /api/payment/create → payment.js handles it
// GET  /api/payment/callback → payment.js handles it

// === ERROR HANDLER (must be LAST) ===
app.use(errorHandler);
// ↑ Express knows this is an error handler because it has 4 parameters:
// (err, req, res, next) — the `err` parameter is the key

app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
// ↑ Start listening for HTTP requests on port 5000
```

### File 2: `src/services/bkashService.js` — The Heart of Payment

This is the most important file. Let me explain every function:

```javascript
// === TOKEN CACHING ===

let tokenStore = {
  id_token: null,
  refresh_token: null,
  expires_at: null,
};
// ↑ We store the token in MEMORY (a variable).
//   In production, you'd use Redis for this (shared across servers).
//   For a single server, a variable works fine.

async function grantToken() {
  // Check: do we already have a valid token?
  if (tokenStore.id_token && tokenStore.expires_at > Date.now() + 5 * 60 * 1000) {
    return tokenStore.id_token;  // Yes! Reuse it.
  }
  //                                    ↑ 5 * 60 * 1000 = 5 minutes in milliseconds
  //                                      We refresh 5 minutes EARLY as safety buffer

  // No valid token → call bKash
  const { data } = await axios.post(url, body, { headers, timeout: 30000 });
  //                                                       ↑ IMPORTANT: 30-second timeout
  //                                                         bKash recommends this.
  //                                                         If bKash doesn't respond in 30s,
  //                                                         throw an error instead of waiting forever.

  tokenStore = {
    id_token: data.id_token,
    expires_at: Date.now() + 55 * 60 * 1000,  // Cache for 55 minutes
  };

  return data.id_token;
}

async function createPayment(amount, invoiceNumber) {
  const id_token = await getToken();  // Get token (cached or fresh)

  const { data } = await axios.post(
    `${baseURL}/tokenized/checkout/create`,
    {
      mode: '0011',
      payerReference: ' ',
      callbackURL: config.callbackURL,
      amount: amount.toString(),    // bKash expects string, not number!
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: invoiceNumber,
    },
    {
      headers: {
        Authorization: id_token,    // Proves we're authenticated
        'X-APP-Key': config.appKey, // Identifies our app
      },
    }
  );

  return data;  // Contains paymentID and bkashURL
}
```

### File 3: `src/routes/payment.js` — Connecting Frontend to bKash

**POST /api/payment/create — Starting a payment:**

```javascript
router.post('/create', async (req, res, next) => {
  try {
    const { customerName, cartItems } = req.body;
    // ↑ Frontend sends: { customerName: "Rahat", cartItems: [{...}] }

    // 1. Calculate total from cart items
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );

    // 2. Create order in OUR database (status: pending)
    const orderResult = db.prepare(
      'INSERT INTO orders (customer_name, total_amount, status) VALUES (?, ?, ?)'
    ).run(customerName, totalAmount, 'pending');
    //                               ↑ Using parameterized queries (? placeholders)
    //                                 This PREVENTS SQL injection attacks!
    //                                 Never do: `... VALUES ('${name}', ...)` — hackable

    const orderId = orderResult.lastInsertRowid;

    // 3. Create unique invoice number
    const invoiceNumber = `INV-${orderId}-${Date.now()}`;
    //                                     ↑ Timestamp ensures uniqueness even if
    //                                       orderId is reused after DB reset

    // 4. Call bKash API
    const paymentResponse = await bkashService.createPayment(totalAmount, invoiceNumber);

    // 5. Save payment record (so we can track it later)
    db.prepare(
      'INSERT INTO payments (order_id, bkash_payment_id, amount, status) VALUES (?, ?, ?, ?)'
    ).run(orderId, paymentResponse.paymentID, totalAmount, 'initiated');

    // 6. Send bkashURL to frontend (frontend will redirect user there)
    res.json({
      orderId,
      paymentID: paymentResponse.paymentID,
      bkashURL: paymentResponse.bkashURL,   // ← Frontend does: window.location.href = bkashURL
    });
  } catch (err) {
    next(err);  // Pass error to errorHandler middleware
  }
});
```

**GET /api/payment/callback — bKash sends user back here:**

```javascript
router.get('/callback', async (req, res, next) => {
  const { paymentID, status } = req.query;
  // ↑ bKash redirects to:
  //   /api/payment/callback?paymentID=TR0011Vf...&status=success
  //   We extract paymentID and status from the URL

  // Find which order this payment belongs to
  const payment = db.prepare(
    'SELECT * FROM payments WHERE bkash_payment_id = ?'
  ).get(paymentID);

  if (status === 'success') {
    // User authorized → now EXECUTE to finalize
    const executeResult = await bkashService.executePayment(paymentID);

    if (executeResult.transactionStatus === 'Completed') {
      // SUCCESS! Update our database
      db.prepare('UPDATE payments SET status = ?, bkash_trx_id = ? WHERE ...')
        .run('completed', executeResult.trxID, paymentID);
      //                  ↑ Save the transaction ID — this is our PROOF of payment

      db.prepare('UPDATE orders SET status = ? WHERE id = ?')
        .run('paid', payment.order_id);

      // Redirect user to frontend success page
      return res.redirect(`${CLIENT_URL}/payment-status?status=success&trxID=${executeResult.trxID}`);
    }
  }

  // Handle cancel/failure...
  // Update DB status accordingly, redirect to failure page
});
```

**Why `res.redirect()` instead of `res.json()`?**

Because this endpoint is called via browser redirect (bKash sends the user's
browser here), not via an AJAX call from our frontend. The user's browser is
literally navigating to this URL, so we redirect them to the React frontend.

---

## 8. Security

### 8.1 — Credentials never reach the frontend

```
WRONG (insecure):
  Frontend calls bKash directly with app_key and app_secret
  → User opens browser DevTools → sees your secret keys → can make fake payments

RIGHT (what we do):
  Frontend calls OUR backend → backend calls bKash with secrets
  → Secrets stay on the server, user never sees them
```

This is why the `.env` file is on the **server** side and is **gitignored**.

### 8.2 — SQL Injection Prevention

```javascript
// VULNERABLE (NEVER do this):
db.prepare(`SELECT * FROM users WHERE name = '${userInput}'`);
// If userInput = "'; DROP TABLE users; --"
// → Deletes your entire users table!

// SAFE (what we do):
db.prepare('SELECT * FROM users WHERE name = ?').get(userInput);
// The ? placeholder escapes special characters
// "'; DROP TABLE users; --" is treated as a literal string, not SQL
```

### 8.3 — CORS (Cross-Origin Resource Security)

```javascript
// We restrict which websites can call our API:
app.use(cors({ origin: 'http://localhost:5173' }));

// Without this restriction, any random website could call our API
// A hacker's site (evil.com) could make requests to our payment endpoints
```

### 8.4 — User PIN/OTP never touches our server

The user enters PIN and OTP on **bKash's own page** (the pink page).
Our server never receives, stores, or even sees this data.

This is called **PCI DSS compliance** in the payment industry — the idea that
sensitive payment credentials should only be handled by certified processors.

### 8.5 — Payment verification (don't trust the frontend)

```
WRONG:
  Frontend says "payment successful!" → mark order as paid
  → User can fake the success status via browser console

RIGHT (what we do):
  1. bKash redirects to our BACKEND callback
  2. Backend calls bKash executePayment API to VERIFY
  3. Only if bKash confirms → mark order as paid

  → Even if someone fakes the callback URL, the executePayment call
    to bKash will fail because bKash knows the payment wasn't authorized
```

### 8.6 — Idempotency (preventing double charges)

```
Scenario: User clicks "Pay" button, network is slow, user clicks again.
Without idempotency: Two payments created → user charged twice!

With idempotency (merchantInvoiceNumber):
  First click:  createPayment(invoiceNumber: "INV-1-12345") → Creates payment
  Second click: createPayment(invoiceNumber: "INV-1-12345") → bKash says "already exists"
  → User charged only once
```

---

## 9. Error Handling

### What can go wrong?

```
1. bKash API is down              → timeout after 30s, show error
2. Token expired mid-transaction  → auto-refresh and retry
3. User cancels payment           → status=cancel, update DB, show message
4. Insufficient balance           → bKash returns failure, we handle gracefully
5. Network drops during callback  → user lands nowhere
6. Double-click on Pay button     → idempotent invoice number prevents double charge
```

### The try/catch + next(err) pattern

```javascript
router.post('/create', async (req, res, next) => {
  try {
    // ... all the payment logic ...
    res.json(result);
  } catch (err) {
    next(err);   // ← Passes error to errorHandler middleware
  }
});

// In middleware/errorHandler.js:
function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);   // Log for debugging
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
  // ↑ Send a clean error message to the client
  //   Never send stack traces to the client (security risk)
}
```

**Why `next(err)` instead of `res.status(500).json(...)` directly?**

Centralized error handling. Every route uses the same error format.
If you want to add error logging, Slack alerts, etc., you change ONE file.

---

## 10. Production Considerations

If this were a real production app, you'd need:

### 10.1 — Webhook instead of (or in addition to) Callback

```
Callback (what we use):
  bKash redirects user's browser → our URL
  Problem: What if user closes browser before redirect? We never know about the payment!

Webhook (production approach):
  bKash sends a server-to-server HTTP request to our URL
  No browser involved → reliable even if user disconnects
  Called IPN (Instant Payment Notification)
```

### 10.2 — Database upgrade

```
SQLite → PostgreSQL or MySQL
Why:
- SQLite can't handle concurrent writes well (one writer at a time)
- No network access (can't share between multiple servers)
- No built-in replication/backup
```

### 10.3 — Redis for token caching

```
Current: Token stored in JavaScript variable
Problem: If server restarts → token lost → must re-authenticate
Problem: If running multiple server instances → each has different token

Redis: External key-value store
- Survives server restarts
- Shared across all server instances
- Built-in TTL (auto-delete after 55 minutes)
```

### 10.4 — Payment reconciliation

```
Daily job that:
1. Fetches all "initiated" payments from our DB
2. Calls bKash queryPayment for each
3. Updates any mismatched statuses
4. Alerts team about discrepancies

This catches edge cases where callback/webhook was missed.
```

### 10.5 — HTTPS (SSL)

```
bKash REQUIRES SSL for production callbacks.
Sandbox allows HTTP (localhost), but production must be HTTPS.
```

---

## 11. Interview Q&A

### Q: "Explain how your payment gateway integration works."

> "I integrated bKash's Tokenized Checkout API into a Node.js/Express backend.
> The flow starts when the user clicks Pay — our backend calls bKash's Create
> Payment API with the amount and a unique invoice number for idempotency.
> bKash returns a payment URL where we redirect the user. The user authorizes
> the payment on bKash's secure page — our server never sees their PIN or OTP.
> After authorization, bKash redirects back to our callback URL. We then call
> the Execute Payment API to finalize the transaction, verify the response,
> and update our database. We also implemented token caching with auto-refresh,
> payment status querying for reconciliation, and refund capabilities."

### Q: "Why didn't you handle the payment entirely on the frontend?"

> "Security. Payment credentials (app_key, app_secret) must never be exposed to
> the client. If they were in the frontend, anyone could inspect the browser
> DevTools and steal them. All bKash API calls happen server-side. The frontend
> only knows the payment URL to redirect to and the final status."

### Q: "What is idempotency and why does it matter in payments?"

> "Idempotency means performing the same operation multiple times produces
> the same result. In payments, this prevents double-charging. If a user
> clicks Pay twice due to slow network, both requests use the same
> merchantInvoiceNumber. bKash recognizes the duplicate and doesn't create
> a second payment. This is critical — charging someone twice is a serious
> bug that causes financial loss and trust issues."

### Q: "How do you handle payment failures?"

> "Multiple levels. First, all bKash API calls have 30-second timeouts.
> If the API is down, we catch the error and inform the user. If the user
> cancels on bKash's page, the callback receives status=cancel and we mark
> the order as cancelled. If execution fails after authorization, we mark
> it as failed. For edge cases where callbacks are missed, a reconciliation
> process can query bKash to verify payment statuses."

### Q: "What would you change for production?"

> "Five things: (1) Switch from SQLite to PostgreSQL for concurrent access.
> (2) Add webhooks alongside callbacks for reliability. (3) Use Redis for
> token caching across server instances. (4) Add a daily reconciliation job.
> (5) HTTPS certificate for the callback URL, which bKash requires for
> production."

### Q: "What's the difference between Create and Execute payment?"

> "Create reserves the payment intent — it tells bKash how much to charge
> but doesn't move money. The user then authorizes on bKash's page. Execute
> is called after authorization and actually transfers the money. This
> two-phase approach ensures money only moves with explicit user consent.
> It's similar to the two-phase commit pattern in distributed systems."

### Q: "How does token management work?"

> "We authenticate with bKash using our merchant credentials to get an
> id_token valid for 1 hour. We cache this token in memory and reuse it
> for all API calls. When it's about to expire (5-minute buffer), we
> refresh it using the refresh_token, which is valid for 28 days.
> This minimizes API calls and avoids authentication delays during payments."

### Q: "How do you prevent SQL injection?"

> "I use parameterized queries with ? placeholders. The database driver
> automatically escapes special characters in user input, so even if
> someone passes malicious SQL, it's treated as a literal string.
> I never concatenate user input directly into SQL strings."
