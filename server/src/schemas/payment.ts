import { z } from 'zod';

export const CreatePaymentSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(100),
  cartItems: z.array(z.object({
    productId: z.number().int().positive(),
    name: z.string(),
    price: z.number().positive(),
    quantity: z.number().int().min(1).max(99),
  })).min(1, 'Cart must have at least one item').max(50),
});

export const RefundSchema = z.object({
  reason: z.string().max(500).optional().default('Customer request'),
});

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type RefundInput = z.infer<typeof RefundSchema>;
