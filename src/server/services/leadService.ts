import { db } from '../db';
import { Lead, LeadStatus } from '../../types';

export class LeadService {
  /**
   * Get all leads for a business
   */
  public getLeadsByBusiness(businessId: string): Lead[] {
    return Array.from(db.leads.values())
      .filter(l => l.businessId === businessId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Create or capture a new lead from campaign or enquiry
   */
  public captureLead(data: {
    businessId: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    customerAvatar?: string;
    source: Lead['source'];
    campaignId?: string;
    adId?: string;
    estimatedValueNGN?: number;
    notes?: string;
    conversationId?: string;
  }): Lead {
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    const lead: Lead = {
      id: leadId,
      businessId: data.businessId,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAvatar: data.customerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      source: data.source,
      campaignId: data.campaignId,
      adId: data.adId,
      status: 'new',
      estimatedValueNGN: data.estimatedValueNGN || 50000,
      notes: data.notes || 'New customer enquiry captured via Boost Market',
      lastContactedAt: now,
      conversationId: data.conversationId,
      createdAt: now,
      updatedAt: now
    };

    db.leads.set(lead.id, lead);

    // Increment campaign lead count if attributed
    if (data.campaignId) {
      const camp = db.campaigns.get(data.campaignId);
      if (camp) {
        camp.leadsCount = (camp.leadsCount || 0) + 1;
        if (camp.spentSoFarNGN > 0 && camp.leadsCount > 0) {
          camp.costPerLeadNGN = Math.round(camp.spentSoFarNGN / camp.leadsCount);
        }
        db.campaigns.set(camp.id, camp);
      }
    }

    // Increment business stats
    const biz = db.businesses.get(data.businessId);
    if (biz) {
      biz.stats.leads = (biz.stats.leads || 0) + 1;
      db.businesses.set(biz.id, biz);
    }

    return lead;
  }

  /**
   * Update lead stage / status
   */
  public updateLeadStatus(leadId: string, status: LeadStatus, notes?: string): Lead {
    const lead = db.leads.get(leadId);
    if (!lead) throw new Error('Lead not found');

    lead.status = status;
    lead.updatedAt = new Date().toISOString();
    if (notes) lead.notes = notes;

    if (status === 'paid' || status === 'converted') {
      const biz = db.businesses.get(lead.businessId);
      if (biz) {
        biz.stats.conversions = (biz.stats.conversions || 0) + 1;
        if (lead.estimatedValueNGN) {
          biz.stats.totalRevenue = (biz.stats.totalRevenue || 0) + lead.estimatedValueNGN;
        }
        db.businesses.set(biz.id, biz);
      }

      if (lead.campaignId) {
        const camp = db.campaigns.get(lead.campaignId);
        if (camp) {
          camp.conversionsCount = (camp.conversionsCount || 0) + 1;
          db.campaigns.set(camp.id, camp);
        }
      }
    }

    db.leads.set(lead.id, lead);
    return lead;
  }

  /**
   * Link invoice to lead
   */
  public linkInvoice(leadId: string, invoiceId: string): Lead {
    const lead = db.leads.get(leadId);
    if (!lead) throw new Error('Lead not found');

    lead.invoiceId = invoiceId;
    lead.status = 'invoice_sent';
    lead.updatedAt = new Date().toISOString();
    db.leads.set(lead.id, lead);
    return lead;
  }
}

export const leadService = new LeadService();
