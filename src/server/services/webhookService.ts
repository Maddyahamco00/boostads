import { db } from '../db';
import { WebhookEvent, ProviderType, Payment } from '../../types';
import { providerService } from './providerService';
import { ledgerService } from './ledgerService';
import { settlementService } from './settlementService';
import { auditService } from './auditService';

export class WebhookService {
  /**
   * Processes incoming webhook from payment provider with strict verification & idempotency
   */
  public async handleWebhook(
    provider: ProviderType,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Record<string, unknown> | string
  ): Promise<{ statusCode: number; response: { status: string; message: string } }> {
    const eventId = (typeof rawBody === 'object' && rawBody !== null)
      ? String((rawBody as Record<string, unknown>).id || (rawBody as Record<string, unknown>).event || Date.now())
      : String(Date.now());

    const idempotencyKey = `${provider}_${eventId}`;
    const webhookId = `wh_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // 1. Signature Verification
    const providerAdapter = providerService.getProvider(provider);
    const sigHeader = (provider === 'flutterwave'
      ? (headers['verif-hash'] || headers['x-verif-hash'])
      : (headers['x-paystack-signature'])) as string | undefined;

    const secret = db.platformConfig.webhookSecret;
    const isSignatureValid = providerAdapter.verifyWebhookSignature(rawBody, sigHeader || '', secret);

    // Save webhook event to DB
    const webhookEvent: WebhookEvent = {
      id: webhookId,
      provider,
      eventType: typeof rawBody === 'object' && rawBody ? String((rawBody as Record<string, unknown>).event || 'charge.completed') : 'unknown',
      eventId,
      payload: typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : { raw: rawBody },
      signatureValid: isSignatureValid,
      processed: false,
      idempotencyKey,
      createdAt: new Date().toISOString()
    };

    db.webhookEvents.set(webhookId, webhookEvent);

    if (!isSignatureValid) {
      webhookEvent.errorMessage = 'Invalid webhook HMAC signature';
      auditService.log('WEBHOOK_SIGNATURE_FAILED', 'webhook', 'webhook', provider, {
        provider,
        sigHeader,
        eventId
      });
      return {
        statusCode: 401,
        response: { status: 'error', message: 'Unauthorized webhook: signature mismatch' }
      };
    }

    // 2. Idempotency Check (Prevent Double Crediting)
    if (db.processedEventIds.has(idempotencyKey)) {
      webhookEvent.processed = true;
      webhookEvent.processedAt = new Date().toISOString();
      webhookEvent.errorMessage = 'Duplicate event received (Idempotency skip)';
      
      auditService.log('WEBHOOK_DUPLICATE_IGNORED', 'webhook', 'webhook', provider, {
        idempotencyKey,
        eventId
      });

      return {
        statusCode: 200,
        response: { status: 'success', message: 'Webhook already processed (Idempotent OK)' }
      };
    }

    // 3. Extract transaction reference
    let txRef = '';
    let eventStatus = 'successful';
    let chargedAmount = 0;
    let chargedCurrency = '';
    let providerTransactionId = '';

    if (typeof rawBody === 'object' && rawBody !== null) {
      const data = (rawBody as Record<string, unknown>).data as Record<string, unknown> || rawBody as Record<string, unknown>;
      txRef = String(data.tx_ref || data.reference || data.txRef || '');
      eventStatus = String(data.status || '').toLowerCase() === 'successful' || String(data.status || '').toLowerCase() === 'success' ? 'successful' : 'failed';
      chargedAmount = Number(data.amount || data.charged_amount || 0);
      chargedCurrency = String(data.currency || '').toUpperCase();
      providerTransactionId = String(data.id || data.transaction_id || `TRX_${Date.now()}`);
    }

    const payment = db.payments.get(txRef);
    if (!payment) {
      webhookEvent.errorMessage = `Payment with reference ${txRef} not found in database`;
      return {
        statusCode: 404,
        response: { status: 'error', message: `Transaction reference ${txRef} not found` }
      };
    }

    // 4. Server-Side Verification Direct with Provider (Never trust raw webhook body blindly)
    const verification = await providerAdapter.verifyTransaction(
      txRef,
      payment.customerAmount,
      payment.customerCurrency
    );

    if (!verification.verified || verification.status !== 'successful') {
      webhookEvent.errorMessage = `Provider verification rejected: ${verification.message}`;
      payment.status = 'failed';
      payment.updatedAt = new Date().toISOString();
      db.payments.set(payment.reference, payment);

      auditService.log('PAYMENT_VERIFICATION_FAILED', 'payment', 'system', payment.id, {
        reference: txRef,
        verification
      });

      return {
        statusCode: 400,
        response: { status: 'error', message: 'Payment verification failed' }
      };
    }

    // 5. Update Payment Status Safely
    if (payment.status !== 'successful') {
      payment.status = 'successful';
      payment.paidAt = new Date().toISOString();
      payment.providerTransactionId = providerTransactionId || verification.providerTransactionId;
      payment.providerReference = verification.providerReference || txRef;
      payment.updatedAt = new Date().toISOString();
      db.payments.set(payment.reference, payment);

      // 6. Record in Double-Entry Ledger
      ledgerService.recordPaymentSuccess(payment);

      // 7. Auto-Settlement Trigger if Enabled
      if (db.platformConfig.autoSettlementEnabled && db.platformConfig.settlementSchedule === 'instant') {
        settlementService.executeSettlement(payment.merchantId, 'auto').catch((err) => {
          console.error('[SettlementAuto] Error executing automated settlement:', err);
        });
      }

      auditService.log('PAYMENT_COMPLETED_VIA_WEBHOOK', 'payment', 'webhook', provider, {
        reference: payment.reference,
        amount: payment.customerAmount,
        currency: payment.customerCurrency,
        netSettlementNGN: payment.netSettlementNGN
      });
    }

    // Mark as processed
    db.processedEventIds.add(idempotencyKey);
    webhookEvent.processed = true;
    webhookEvent.processedAt = new Date().toISOString();

    return {
      statusCode: 200,
      response: { status: 'success', message: 'Webhook verified and processed successfully' }
    };
  }
}

export const webhookService = new WebhookService();
