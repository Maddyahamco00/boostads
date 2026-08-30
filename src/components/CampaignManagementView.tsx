import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Megaphone, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Layers, 
  Plus, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Target, 
  Globe, 
  Smartphone, 
  BarChart3, 
  ShieldCheck, 
  Sparkles, 
  Share2, 
  Filter, 
  ArrowUpRight, 
  MessageSquare, 
  FileText, 
  Eye, 
  MousePointer, 
  Search, 
  X,
  PhoneCall,
  Mail,
  Calendar,
  Zap,
  Sliders,
  Check
} from 'lucide-react';
import { 
  MultiPlatformCampaign, 
  Lead, 
  AdvertisingObjective, 
  SupportedAdPlatform, 
  PlatformAllocation 
} from '../types';

const PLATFORM_CONFIGS: Record<SupportedAdPlatform, { name: string; color: string; bg: string; border: string; icon: string }> = {
  facebook: { name: 'Facebook', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: '📘' },
  instagram: { name: 'Instagram', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', icon: '📸' },
  google: { name: 'Google Ads', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: '🌐' },
  tiktok: { name: 'TikTok', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', icon: '🎵' },
  youtube: { name: 'YouTube', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: '▶️' }
};

const OBJECTIVE_LABELS: Record<AdvertisingObjective, { label: string; desc: string; icon: string }> = {
  more_leads: { label: 'Generate High-Quality Leads', desc: 'Direct phone, WhatsApp & form enquiries for your business', icon: '🎯' },
  whatsapp_orders: { label: 'Drive WhatsApp Orders', desc: 'Direct chat conversations and instant customer order inquiries', icon: '💬' },
  brand_discovery: { label: 'Brand & Store Discovery', desc: 'Maximize local reach and store visits across your city/state', icon: '🌟' },
  store_traffic: { label: 'Physical Walk-in Traffic', desc: 'Drive real customers to your shop or showroom location', icon: '🏬' },
  app_installs: { label: 'Direct Sales & Checkout', desc: 'Drive instant invoice payment conversions on Boost Market', icon: '💳' },
  more_messages: { label: 'More Chat Messages', desc: 'Drive direct inbox conversations with prospective buyers', icon: '📨' },
  more_website_visitors: { label: 'Website & Store Visitors', desc: 'Send high-intent traffic to your profile or website', icon: '🌐' },
  more_calls: { label: 'Direct Phone Calls', desc: 'Receive calls from motivated buyers immediately', icon: '📞' },
  more_product_sales: { label: 'Product Catalog Sales', desc: 'Showcase and sell inventory directly from your catalog', icon: '🛍️' },
  more_local_customers: { label: 'Local City Customers', desc: 'Target customers within 5-50km of your shop', icon: '📍' },
  brand_awareness: { label: 'Mass Market Awareness', desc: 'Broad reach across multiple digital video and social feeds', icon: '📢' }
};

export const CampaignManagementView: React.FC = () => {
  const { 
    currentUser, 
    businesses, 
    campaigns, 
    leads, 
    updateLeadStatus, 
    startChatWithBusiness, 
    openInvoiceDetail, 
    refreshData 
  } = useApp();

  const userBiz = businesses.find(b => b.ownerId === currentUser.id) || businesses[0];
  const userCampaigns = campaigns.filter(c => c.businessId === userBiz?.id || currentUser.role === 'ceo');
  const userLeads = leads.filter(l => l.businessId === userBiz?.id || currentUser.role === 'ceo');

  const [activeTab, setActiveTab] = useState<'campaigns' | 'leads' | 'analytics'>('campaigns');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);

  // Wizard state
  const [step, setStep] = useState(1);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [objective, setObjective] = useState<AdvertisingObjective>('more_leads');
  const [totalBudget, setTotalBudget] = useState(50000);
  const [durationDays, setDurationDays] = useState(14);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SupportedAdPlatform[]>(['facebook', 'instagram', 'google']);
  const [targetCities, setTargetCities] = useState<string[]>(['Kaduna', 'Abuja']);
  const [headline, setHeadline] = useState('');
  const [bodyCopy, setBodyCopy] = useState('');
  const [callToAction, setCallToAction] = useState('Order on WhatsApp');
  const [mediaUrl, setMediaUrl] = useState('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lead filter
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [leadSearch, setLeadSearch] = useState('');

  // New Lead manual input state
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadItem, setNewLeadItem] = useState('');
  const [newLeadNotes, setNewLeadNotes] = useState('');
  const [newLeadPlatform, setNewLeadPlatform] = useState<SupportedAdPlatform>('instagram');

  // Preview Platform tab
  const [previewPlatform, setPreviewPlatform] = useState<SupportedAdPlatform>('instagram');

  // Aggregate Metrics
  const totalSpend = userCampaigns.reduce((acc, c) => acc + c.totalBudgetNGN, 0);
  const totalImpressions = userCampaigns.reduce((acc, c) => acc + (c.analytics?.totalImpressions || 0), 0);
  const totalClicks = userCampaigns.reduce((acc, c) => acc + (c.analytics?.totalClicks || 0), 0);
  const totalLeadsCount = userLeads.length;
  const avgCpl = totalLeadsCount > 0 ? Math.round(totalSpend / totalLeadsCount) : 0;
  const avgRoas = userCampaigns.length > 0 
    ? (userCampaigns.reduce((acc, c) => acc + (c.analytics?.roas || 3.8), 0) / userCampaigns.length).toFixed(1)
    : '4.2';

  // Toggle platform selection in wizard
  const togglePlatform = (p: SupportedAdPlatform) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(item => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  // Toggle target city in wizard
  const toggleCity = (city: string) => {
    if (targetCities.includes(city)) {
      if (targetCities.length > 1) {
        setTargetCities(targetCities.filter(c => c !== city));
      }
    } else {
      setTargetCities([...targetCities, city]);
    }
  };

  // Dynamic budget calculation based on smart weights
  const calculateAllocations = () => {
    const weights: Record<SupportedAdPlatform, number> = {
      facebook: 0,
      instagram: 0,
      google: 0,
      tiktok: 0,
      youtube: 0
    };

    if (objective === 'more_leads' || objective === 'whatsapp_orders') {
      weights.facebook = 0.35;
      weights.instagram = 0.35;
      weights.google = 0.20;
      weights.tiktok = 0.10;
      weights.youtube = 0.00;
    } else if (objective === 'brand_discovery') {
      weights.instagram = 0.30;
      weights.tiktok = 0.30;
      weights.youtube = 0.20;
      weights.facebook = 0.20;
      weights.google = 0.00;
    } else {
      weights.google = 0.40;
      weights.facebook = 0.30;
      weights.instagram = 0.30;
      weights.tiktok = 0.00;
      weights.youtube = 0.00;
    }

    const selectedWeights = selectedPlatforms.map(p => ({ platform: p, weight: weights[p] || 0.1 }));
    const totalWeight = selectedWeights.reduce((sum, item) => sum + item.weight, 0);

    return selectedWeights.map(item => {
      const normalizedPercent = Math.round((item.weight / totalWeight) * 100);
      const budgetNGN = Math.round((totalBudget * normalizedPercent) / 100);
      return {
        platform: item.platform,
        percentage: normalizedPercent,
        allocatedBudgetNGN: budgetNGN,
        estimatedImpressions: Math.round(budgetNGN * 18),
        estimatedClicks: Math.round(budgetNGN * 0.45)
      };
    });
  };

  const handleLaunchCampaign = async () => {
    if (!campaignTitle || !headline || !bodyCopy || !userBiz) {
      alert('Please fill out all required campaign fields.');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: userBiz.id,
          businessName: userBiz.name,
          title: campaignTitle,
          objective,
          totalBudgetNGN: totalBudget,
          dailyBudgetNGN: Math.round(totalBudget / durationDays),
          durationDays,
          platforms: selectedPlatforms,
          targetAudience: {
            locations: targetCities,
            ageRange: [21, 55],
            gender: 'all',
            interests: [userBiz.categoryLabel, 'Online Shopping', 'Nigeria Commerce', 'Kaduna & Abuja Business']
          },
          creatives: {
            headline,
            bodyCopy,
            callToAction,
            mediaUrls: [mediaUrl],
            mediaType: 'image'
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateModalOpen(false);
        setStep(1);
        setCampaignTitle('');
        setHeadline('');
        setBodyCopy('');
        alert('🎉 Multi-platform advertising campaign successfully launched!');
        refreshData();
      } else {
        alert(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCampaignStatus = async (campaignId: string, currentStatus: MultiPlatformCampaign['status']) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await fetch(`/api/campaigns/${campaignId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      refreshData();
    } catch (err) {
      console.error('Failed to update campaign status:', err);
    }
  };

  const handleAddManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone || !userBiz) return;
    try {
      await fetch('/api/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: userBiz.id,
          customerName: newLeadName,
          customerPhone: newLeadPhone,
          customerEmail: newLeadEmail,
          platformSource: newLeadPlatform,
          interestItem: newLeadItem || 'General Enquiry',
          notes: newLeadNotes || 'Captured from direct customer phone call'
        })
      });
      setIsAddLeadModalOpen(false);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadEmail('');
      setNewLeadItem('');
      setNewLeadNotes('');
      alert('Lead added to your CRM pipeline!');
      refreshData();
    } catch (err) {
      console.error('Failed to add lead:', err);
    }
  };

  // Filtered Leads
  const filteredLeads = userLeads.filter(lead => {
    const matchesStatus = leadStatusFilter === 'all' || lead.status === leadStatusFilter;
    const matchesSearch = !leadSearch || 
      lead.customerName.toLowerCase().includes(leadSearch.toLowerCase()) ||
      lead.customerPhone.includes(leadSearch) ||
      lead.interestItem.toLowerCase().includes(leadSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div id="campaign-management-view" className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Header / Hero Section */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" /> Multi-Platform Ad Engine
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Real Boosters Enterprise</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Unified Advertising & CRM Hub
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Distribute advertising budgets across <strong>Facebook, Instagram, Google, TikTok & YouTube</strong> with automated smart allocation, strict budget spend caps, and integrated lead tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="add-lead-btn"
              onClick={() => setIsAddLeadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Add Direct Lead</span>
            </button>

            <button
              id="launch-campaign-hero-btn"
              onClick={() => {
                setCampaignTitle(`${userBiz?.name || 'Boost'} Growth Campaign`);
                setHeadline(`Discover Top-Quality ${userBiz?.categoryLabel || 'Services'} in ${userBiz?.location.city || 'Kaduna'}`);
                setBodyCopy(`Connect with verified specialists at ${userBiz?.name || 'our verified store'}. Fast delivery, reliable execution, and instant invoice checkout on Boost Market.`);
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Launch Multi-Platform Ad</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Ad Budget</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-white">₦{totalSpend.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Spend Cap Enforced
            </div>
          </div>

          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Unified Reach</span>
              <Eye className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-white">{totalImpressions.toLocaleString()}</div>
            <div className="text-[11px] text-slate-400 mt-1">Cross-platform impressions</div>
          </div>

          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Total Clicks</span>
              <MousePointer className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-black text-white">{totalClicks.toLocaleString()}</div>
            <div className="text-[11px] text-cyan-400 font-semibold mt-1">
              {totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(1)}% CTR` : '3.4% CTR'}
            </div>
          </div>

          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>CRM Leads</span>
              <Users className="w-4 h-4 text-pink-400" />
            </div>
            <div className="text-xl font-black text-white">{totalLeadsCount}</div>
            <div className="text-[11px] text-pink-400 font-semibold mt-1">Avg ₦{avgCpl.toLocaleString()} / Lead</div>
          </div>

          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Target ROAS</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white">{avgRoas}x</div>
            <div className="text-[11px] text-amber-400 font-semibold mt-1">Return on Ad Spend</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="border-b border-slate-800 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'campaigns'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Active Campaigns ({userCampaigns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'leads'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Lead Pipeline CRM ({userLeads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Platform Matrix</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          {userCampaigns.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Active Multi-Platform Campaigns Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                Amplify your business across Meta (Facebook/Instagram), Google Search, TikTok, and YouTube with smart budget distribution.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg"
              >
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {userCampaigns.map((camp) => (
                <div 
                  key={camp.id} 
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">{camp.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          camp.status === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : camp.status === 'paused'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {camp.status}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {OBJECTIVE_LABELS[camp.objective]?.label || camp.objective}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Target: <strong>{camp.targetAudience.locations.join(', ')}</strong></span>
                        <span>•</span>
                        <span>Daily: <strong>₦{camp.dailyBudgetNGN?.toLocaleString()}/day</strong></span>
                        <span>•</span>
                        <span>Total: <strong>₦{camp.totalBudgetNGN.toLocaleString()}</strong></span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start lg:self-center">
                      <button
                        onClick={() => handleToggleCampaignStatus(camp.id, camp.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                          camp.status === 'active'
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {camp.status === 'active' ? (
                          <>
                            <Pause className="w-3.5 h-3.5" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" /> Resume
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Channel Allocations & Progress */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-1">
                    <div className="md:col-span-2 space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Channel Distribution & Budget Split
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {camp.platformAllocations.map(alloc => (
                          <div 
                            key={alloc.platform} 
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${PLATFORM_CONFIGS[alloc.platform]?.border} ${PLATFORM_CONFIGS[alloc.platform]?.bg} ${PLATFORM_CONFIGS[alloc.platform]?.color}`}
                          >
                            <span>{PLATFORM_CONFIGS[alloc.platform]?.icon}</span>
                            <span>{PLATFORM_CONFIGS[alloc.platform]?.name}</span>
                            <span className="font-bold">({alloc.percentage}%)</span>
                            <span className="text-[10px] text-slate-300">₦{alloc.allocatedBudgetNGN.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Performance metrics */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Reach & Traffic
                      </span>
                      <div className="text-xs text-slate-200">
                        <div><strong>{camp.analytics?.totalImpressions.toLocaleString() || '0'}</strong> Impressions</div>
                        <div className="text-slate-400">{camp.analytics?.totalClicks.toLocaleString() || '0'} Clicks ({camp.analytics?.ctr || 3.5}% CTR)</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Attributed Conversions
                      </span>
                      <div className="text-xs text-slate-200">
                        <div className="text-emerald-400 font-bold">{camp.analytics?.leadsGenerated || 0} Direct Leads</div>
                        <div className="text-slate-400">ROAS: <strong>{camp.analytics?.roas || 4.2}x</strong></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: LEADS CRM */}
      {activeTab === 'leads' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          {/* Controls Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search leads by name, phone, item..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Stages</option>
                <option value="new">New Inquiries</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="invoice_sent">Invoice Sent</option>
                <option value="converted">Won / Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div className="text-xs text-slate-400">
              Showing <strong>{filteredLeads.length}</strong> of {userLeads.length} total leads
            </div>
          </div>

          {/* Leads Grid */}
          {filteredLeads.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No leads match your criteria</h3>
              <p className="text-xs text-slate-400 mt-1">
                New leads from your advertising campaigns and chat requests will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{lead.customerName}</h4>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${PLATFORM_CONFIGS[lead.platformSource]?.bg} ${PLATFORM_CONFIGS[lead.platformSource]?.color} border ${PLATFORM_CONFIGS[lead.platformSource]?.border}`}>
                          {PLATFORM_CONFIGS[lead.platformSource]?.icon} {PLATFORM_CONFIGS[lead.platformSource]?.name}
                        </span>
                      </div>
                      
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                        className={`text-[11px] font-black rounded-lg px-2 py-1 border focus:outline-none ${
                          lead.status === 'converted' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : lead.status === 'invoice_sent' 
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : lead.status === 'qualified'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : lead.status === 'contacted'
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : lead.status === 'lost'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        <option value="new" className="bg-slate-900 text-white">New</option>
                        <option value="contacted" className="bg-slate-900 text-white">Contacted</option>
                        <option value="qualified" className="bg-slate-900 text-white">Qualified</option>
                        <option value="negotiating" className="bg-slate-900 text-white">Negotiating</option>
                        <option value="invoice_sent" className="bg-slate-900 text-white">Invoice Sent</option>
                        <option value="converted" className="bg-slate-900 text-white">Won / Converted</option>
                        <option value="lost" className="bg-slate-900 text-white">Lost</option>
                      </select>
                    </div>

                    <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 text-xs space-y-1.5">
                      <div className="text-slate-300 flex items-center justify-between">
                        <span className="text-slate-500">Interest:</span>
                        <span className="font-semibold text-emerald-400">{lead.interestItem}</span>
                      </div>
                      {lead.customerPhone && (
                        <div className="text-slate-300 flex items-center justify-between">
                          <span className="text-slate-500">Phone:</span>
                          <span className="font-mono">{lead.customerPhone}</span>
                        </div>
                      )}
                      {lead.customerEmail && (
                        <div className="text-slate-300 flex items-center justify-between">
                          <span className="text-slate-500">Email:</span>
                          <span className="truncate max-w-[150px]">{lead.customerEmail}</span>
                        </div>
                      )}
                      {lead.notes && (
                        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                          "{lead.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
                    <a
                      href={`tel:${lead.customerPhone}`}
                      className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Call</span>
                    </a>

                    <a
                      href={`https://wa.me/${lead.customerPhone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(lead.customerName)},%20thank%20you%20for%20your%20interest%20in%20our%20services%20on%20Boost%20Market!`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>

                    {lead.invoiceId ? (
                      <button
                        onClick={() => openInvoiceDetail(lead.invoiceId!)}
                        className="py-1.5 px-3 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1"
                        title="View Linked Invoice"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          alert(`To invoice ${lead.customerName}, open the Invoices tab and select this customer.`);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1"
                        title="Create Invoice"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ANALYTICS MATRIX */}
      {activeTab === 'analytics' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(PLATFORM_CONFIGS).map(([platformKey, conf]) => (
              <div 
                key={platformKey} 
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{conf.icon}</span>
                    <div>
                      <h3 className="font-bold text-white text-base">{conf.name}</h3>
                      <span className="text-[11px] text-emerald-400 font-semibold">Official Business API Connected</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${conf.border} ${conf.bg} ${conf.color}`}>
                    Active
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                    <span className="text-slate-400">Total Reach / Impressions</span>
                    <span className="font-bold text-white">{(totalImpressions * 0.28).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                    <span className="text-slate-400">Click-Through Rate (CTR)</span>
                    <span className="font-bold text-emerald-400">3.8%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800 text-slate-300">
                    <span className="text-slate-400">Average Cost Per Click</span>
                    <span className="font-bold text-white">₦42.50</span>
                  </div>
                  <div className="flex justify-between py-2 text-slate-300">
                    <span className="text-slate-400">Attributed Conversion Rate</span>
                    <span className="font-bold text-cyan-400">8.4%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL (MULTI-STEP WIZARD) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Step {step} of 3</span>
                <h2 className="text-xl font-black text-white">Create Multi-Platform Campaign</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Goal & Budget */}
            {step === 1 && (
              <div className="py-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Campaign Title
                  </label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    placeholder="e.g. Ramadan Super Sale or Kaduna Tech Expansion"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Select Primary Objective
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(OBJECTIVE_LABELS).map(([objKey, item]) => (
                      <div
                        key={objKey}
                        onClick={() => setObjective(objKey as AdvertisingObjective)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          objective === objKey
                            ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{item.icon}</span>
                          <h4 className="font-bold text-white text-xs">{item.label}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Total Campaign Budget (NGN)
                    </label>
                    <span className="text-base font-black text-emerald-400">₦{totalBudget.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="500000"
                    step="5000"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>₦10,000 (Starter)</span>
                    <span>₦100,000 (Growth)</span>
                    <span>₦500,000+ (Scale)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Duration: <strong>{durationDays} Days</strong> (₦{Math.round(totalBudget / durationDays).toLocaleString()}/day)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[7, 14, 30].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDurationDays(d)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          durationDays === d ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Channels & Smart Allocation */}
            {step === 2 && (
              <div className="py-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Select Target Advertising Channels
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(PLATFORM_CONFIGS).map(([pKey, pConf]) => {
                      const isSelected = selectedPlatforms.includes(pKey as SupportedAdPlatform);
                      return (
                        <div
                          key={pKey}
                          onClick={() => togglePlatform(pKey as SupportedAdPlatform)}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? `bg-slate-950 ${pConf.border} ring-1 ring-emerald-500/40`
                              : 'bg-slate-950/50 border-slate-800 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{pConf.icon}</span>
                            <span className={`text-xs font-bold ${pConf.color}`}>{pConf.name}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Smart Budget Allocation breakdown */}
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI-Calculated Budget Split
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold">100% Budget Utilized</span>
                  </div>

                  <div className="space-y-2">
                    {calculateAllocations().map(alloc => (
                      <div key={alloc.platform} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <span>{PLATFORM_CONFIGS[alloc.platform]?.icon}</span>
                            <strong>{PLATFORM_CONFIGS[alloc.platform]?.name}</strong>
                          </span>
                          <span className="text-slate-400">
                            {alloc.percentage}% • <strong>₦{alloc.allocatedBudgetNGN.toLocaleString()}</strong>
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                            style={{ width: `${alloc.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Target Cities */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Target Cities & Geofences
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Kaduna', 'Abuja', 'Lagos', 'Kano', 'Port Harcourt', 'Ibadan', 'Enugu'].map(city => {
                      const isSelected = targetCities.includes(city);
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => toggleCity(city)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {city}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Creative & Multi-Platform Preview */}
            {step === 3 && (
              <div className="py-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Creative Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Primary Headline
                      </label>
                      <input
                        type="text"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="Catchy advertising headline..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Body Copy / Offer Description
                      </label>
                      <textarea
                        rows={3}
                        value={bodyCopy}
                        onChange={(e) => setBodyCopy(e.target.value)}
                        placeholder="Describe your offer, guarantee, and reasons to buy..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Media Image URL
                      </label>
                      <input
                        type="text"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Call To Action Button
                      </label>
                      <select
                        value={callToAction}
                        onChange={(e) => setCallToAction(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Order on WhatsApp">Order on WhatsApp</option>
                        <option value="Chat with Merchant">Chat with Merchant</option>
                        <option value="Get Instant Quote">Get Instant Quote</option>
                        <option value="Visit Storefront">Visit Storefront</option>
                        <option value="Pay via Flutterwave">Pay via Flutterwave</option>
                      </select>
                    </div>
                  </div>

                  {/* Multi-Platform Ad Mock Preview */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Live Multi-Format Preview
                        </span>
                        <div className="flex items-center gap-1">
                          {selectedPlatforms.map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPreviewPlatform(p)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                previewPlatform === p ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Mock Simulated Card */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md text-xs">
                        <div className="p-3 flex items-center gap-2.5">
                          <img
                            src={userBiz?.logoUrl}
                            alt="Brand"
                            className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500"
                          />
                          <div>
                            <div className="font-bold text-white text-xs">{userBiz?.name}</div>
                            <div className="text-[10px] text-slate-400">Sponsored • Boost Market Certified</div>
                          </div>
                        </div>

                        <div className="px-3 pb-2 text-[11px] text-slate-300">
                          {bodyCopy || 'Your ad text description will be displayed here across all advertising placements.'}
                        </div>

                        <img
                          src={mediaUrl}
                          alt="Creative preview"
                          className="w-full h-40 object-cover"
                        />

                        <div className="p-3 bg-slate-950 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-white text-xs">{headline || 'Your Headline Here'}</div>
                            <div className="text-[10px] text-slate-500">boostmarket.ng/{userBiz?.slug}</div>
                          </div>
                          <button
                            type="button"
                            className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-[11px]"
                          >
                            {callToAction}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span><strong>Boost Market Budget Cap Guarantee:</strong> We never charge more than your approved budget limit.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !campaignTitle) {
                      alert('Please provide a campaign title.');
                      return;
                    }
                    setStep(step + 1);
                  }}
                  className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleLaunchCampaign}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Launching...' : '🚀 Launch Multi-Platform Campaign'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD DIRECT LEAD MODAL */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-black text-white text-base">Add Lead to CRM</h3>
              <button
                onClick={() => setIsAddLeadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fatima Bello"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Phone / WhatsApp Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +2348012345678"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="customer@gmail.com"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Product / Service of Interest</label>
                <input
                  type="text"
                  placeholder="e.g. Premium Native Agbada (3-piece)"
                  value={newLeadItem}
                  onChange={(e) => setNewLeadItem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Source Platform</label>
                <select
                  value={newLeadPlatform}
                  onChange={(e) => setNewLeadPlatform(e.target.value as SupportedAdPlatform)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="instagram">Instagram DM / Ad</option>
                  <option value="facebook">Facebook Messenger / Ad</option>
                  <option value="google">Google Search / Map Call</option>
                  <option value="tiktok">TikTok Direct</option>
                  <option value="youtube">YouTube Ad</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special requests, budget discussion notes..."
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Save Lead to CRM Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
