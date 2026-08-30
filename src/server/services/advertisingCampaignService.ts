import { db } from '../db';
import { 
  MultiPlatformCampaign, 
  AdvertisingObjective, 
  SupportedAdPlatform, 
  PlatformAllocation 
} from '../../types';

export class AdvertisingCampaignService {
  /**
   * Smart budget recommendation algorithm across selected ad platforms
   * based on campaign objective and target audience.
   */
  public calculateSmartAllocation(
    totalBudgetNGN: number,
    objective: AdvertisingObjective,
    platforms: SupportedAdPlatform[]
  ): {
    adSpendBudgetNGN: number;
    platformFeeNGN: number;
    allocations: PlatformAllocation[];
  } {
    if (platforms.length === 0) {
      platforms = ['facebook', 'instagram', 'google'];
    }

    // 8.5% platform management fee (transparently separated)
    const platformFeeNGN = Math.round(totalBudgetNGN * 0.085);
    const adSpendBudgetNGN = totalBudgetNGN - platformFeeNGN;

    // Base weights by objective
    const weights: Record<SupportedAdPlatform, number> = {
      facebook: 0.25,
      instagram: 0.25,
      google: 0.25,
      youtube: 0.15,
      tiktok: 0.10
    };

    if (objective === 'more_messages' || objective === 'more_local_customers') {
      weights.facebook = 0.40;
      weights.instagram = 0.35;
      weights.google = 0.15;
      weights.tiktok = 0.10;
      weights.youtube = 0.0;
    } else if (objective === 'more_leads' || objective === 'more_product_sales') {
      weights.google = 0.40;
      weights.facebook = 0.30;
      weights.instagram = 0.20;
      weights.tiktok = 0.10;
      weights.youtube = 0.0;
    } else if (objective === 'brand_awareness') {
      weights.youtube = 0.35;
      weights.tiktok = 0.30;
      weights.instagram = 0.25;
      weights.facebook = 0.10;
      weights.google = 0.0;
    } else if (objective === 'more_website_visitors' || objective === 'more_calls') {
      weights.google = 0.45;
      weights.facebook = 0.30;
      weights.instagram = 0.25;
      weights.youtube = 0.0;
      weights.tiktok = 0.0;
    }

    // Normalize weights for only selected platforms
    let totalSelectedWeight = 0;
    for (const p of platforms) {
      totalSelectedWeight += weights[p] || 0.1;
    }

    if (totalSelectedWeight === 0) totalSelectedWeight = 1;

    const allocations: PlatformAllocation[] = platforms.map(platform => {
      const normalizedWeight = (weights[platform] || 0.1) / totalSelectedWeight;
      const allocatedBudgetNGN = Math.round(adSpendBudgetNGN * normalizedWeight);
      const percentage = Math.round(normalizedWeight * 100);

      // Estimated metrics based on Nigerian CPM / CPC standards (e.g. ₦400-₦900 CPM, ₦40-₦120 CPC)
      const costPerThousandImpressions = platform === 'tiktok' ? 450 : platform === 'facebook' ? 650 : platform === 'instagram' ? 850 : 1100;
      const costPerClick = platform === 'tiktok' ? 35 : platform === 'facebook' ? 55 : platform === 'instagram' ? 75 : 95;

      const estImpressions = Math.round((allocatedBudgetNGN / costPerThousandImpressions) * 1000);
      const estClicks = Math.round(allocatedBudgetNGN / costPerClick);

      return {
        platform,
        allocatedBudgetNGN,
        percentage,
        estimatedReachMin: Math.round(estImpressions * 0.65),
        estimatedReachMax: Math.round(estImpressions * 1.35),
        estimatedClicksMin: Math.round(estClicks * 0.7),
        estimatedClicksMax: Math.round(estClicks * 1.3),
        spentAmountNGN: 0,
        impressions: 0,
        reach: 0,
        clicks: 0,
        leads: 0,
        conversions: 0,
        status: 'active'
      };
    });

    return {
      adSpendBudgetNGN,
      platformFeeNGN,
      allocations
    };
  }

  /**
   * Create a new Multi-Platform Campaign
   */
  public createCampaign(data: {
    businessId: string;
    title: string;
    objective: AdvertisingObjective;
    targetLocation: {
      name: string;
      radiusKm: number;
      lat?: number;
      lng?: number;
    };
    audience: {
      minAge: number;
      maxAge: number;
      gender: 'all' | 'men' | 'women';
      interests: string[];
      languages: string[];
    };
    totalBudgetNGN: number;
    durationDays: number;
    selectedPlatforms: SupportedAdPlatform[];
    headline: string;
    primaryText: string;
    mediaUrl: string;
    mediaType?: 'image' | 'video';
    callToAction: string;
    destinationUrl: string;
  }): MultiPlatformCampaign {
    const biz = db.businesses.get(data.businessId);
    if (!biz) {
      throw new Error(`Business ${data.businessId} not found`);
    }

    const { adSpendBudgetNGN, platformFeeNGN, allocations } = this.calculateSmartAllocation(
      data.totalBudgetNGN,
      data.objective,
      data.selectedPlatforms
    );

    const dailySpendCapNGN = Math.round(adSpendBudgetNGN / Math.max(1, data.durationDays));
    const now = new Date();
    const endDate = new Date(now.getTime() + data.durationDays * 86400000);

    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const campaign: MultiPlatformCampaign = {
      id: campaignId,
      businessId: biz.id,
      businessName: biz.name,
      businessLogo: biz.logoUrl,
      title: data.title,
      objective: data.objective,
      targetLocation: data.targetLocation,
      audience: data.audience,
      totalBudgetNGN: data.totalBudgetNGN,
      adSpendBudgetNGN,
      platformFeeNGN,
      durationDays: data.durationDays,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active', // Active upon creation in sandbox
      selectedPlatforms: data.selectedPlatforms,
      platformAllocations: allocations,
      dailySpendCapNGN,
      spentSoFarNGN: 0,
      remainingBudgetNGN: adSpendBudgetNGN,
      headline: data.headline,
      primaryText: data.primaryText,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType || 'image',
      callToAction: data.callToAction,
      destinationUrl: data.destinationUrl,
      leadsCount: 0,
      conversionsCount: 0,
      costPerLeadNGN: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    db.campaigns.set(campaign.id, campaign);

    // Audit log
    db.auditLogs.push({
      id: `audit_${Date.now()}`,
      eventType: 'CAMPAIGN_LAUNCHED',
      actorId: biz.ownerId,
      actorType: 'merchant',
      targetId: campaign.id,
      details: {
        businessId: biz.id,
        totalBudgetNGN: data.totalBudgetNGN,
        platforms: data.selectedPlatforms,
        objective: data.objective
      },
      timestamp: new Date().toISOString()
    });

    return campaign;
  }

  /**
   * Pause Campaign or Emergency Stop
   */
  public updateCampaignStatus(
    campaignId: string, 
    status: 'active' | 'paused' | 'completed' | 'cancelled'
  ): MultiPlatformCampaign {
    const camp = db.campaigns.get(campaignId);
    if (!camp) throw new Error('Campaign not found');

    camp.status = status;
    camp.updatedAt = new Date().toISOString();
    
    // Update platform allocations status
    camp.platformAllocations.forEach(p => {
      p.status = status === 'active' ? 'active' : 'paused';
    });

    db.campaigns.set(camp.id, camp);
    return camp;
  }

  /**
   * Get campaigns by business ID
   */
  public getBusinessCampaigns(businessId: string): MultiPlatformCampaign[] {
    return Array.from(db.campaigns.values()).filter(c => c.businessId === businessId);
  }

  /**
   * Get cross-platform summary analytics
   */
  public getCrossPlatformAnalytics(businessId: string) {
    const campaigns = this.getBusinessCampaigns(businessId);
    
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalReach = 0;
    let totalClicks = 0;
    let totalLeads = 0;
    let totalConversions = 0;

    const platformBreakdown: Record<SupportedAdPlatform, {
      spend: number;
      impressions: number;
      clicks: number;
      leads: number;
      conversions: number;
      ctr: number;
      cpl: number;
    }> = {
      facebook: { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, ctr: 0, cpl: 0 },
      instagram: { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, ctr: 0, cpl: 0 },
      google: { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, ctr: 0, cpl: 0 },
      youtube: { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, ctr: 0, cpl: 0 },
      tiktok: { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0, ctr: 0, cpl: 0 }
    };

    campaigns.forEach(camp => {
      totalSpend += camp.spentSoFarNGN;
      camp.platformAllocations.forEach(pa => {
        totalImpressions += pa.impressions;
        totalReach += pa.reach;
        totalClicks += pa.clicks;
        totalLeads += pa.leads;
        totalConversions += pa.conversions;

        const pStats = platformBreakdown[pa.platform];
        if (pStats) {
          pStats.spend += pa.spentAmountNGN;
          pStats.impressions += pa.impressions;
          pStats.clicks += pa.clicks;
          pStats.leads += pa.leads;
          pStats.conversions += pa.conversions;
        }
      });
    });

    // Calculate CTR and CPL per platform
    Object.keys(platformBreakdown).forEach(key => {
      const p = platformBreakdown[key as SupportedAdPlatform];
      p.ctr = p.impressions > 0 ? Number(((p.clicks / p.impressions) * 100).toFixed(2)) : 0;
      p.cpl = p.leads > 0 ? Math.round(p.spend / p.leads) : 0;
    });

    const overallCTR = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const overallCPL = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;

    return {
      campaignsCount: campaigns.length,
      totalSpendNGN: totalSpend,
      totalImpressions,
      totalReach,
      totalClicks,
      totalLeads,
      totalConversions,
      overallCTR,
      overallCPL,
      platformBreakdown
    };
  }
}

export const advertisingCampaignService = new AdvertisingCampaignService();
