import crypto from 'crypto';
import { db } from '../db';
import { Payment, PaymentAttempt, SupportedCurrency, PaymentMethodType, ProviderType } from '../../types';
import { fxService } from './fxService';
import { providerService } from './providerService';
import { ledgerService } from './ledgerService';
import { settlementService } from './settlementService';
import { auditService } from './auditService';

export class PaymentService {
  /**
   * Initializes a new payment intent based on a validated locked quote
   */
  public async createPayment(params: {
    quoteId: string;
    merchantId?: string;
    customerEmail: string;
    customerName: string;
    customerCountry?: string;
    paymentMethod?: PaymentMethodType;
    description?: string;
  }): Promise<{ success: boolean; payment?: Payment; error?: string }> {
    // 1. Validate quote and check expiration / signature
    const quoteValidation = fxService.validateQuote(params.quoteId);
    if (!quoteValidation.valid || !quoteValidation.quote) {
      return { success: false, error: quoteValidation.error || 'Invalid payment quote' };
    }

    const quote = quoteValidation.quote;
    const merchant = db.merchants.get(params.merchantId || 'mer_lagos_tech_corp_001');
    if (!merchant) {
      return { success: false, error: 'Target merchant not registered or verified' };
    }

    // 2. Risk / KYC & Sanctions check
    const isHighRiskCountry = ['North Korea', 'Iran', 'Syria'].includes(params.customerCountry || '');
    if (isHighRiskCountry) {
      return { success: false, error: 'Transaction rejected by AML / sanctions compliance policy.' };
    }

    const reference = `NS-TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const customerId = `cust_${crypto.createHash('md5').update(params.customerEmail.toLowerCase()).digest('hex').substring(0, 8)}`;

    // Ensure customer record
    if (!db.customers.has(customerId)) {
      db.customers.set(customerId, {
        id: customerId,
        email: params.customerEmail,
        name: params.customerName || 'Customer',
        country: params.customerCountry || 'International',
        createdAt: new Date().toISOString()
      });
    }

    const selectedProvider = db.platformConfig.primaryProvider || 'flutterwave';
    const method: PaymentMethodType = params.paymentMethod || 'card';

    const payment: Payment = {
      id: paymentId,
      reference,
      merchantId: merchant.id,
      merchantName: merchant.businessName,
      customerId,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      customerCountry: params.customerCountry || 'International',
      baseAmount: quote.baseAmount, // Server-enforced NGN
      baseCurrency: 'NGN',
      customerAmount: quote.customerAmount, // Server-enforced foreign currency
      customerCurrency: quote.customerCurrency,
      exchangeRate: quote.exchangeRate,
      exchangeRateTimestamp: quote.exchangeRateTimestamp,
      rateSource: quote.rateSource,
      quoteId: quote.quoteId,
      paymentProvider: selectedProvider,
      paymentMethod: method,
      fees: {
        platformFee: quote.platformFeeAmount,
        processingFee: quote.providerProcessingFee,
        totalFeesCustomerCurrency: quote.platformFeeAmount + quote.providerProcessingFee,
        totalFeesNGNEquivalent: Math.round((quote.platformFeeAmount + quote.providerProcessingFee) * quote.exchangeRate * 100) / 100,
        vatNGN: Math.round((quote.platformFeeAmount * quote.exchangeRate * 0.075) * 100) / 100
      },
      netSettlementNGN: quote.netSettlementNGN,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: params.description || `Payment of ${quote.customerAmount} ${quote.customerCurrency} for services rendered`,
      settlementStatus: 'pending'
    };

    db.payments.set(reference, payment);

    auditService.log('PAYMENT_INTENT_CREATED', 'payment', 'customer', customerId, {
      reference,
      baseAmountNGN: quote.baseAmount,
      customerAmount: quote.customerAmount,
      customerCurrency: quote.customerCurrency,
      exchangeRate: quote.exchangeRate
    });

    return { success: true, payment };
  }

  /**
   * Initiates payment execution with the payment provider
   */
  public async processPaymentAttempt(
    reference: string,
    paymentDetails?: {
      cardNumber?: string;
      expiryMonth?: string;
      expiryYear?: string;
      cvv?: string;
      pin?: string;
      otp?: string;
    }
  ): Promise<{
    success: boolean;
    payment?: Payment;
    attempt?: PaymentAttempt;
    requires3DS?: boolean;
    requiresOtp?: boolean;
    checkoutUrl?: string;
    message: string;
  }> {
    const payment = db.payments.get(reference);
    if (!payment) {
      return { success: false, message: 'Payment reference not found' };
    }

    if (payment.status === 'successful') {
      return { success: true, payment, message: 'Payment has already been completed.' };
    }

    const provider = providerService.getProvider(payment.paymentProvider);
    const attemptId = `att_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const initiateResult = await provider.initiatePayment(payment, paymentDetails);

    const attempt: PaymentAttempt = {
      id: attemptId,
      paymentId: payment.id,
      paymentReference: payment.reference,
      provider: payment.paymentProvider,
      providerReference: initiateResult.providerReference,
      paymentMethod: payment.paymentMethod,
      status: initiateResult.success ? (initiateResult.requires3DSecure ? 'processing' : 'successful') : 'failed',
      responseCode: initiateResult.success ? '00' : '51',
      responseMessage: initiateResult.message,
      ipAddress: '127.0.0.1',
      riskScore: 12,
      createdAt: new Date().toISOString()
    };

    db.paymentAttempts.set(attemptId, attempt);

    if (initiateResult.success) {
      payment.providerTransactionId = initiateResult.providerTransactionId;
      payment.providerReference = initiateResult.providerReference;

      if (!initiateResult.requires3DSecure) {
        payment.status = 'successful';
        payment.paidAt = new Date().toISOString();
        payment.updatedAt = new Date().toISOString();
        db.payments.set(reference, payment);

        // Record in Ledger
        ledgerService.recordPaymentSuccess(payment);

        // Auto-Settlement Trigger
        if (db.platformConfig.autoSettlementEnabled && db.platformConfig.settlementSchedule === 'instant') {
          settlementService.executeSettlement(payment.merchantId, 'auto').catch((err) => {
            console.error('[SettlementAuto] Error executing automated settlement:', err);
          });
        }

        auditService.log('PAYMENT_CHARGED_SUCCESSFULLY', 'payment', 'system', payment.id, {
          reference: payment.reference,
          amount: payment.customerAmount,
          currency: payment.customerCurrency,
          provider: payment.paymentProvider
        });
      }

      return {
        success: true,
        payment,
        attempt,
        requires3DS: initiateResult.requires3DSecure,
        checkoutUrl: initiateResult.checkoutUrl,
        message: initiateResult.message
      };
    } else {
      payment.status = 'failed';
      payment.updatedAt = new Date().toISOString();
      db.payments.set(reference, payment);

      return {
        success: false,
        payment,
        attempt,
        message: initiateResult.message
      };
    }
  }

  /**
   * Directly verifies payment status with the gateway
   */
  public async verifyPaymentStatus(reference: string): Promise<{
    verified: boolean;
    payment?: Payment;
    message: string;
  }> {
    const payment = db.payments.get(reference);
    if (!payment) {
      return { verified: false, message: 'Payment record not found' };
    }

    const provider = providerService.getProvider(payment.paymentProvider);
    const verification = await provider.verifyTransaction(
      payment.providerReference || payment.reference,
      payment.customerAmount,
      payment.customerCurrency
    );

    if (verification.verified && verification.status === 'successful') {
      if (payment.status !== 'successful') {
        payment.status = 'successful';
        payment.paidAt = new Date().toISOString();
        payment.providerTransactionId = verification.providerTransactionId;
        payment.updatedAt = new Date().toISOString();
        db.payments.set(reference, payment);

        ledgerService.recordPaymentSuccess(payment);
      }
      return { verified: true, payment, message: 'Payment successfully verified directly with provider.' };
    }

    return { verified: false, payment, message: verification.message };
  }
}

export const paymentService = new PaymentService();
