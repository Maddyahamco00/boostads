import { db } from '../db';
import { RefundRecord, Payment, SupportedCurrency } from '../../types';
import { ledgerService } from './ledgerService';
import { providerService } from './providerService';
import { auditService } from './auditService';

export class RefundService {
  public async createRefund(
    paymentReference: string,
    refundAmountCustomerCurrency: number,
    reason: string,
    requestedBy: string
  ): Promise<{ success: boolean; refund?: RefundRecord; message: string }> {
    const payment = db.payments.get(paymentReference);
    if (!payment) {
      return { success: false, message: 'Payment record not found' };
    }

    if (payment.status !== 'successful') {
      return { success: false, message: `Cannot refund payment in '${payment.status}' state.` };
    }

    if (refundAmountCustomerCurrency <= 0 || refundAmountCustomerCurrency > payment.customerAmount) {
      return {
        success: false,
        message: `Refund amount must be between 0 and maximum charged amount (${payment.customerAmount} ${payment.customerCurrency})`
      };
    }

    // Calculate proportional NGN settlement impact using the original locked FX rate
    const fxRate = payment.exchangeRate;
    const isFullRefund = Math.abs(refundAmountCustomerCurrency - payment.customerAmount) < 0.01;
    const settlementNGNImpact = isFullRefund
      ? payment.netSettlementNGN
      : Math.round((refundAmountCustomerCurrency * fxRate) * 100) / 100;

    const refundId = `ref_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Call Provider Refund API
    const provider = providerService.getProvider(payment.paymentProvider);
    const providerResult = await provider.processRefund(
      payment.providerTransactionId || payment.reference,
      refundAmountCustomerCurrency,
      payment.customerCurrency,
      reason
    );

    const refund: RefundRecord = {
      id: refundId,
      paymentId: payment.id,
      paymentReference: payment.reference,
      merchantId: payment.merchantId,
      originalAmountCustomerCurrency: payment.customerAmount,
      originalCustomerCurrency: payment.customerCurrency,
      refundAmountCustomerCurrency,
      refundCurrency: payment.customerCurrency,
      fxRateApplied: fxRate,
      settlementNGNImpact,
      reason,
      providerRefundId: providerResult.providerRefundId,
      status: providerResult.success ? 'completed' : 'failed',
      requestedBy,
      createdAt: new Date().toISOString(),
      completedAt: providerResult.success ? new Date().toISOString() : undefined
    };

    db.refunds.set(refundId, refund);

    if (providerResult.success) {
      // Update Payment status
      payment.status = isFullRefund ? 'refunded' : 'partially_refunded';
      payment.updatedAt = new Date().toISOString();
      db.payments.set(payment.reference, payment);

      // Record double-entry ledger reversal
      ledgerService.recordRefundReversal(refund, payment);

      // Record in Audit trail
      auditService.log(
        'REFUND_PROCESSED',
        'refund',
        'admin',
        requestedBy,
        {
          refundId,
          paymentReference: payment.reference,
          amount: refundAmountCustomerCurrency,
          currency: payment.customerCurrency,
          ngnImpact: settlementNGNImpact,
          reason
        }
      );

      return {
        success: true,
        refund,
        message: `Refund of ${refundAmountCustomerCurrency} ${payment.customerCurrency} (₦${settlementNGNImpact.toLocaleString('en-NG')} impact) successfully processed.`
      };
    } else {
      return {
        success: false,
        refund,
        message: `Refund rejected by provider: ${providerResult.message}`
      };
    }
  }

  public getRefunds(): RefundRecord[] {
    return Array.from(db.refunds.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export const refundService = new RefundService();
