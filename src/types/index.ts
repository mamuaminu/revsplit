export interface Recipient {
  id: string;
  email: string;
  name?: string;
  percentage: number; // 0-100
  fixedAmount?: number; // in cents, optional
}

export interface SplitConfig {
  id: string;
  name: string;
  description?: string;
  productName: string;
  amount: number; // in cents
  currency: string;
  recipients: Recipient[];
  stripePriceId?: string;
  stripePaymentLinkId?: string;
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface PaymentRecord {
  id: string;
  splitConfigId: string;
  stripePaymentIntentId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  recipientPayouts: RecipientPayout[];
  createdAt: string;
}

export interface RecipientPayout {
  recipientId: string;
  email: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paidAt?: string;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalPayments: number;
  successRate: number;
  byRecipient: Record<string, { totalPaid: number; pending: number; payments: number }>;
}

export interface CreateSplitBody {
  name: string;
  description?: string;
  productName: string;
  amount: number;
  currency: string;
  recipients: Omit<Recipient, 'id'>[];
  webhookUrl?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
