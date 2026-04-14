// ===== Status Types =====
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'initiated' | 'completed' | 'failed' | 'cancelled' | 'refunded';
export type UserRole = 'customer' | 'admin';

// ===== User Model =====
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export type PublicUser = Omit<User, 'password_hash'>;

// ===== Database Models =====
export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export interface Order {
  id: number;
  customer_name: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
}

export interface Payment {
  id: number;
  order_id: number;
  bkash_payment_id: string | null;
  bkash_trx_id: string | null;
  amount: number;
  status: PaymentStatus;
  created_at: string;
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title: string | null;
  body: string;
  created_at: string;
}

export interface ReviewWithUser extends Review {
  user_name: string;
  user_email: string;
}

// ===== API Types =====
export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface CreatePaymentRequest {
  customerName: string;
  cartItems: CartItem[];
}

export interface OrderWithPayment extends Order {
  bkash_payment_id: string | null;
  bkash_trx_id: string | null;
  payment_status: PaymentStatus;
}

export interface OrderDetail extends OrderWithPayment {
  items: (OrderItem & { product_name: string })[];
}

// ===== bKash API Types =====
export interface BkashTokenResponse {
  statusCode: string;
  statusMessage: string;
  id_token: string;
  refresh_token: string;
  token_type: string;
}

export interface BkashCreatePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  bkashURL: string;
}

export interface BkashExecuteResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  transactionStatus: string;
  amount: string;
}

export interface BkashRefundResponse {
  statusCode: string;
  statusMessage: string;
  transactionStatus: string;
}

export interface BkashConfig {
  baseURL: string;
  username: string;
  password: string;
  appKey: string;
  appSecret: string;
  callbackURL: string;
}
