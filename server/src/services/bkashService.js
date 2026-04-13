const axios = require('axios');
const bkashConfig = require('../config/bkash');

// ============================================================
// TOKEN MANAGEMENT
// We cache the token in memory and refresh it before it expires.
// The id_token is valid for 1 hour, refresh_token for 28 days.
// ============================================================

let tokenStore = {
  id_token: null,
  refresh_token: null,
  token_type: null,
  expires_at: null, // timestamp when token expires
};

/**
 * Grant Token - First step in every bKash API interaction.
 * Authenticates with username/password + app credentials.
 * Returns id_token used as Authorization header in subsequent calls.
 */
async function grantToken() {
  // Return cached token if still valid (with 5-min buffer)
  if (tokenStore.id_token && tokenStore.expires_at > Date.now() + 5 * 60 * 1000) {
    return tokenStore.id_token;
  }

  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/token/grant`,
    {
      app_key: bkashConfig.appKey,
      app_secret: bkashConfig.appSecret,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        username: bkashConfig.username,
        password: bkashConfig.password,
      },
      timeout: 30000,
    }
  );

  if (data.statusCode === '0000' || data.id_token) {
    tokenStore = {
      id_token: data.id_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_at: Date.now() + 55 * 60 * 1000, // 55 minutes (token valid for 1 hour)
    };
    return data.id_token;
  }

  throw new Error(`Token grant failed: ${data.statusMessage || JSON.stringify(data)}`);
}

/**
 * Refresh Token - Refreshes an expired id_token using the refresh_token.
 * Refresh token is valid for 28 days.
 */
async function refreshToken() {
  if (!tokenStore.refresh_token) {
    return grantToken(); // No refresh token, get a new one
  }

  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/token/refresh`,
    {
      app_key: bkashConfig.appKey,
      app_secret: bkashConfig.appSecret,
      refresh_token: tokenStore.refresh_token,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        username: bkashConfig.username,
        password: bkashConfig.password,
      },
      timeout: 30000,
    }
  );

  if (data.statusCode === '0000' || data.id_token) {
    tokenStore = {
      id_token: data.id_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type,
      expires_at: Date.now() + 55 * 60 * 1000,
    };
    return data.id_token;
  }

  // If refresh fails, try a fresh grant
  return grantToken();
}

/**
 * Helper to get a valid token (grant or refresh as needed)
 */
async function getToken() {
  if (!tokenStore.id_token) {
    return grantToken();
  }
  if (tokenStore.expires_at <= Date.now() + 5 * 60 * 1000) {
    return refreshToken();
  }
  return tokenStore.id_token;
}

// ============================================================
// PAYMENT OPERATIONS
// ============================================================

/**
 * Create Payment - Initiates a bKash payment.
 * Returns a bkashURL where the user must be redirected to authorize payment.
 *
 * @param {number} amount - Payment amount in BDT
 * @param {string} invoiceNumber - Unique invoice (used for idempotency)
 * @returns {object} { paymentID, bkashURL, ... }
 */
async function createPayment(amount, invoiceNumber) {
  const id_token = await getToken();

  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/create`,
    {
      mode: '0011', // Checkout URL mode
      payerReference: ' ', // Space = no agreement
      callbackURL: bkashConfig.callbackURL,
      amount: amount.toString(),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: invoiceNumber,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: id_token,
        'X-APP-Key': bkashConfig.appKey,
      },
      timeout: 30000,
    }
  );

  if (data.statusCode === '0000' || data.bkashURL) {
    return data;
  }

  throw new Error(`Create payment failed: ${data.statusMessage || JSON.stringify(data)}`);
}

/**
 * Execute Payment - Finalizes payment after user authorization.
 * Called when bKash redirects back to our callback URL with status=success.
 *
 * @param {string} paymentID - The paymentID from createPayment
 * @returns {object} { trxID, paymentID, status, ... }
 */
async function executePayment(paymentID) {
  const id_token = await getToken();

  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/execute`,
    { paymentID },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: id_token,
        'X-APP-Key': bkashConfig.appKey,
      },
      timeout: 30000,
    }
  );

  return data;
}

/**
 * Query Payment - Check the current status of a payment.
 * Useful for reconciliation or verifying payment state.
 *
 * @param {string} paymentID - The paymentID to query
 * @returns {object} Payment status details
 */
async function queryPayment(paymentID) {
  const id_token = await getToken();

  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/payment/status`,
    { paymentID },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: id_token,
        'X-APP-Key': bkashConfig.appKey,
      },
      timeout: 30000,
    }
  );

  return data;
}

/**
 * Refund Payment - Refund a completed payment (full or partial).
 *
 * @param {string} paymentID - Original payment ID
 * @param {string} trxID - Transaction ID from execute
 * @param {number} amount - Amount to refund
 * @param {string} reason - Reason for refund
 * @returns {object} Refund result
 */
async function refundPayment(paymentID, trxID, amount, reason = 'Customer request') {
  const id_token = await getToken();

  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/payment/refund`,
    {
      paymentID,
      trxID,
      amount: amount.toString(),
      reason,
      sku: 'refund',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: id_token,
        'X-APP-Key': bkashConfig.appKey,
      },
      timeout: 30000,
    }
  );

  return data;
}

module.exports = {
  grantToken,
  refreshToken,
  createPayment,
  executePayment,
  queryPayment,
  refundPayment,
};
