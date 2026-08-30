import { db } from '../db';
import { IPaymentProvider } from './providers/types';
import { FlutterwaveProvider } from './providers/flutterwaveProvider';
import { PaystackProvider } from './providers/paystackProvider';
import { ProviderType } from '../../types';

export class ProviderService {
  private providers: Map<ProviderType, IPaymentProvider> = new Map();

  constructor() {
    this.providers.set('flutterwave', new FlutterwaveProvider());
    this.providers.set('paystack', new PaystackProvider());
  }

  public getProvider(providerType?: ProviderType): IPaymentProvider {
    const target = providerType || db.platformConfig.primaryProvider || 'flutterwave';
    const provider = this.providers.get(target);
    if (!provider) {
      return this.providers.get('flutterwave')!;
    }
    return provider;
  }

  public getPrimaryProvider(): IPaymentProvider {
    return this.getProvider(db.platformConfig.primaryProvider);
  }

  public getSecondaryProvider(): IPaymentProvider {
    return this.getProvider(db.platformConfig.secondaryProvider);
  }

  public async getProvidersHealth(): Promise<Array<{ isHealthy: boolean; latencyMs: number; provider: ProviderType }>> {
    const healths: Array<{ isHealthy: boolean; latencyMs: number; provider: ProviderType }> = [];
    for (const [_, provider] of this.providers) {
      try {
        const h = await provider.checkHealth();
        healths.push(h);
      } catch {
        healths.push({ isHealthy: false, latencyMs: 999, provider: provider.providerName });
      }
    }
    return healths;
  }
}

export const providerService = new ProviderService();
