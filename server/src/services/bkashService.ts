import axios from 'axios';
import bkashConfig from '../config/bkash.js';
import type { BkashTokenResponse, BkashCreatePaymentResponse, BkashExecuteResponse, BkashRefundResponse } from '../types/index.js';

// ============================================================
// TOKEN MANAGEMENT
// We cache the token in memory and refresh it before it expires.
// The id_token is valid for 1 hour, refresh_token for 28 days.
// ============================================================

interface TokenStore {
  id_token: string | null;
  refresh_token: string | null;
  token_type: string | null;
  expires_at: number | null;
}

let tokenStore: TokenStore = {
  id_token: null,
  refresh_token: null,
  token_type: null,
  expires_at: null,
};

/**
 * Grant Token - First step in every bKash API interaction.
 * Authenticates with username/password + app credentials.
 * Returns id_token used as Authorization header in subsequent calls.
 */
async function grantToken(): Promise<string> {
  // Return cached token if still valid (with 5-min buffer)
  if (tokenStore.id_token && tokenStore.expires_at && tokenStore.expires_at > Date.now() + 5 * 60 * 1000) {
    return tokenStore.id_token;
  }

  const { data } = await axios.post<BkashTokenResponse>(
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
      expires_at: Date.now() + 55 * 60 * 1000,
    };
    return data.id_token;
  }

  throw new Error(`Token grant failed: ${data.statusMessage || JSON.stringify(data)}`);
}

/**
 * Refresh Token - Refreshes an expired id_token using the refresh_token.
 */
async function refreshToken(): Promise<string> {
  if (!tokenStore.refresh_token) {
    return grantToken();
  }

  const { data } = await axios.post<BkashTokenResponse>(
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

  return grantToken();
}

/**
 * Helper to get a valid token (grant or refresh as needed)
 */
async function getToken(): Promise<string> {
  if (!tokenStore.id_token) {
    return grantToken();
  }
  if (!tokenStore.expires_at || tokenStore.expires_at <= Date.now() + 5 * 60 * 1000) {
    return refreshToken();
  }
  return tokenStore.id_token;
}

// ============================================================
// PAYMENT OPERATIONS
// ============================================================

async function createPayment(amount: number, invoiceNumber: string): Promise<BkashCreatePaymentResponse> {
  const id_token = await getToken();

  const { data } = await axios.post<BkashCreatePaymentResponse>(
    `${bkashConfig.baseURL}/tokenized/checkout/create`,
    {
      mode: '0011',
      payerReference: ' ',
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

async function executePayment(paymentID: string): Promise<BkashExecuteResponse> {
  const id_token = await getToken();

  const { data } = await axios.post<BkashExecuteResponse>(
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

async function queryPayment(paymentID: string): Promise<BkashExecuteResponse> {
  const id_token = await getToken();

  const { data } = await axios.post<BkashExecuteResponse>(
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

async function refundPayment(
  paymentID: string,
  trxID: string,
  amount: number,
  reason: string = 'Customer request'
): Promise<BkashRefundResponse> {
  const id_token = await getToken();

  const { data } = await axios.post<BkashRefundResponse>(
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

export {
  grantToken,
  refreshToken,
  createPayment,
  executePayment,
  queryPayment,
  refundPayment,
};
