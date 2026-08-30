import { Payment, PaymentAttempt, ProviderType, SupportedCurrency, PaymentMethodType } from '../../../types';

export interface ProviderInitiateResult {
  success: boolean;
  providerTransactionId: string;
  providerReference: string;
  checkoutUrl?: string;
  status: 'initiated' | 'pending_otp' | 'successful' | 'failed';
  requires3DSecure?: boolean;
  requiresOtp?: boolean;
  rawResponse: Record<string, unknown>;
  message: string;
}

export interface ProviderVerifyResult {
  verified: boolean;
  providerTransactionId: string;
  providerReference: string;
  status: 'successful' | 'failed' | 'pending';
  amountPaid: number;
  currencyPaid: string;
  customerEmail: string;
  feeCharged: number;
  settlementAmountNGN: number;
  cardLast4?: string;
  rawResponse: Record<string, unknown>;
  message: string;
}

export interface ProviderRefundResult {
  success: boolean;
  providerRefundId: string;
  status: 'completed' | 'processing' | 'failed';
  refundedAmount: number;
  refundedCurrency: string;
  message: string;
}

export interface IPaymentProvider {
  providerName: ProviderType;
  
  initiatePayment(payment: Payment, paymentDetails?: {
    cardNumber?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cvv?: string;
    pin?: string;
    otp?: string;
  }): Promise<ProviderInitiateResult>;

  verifyTransaction(providerReference: string, expectedAmount: number, expectedCurrency: string): Promise<ProviderVerifyResult>;

  verifyWebhookSignature(rawBody: string | Record<string, unknown>, signatureHeader: string, secretHash: string): boolean;

  processRefund(providerTransactionId: string, amount: number, currency: string, reason: string): Promise<ProviderRefundResult>;

  checkHealth(): Promise<{ isHealthy: boolean; latencyMs: number; provider: ProviderType }>;
}
