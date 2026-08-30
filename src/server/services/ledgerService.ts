import { db } from '../db';
import { Payment, LedgerEntry, LedgerAccountType, Settlement, RefundRecord } from '../../types';

export class LedgerService {
  /**
   * Records double-entry journal entries upon successful payment collection
   */
  public recordPaymentSuccess(payment: Payment): LedgerEntry[] {
    const ref = payment.transactionRef || payment.reference || `TX_${payment.id}`;
    const journalId = `JRN-${ref}-${Date.now()}`;
    const timestamp = payment.paidAt || payment.completedAt || new Date().toISOString();
    const entries: LedgerEntry[] = [];

    const grossNGN = payment.baseAmountNGN || payment.baseAmount || payment.amount || 0;
    const netMerchantNGN = payment.netAmountNGN || payment.netSettlementNGN || (grossNGN * 0.985);
    const totalFeeNGN = Math.max(0, grossNGN - netMerchantNGN);
    const platformRevenueNGN = Math.round(totalFeeNGN * 0.7 * 100) / 100;
    const processorExpenseNGN = Math.round(totalFeeNGN * 0.3 * 100) / 100;

    // 1. DEBIT: Cash Gateway Receivable (Asset increases)
    const debitGateway: LedgerEntry = {
      id: `led_${payment.id}_dr_gw`,
      paymentId: payment.id,
      transactionReference: ref,
      journalEntryId: journalId,
      account: '1010_CASH_GATEWAY_RECEIVABLE',
      accountName: '1010 - Gateway Cash Receivable',
      debit: grossNGN,
      credit: 0,
      currency: 'NGN',
      description: `Inflow from customer ${payment.customerName} (${payment.customerAmount || payment.amount} ${payment.customerCurrency || payment.currency} @ ${payment.exchangeRate || 1})`,
      timestamp,
      reconciled: false
    };
    entries.push(debitGateway);

    // 2. CREDIT: Merchant Settlement Payable (Liability increases)
    const creditMerchant: LedgerEntry = {
      id: `led_${payment.id}_cr_merch`,
      paymentId: payment.id,
      transactionReference: ref,
      journalEntryId: journalId,
      account: '2010_MERCHANT_PAYABLE_NGN',
      accountName: '2010 - Merchant NGN Settlement Payable',
      debit: 0,
      credit: netMerchantNGN,
      currency: 'NGN',
      description: `Net payout liability for ${payment.merchantName || payment.businessId || 'Merchant'} on ${ref}`,
      timestamp,
      reconciled: false
    };
    entries.push(creditMerchant);

    // 3. CREDIT: Platform Processing Fee Revenue (Revenue increases)
    const creditRevenue: LedgerEntry = {
      id: `led_${payment.id}_cr_rev`,
      paymentId: payment.id,
      transactionReference: ref,
      journalEntryId: journalId,
      account: '4010_PLATFORM_FEE_REVENUE',
      accountName: '4010 - Platform Service Fee Revenue',
      debit: 0,
      credit: platformRevenueNGN,
      currency: 'NGN',
      description: `1.5% platform fee on transaction ${ref}`,
      timestamp,
      reconciled: false
    };
    entries.push(creditRevenue);

    // 4. DEBIT/CREDIT Gateway Cost Recognition
    if (processorExpenseNGN > 0) {
      const debitExpense: LedgerEntry = {
        id: `led_${payment.id}_dr_exp`,
        paymentId: payment.id,
        transactionReference: ref,
        journalEntryId: journalId,
        account: '5010_PAYMENT_PROCESSOR_EXPENSE',
        accountName: '5010 - Gateway Interchange / Processing Expense',
        debit: processorExpenseNGN,
        credit: 0,
        currency: 'NGN',
        description: `Direct provider cost on ${payment.provider || payment.paymentProvider}`,
        timestamp,
        reconciled: false
      };
      entries.push(debitExpense);

      const creditProcessorPayable: LedgerEntry = {
        id: `led_${payment.id}_cr_proc_pay`,
        paymentId: payment.id,
        transactionReference: ref,
        journalEntryId: journalId,
        account: '1010_CASH_GATEWAY_RECEIVABLE',
        accountName: '1010 - Gateway Cash Receivable (Fee Netting)',
        debit: 0,
        credit: processorExpenseNGN,
        currency: 'NGN',
        description: `Processor auto-deduction for processing ${ref}`,
        timestamp,
        reconciled: false
      };
      entries.push(creditProcessorPayable);
    }

    db.ledgerEntries.push(...entries);
    return entries;
  }

  public recordPaymentJournal(payment: Payment): LedgerEntry[] {
    return this.recordPaymentSuccess(payment);
  }

  /**
   * Records journal entries for settlement payout to merchant corporate bank account
   */
  public recordSettlementExecution(settlement: Settlement): LedgerEntry[] {
    const journalId = `JRN-SETTLE-${settlement.id}-${Date.now()}`;
    const timestamp = settlement.settledAt || settlement.completedAt || new Date().toISOString();
    const entries: LedgerEntry[] = [];
    const netNGN = settlement.netSettlementNGN || settlement.netNGN || settlement.amountNGN;
    const ref = settlement.batchId || settlement.transferRef || settlement.id;

    // 1. DEBIT: Merchant Settlement Payable (Liability reduces)
    const debitMerchantPayable: LedgerEntry = {
      id: `led_stl_${settlement.id}_dr`,
      transactionReference: ref,
      journalEntryId: journalId,
      account: '2010_MERCHANT_PAYABLE_NGN',
      accountName: '2010 - Merchant NGN Settlement Payable',
      debit: netNGN,
      credit: 0,
      currency: 'NGN',
      description: `Settlement payout dispatched to ${settlement.destinationBank || settlement.bankName} (${settlement.destinationAccount || settlement.accountNumber})`,
      timestamp,
      reconciled: true
    };
    entries.push(debitMerchantPayable);

    // 2. CREDIT: Escrow / Cash at Bank (Asset decreases)
    const creditEscrow: LedgerEntry = {
      id: `led_stl_${settlement.id}_cr`,
      transactionReference: ref,
      journalEntryId: journalId,
      account: '1020_SETTLEMENT_ESCROW_NGN',
      accountName: '1020 - Settlement Escrow Account (Zenith Bank)',
      debit: 0,
      credit: netNGN,
      currency: 'NGN',
      description: `Direct NIBSS settlement credit for ${settlement.merchantName || settlement.accountName} ref ${settlement.payoutReference || settlement.transferRef}`,
      timestamp,
      reconciled: true
    };
    entries.push(creditEscrow);

    db.ledgerEntries.push(...entries);
    return entries;
  }

  /**
   * Records refund reversal in double-entry ledger
   */
  public recordRefund(refund: RefundRecord): LedgerEntry[] {
    const journalId = `JRN-REFUND-${refund.id}-${Date.now()}`;
    const timestamp = refund.completedAt || refund.processedAt || new Date().toISOString();
    const entries: LedgerEntry[] = [];
    const ref = refund.paymentReference || refund.paymentId;
    const refundImpact = refund.settlementNGNImpact || refund.refundAmountNGN || refund.refundAmount;

    // 1. DEBIT: Refund Liability
    const debitRefund: LedgerEntry = {
      id: `led_ref_${refund.id}_dr`,
      paymentId: refund.paymentId,
      transactionReference: ref,
      journalEntryId: journalId,
      account: '2020_REFUND_LIABILITY_NGN',
      accountName: '2020 - Refund Clearing Liability',
      debit: refundImpact,
      credit: 0,
      currency: 'NGN',
      description: `Refund executed for payment ${ref}: ${refund.reason}`,
      timestamp,
      reconciled: true
    };
    entries.push(debitRefund);

    // 2. CREDIT: Cash Gateway Receivable (Outflow to customer)
    const creditGateway: LedgerEntry = {
      id: `led_ref_${refund.id}_cr`,
      paymentId: refund.paymentId,
      transactionReference: ref,
      journalEntryId: journalId,
      account: '1010_CASH_GATEWAY_RECEIVABLE',
      accountName: '1010 - Gateway Cash Receivable',
      debit: 0,
      credit: refundImpact,
      currency: 'NGN',
      description: `Refund dispatched back to customer in ${refund.refundCurrency}`,
      timestamp,
      reconciled: true
    };
    entries.push(creditGateway);

    db.ledgerEntries.push(...entries);
    return entries;
  }

  public recordSettlementPayout(settlement: Settlement): LedgerEntry[] {
    return this.recordSettlementExecution(settlement);
  }

  public recordRefundReversal(refund: RefundRecord, payment?: Payment): LedgerEntry[] {
    return this.recordRefund(refund);
  }

  public getLedgerSummary(): {
    totalEntries: number;
    totalDebitNGN: number;
    totalCreditNGN: number;
    balanceNGN: number;
  } {
    const tb = this.getTrialBalance();
    return {
      totalEntries: db.ledgerEntries.length,
      totalDebitNGN: tb.totalDebitNGN,
      totalCreditNGN: tb.totalCreditNGN,
      balanceNGN: tb.totalDebitNGN - tb.totalCreditNGN
    };
  }

  /**
   * Retrieves all double entry balances and verifies trial balance debit == credit
   */
  public getTrialBalance(): {
    totalDebitNGN: number;
    totalCreditNGN: number;
    isBalanced: boolean;
    accounts: Record<string, { debit: number; credit: number; balance: number }>;
  } {
    let totalDebitNGN = 0;
    let totalCreditNGN = 0;

    const accounts: Record<string, { debit: number; credit: number; balance: number }> = {
      '1010_CASH_GATEWAY_RECEIVABLE': { debit: 0, credit: 0, balance: 0 },
      '1020_SETTLEMENT_ESCROW_NGN': { debit: 0, credit: 0, balance: 0 },
      '2010_MERCHANT_PAYABLE_NGN': { debit: 0, credit: 0, balance: 0 },
      '4010_PLATFORM_FEE_REVENUE': { debit: 0, credit: 0, balance: 0 },
      '4020_FX_SPREAD_REVENUE': { debit: 0, credit: 0, balance: 0 },
      '5010_PAYMENT_PROCESSOR_EXPENSE': { debit: 0, credit: 0, balance: 0 },
      '2020_REFUND_LIABILITY_NGN': { debit: 0, credit: 0, balance: 0 }
    };

    for (const entry of db.ledgerEntries) {
      if (entry.currency === 'NGN') {
        totalDebitNGN += entry.debit;
        totalCreditNGN += entry.credit;

        if (accounts[entry.account]) {
          accounts[entry.account].debit += entry.debit;
          accounts[entry.account].credit += entry.credit;
          accounts[entry.account].balance += (entry.debit - entry.credit);
        }
      }
    }

    return {
      totalDebitNGN: Math.round(totalDebitNGN * 100) / 100,
      totalCreditNGN: Math.round(totalCreditNGN * 100) / 100,
      isBalanced: Math.abs(totalDebitNGN - totalCreditNGN) < 0.01,
      accounts
    };
  }
}

export const ledgerService = new LedgerService();
