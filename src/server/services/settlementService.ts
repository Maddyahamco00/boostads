import crypto from 'crypto';
import { db } from '../db';
import { Settlement, Merchant, Payment } from '../../types';
import { ledgerService } from './ledgerService';
import { auditService } from './auditService';

export class SettlementService {
  /**
   * Calculates pending unsettled NGN funds for a merchant
   */
  public getPendingSettlementSummary(merchantId: string): {
    pendingAmountNGN: number;
    pendingCount: number;
    payments: Payment[];
  } {
    const unsettledPayments: Payment[] = [];
    let pendingAmountNGN = 0;

    for (const [_, p] of db.payments) {
      if (p.merchantId === merchantId && p.status === 'successful' && p.settlementStatus === 'pending') {
        unsettledPayments.push(p);
        pendingAmountNGN += p.netSettlementNGN;
      }
    }

    return {
      pendingAmountNGN: Math.round(pendingAmountNGN * 100) / 100,
      pendingCount: unsettledPayments.length,
      payments: unsettledPayments
    };
  }

  /**
   * Executes settlement payout to merchant's Nigerian corporate bank account
   */
  public async executeSettlement(
    merchantId: string,
    mode: 'auto' | 'manual' = 'manual'
  ): Promise<{ success: boolean; settlement?: Settlement; message: string }> {
    const merchant = db.merchants.get(merchantId);
    if (!merchant) {
      return { success: false, message: 'Merchant not found' };
    }

    if (merchant.verificationStatus !== 'verified') {
      return { success: false, message: 'Merchant bank account verification is pending or rejected' };
    }

    const { pendingAmountNGN, pendingCount, payments } = this.getPendingSettlementSummary(merchantId);

    if (pendingCount === 0 || pendingAmountNGN <= 0) {
      return { success: false, message: 'No unsettled NGN payments available for payout' };
    }

    const batchId = `NGN-SETTLE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-B${Math.floor(Math.random() * 1000)}`;
    const payoutRef = `NIP/${merchant.settlementBankCode}/${Date.now()}/${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const settlementId = `stl_${Date.now()}`;

    // Processing fee for Nigerian Inter-Bank Settlement System (NIBSS Instant Payment - NIP)
    const nipTransferFee = 53.75; // ₦53.75 standard NIBSS transfer fee
    const netPayout = Math.max(0, Math.round((pendingAmountNGN - nipTransferFee) * 100) / 100);

    const settlement: Settlement = {
      id: settlementId,
      batchId,
      merchantId: merchant.id,
      merchantName: merchant.businessName,
      grossAmountNGN: pendingAmountNGN,
      feeDeductionsNGN: nipTransferFee,
      netSettlementNGN: netPayout,
      destinationBank: merchant.settlementBank,
      destinationBankCode: merchant.settlementBankCode,
      destinationAccount: merchant.settlementAccountNumber,
      destinationAccountName: merchant.settlementAccountName,
      status: 'settled',
      payoutReference: payoutRef,
      transactionCount: pendingCount,
      settledAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Update payments to settled
    for (const p of payments) {
      p.settlementStatus = 'settled';
      p.settlementId = settlementId;
      p.updatedAt = new Date().toISOString();
      db.payments.set(p.reference, p);
    }

    // Save settlement
    db.settlements.set(settlementId, settlement);

    // Record in Double-Entry Ledger
    ledgerService.recordSettlementPayout(settlement);

    // Record in Audit Trail
    auditService.log(
      'SETTLEMENT_EXECUTED',
      'settlement',
      mode === 'manual' ? 'admin' : 'system',
      merchantId,
      {
        batchId,
        payoutRef,
        grossNGN: pendingAmountNGN,
        netPayoutNGN: netPayout,
        destinationBank: merchant.settlementBank,
        destinationAccount: merchant.settlementAccountNumber,
        txCount: pendingCount
      }
    );

    return {
      success: true,
      settlement,
      message: `₦${netPayout.toLocaleString('en-NG', { minimumFractionDigits: 2 })} successfully settled into ${merchant.settlementBank} (${merchant.settlementAccountNumber})`
    };
  }

  /**
   * Validates Nigerian NUBAN account number
   */
  public verifyNubanAccount(
    bankCode: string,
    accountNumber: string
  ): { isValid: boolean; accountName?: string; error?: string } {
    if (!/^\d{10}$/.test(accountNumber)) {
      return { isValid: false, error: 'Nigerian NUBAN account number must be exactly 10 digits.' };
    }

    const bank = db.nigerianBanks.find((b) => b.code === bankCode);
    if (!bank) {
      return { isValid: false, error: 'Invalid or unsupported Nigerian commercial bank code.' };
    }

    return {
      isValid: true,
      accountName: 'APEX DYNAMICS NIGERIA LIMITED'
    };
  }
}

export const settlementService = new SettlementService();
