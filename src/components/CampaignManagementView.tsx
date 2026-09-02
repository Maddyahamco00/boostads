import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Megaphone, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Plus, 
  Play, 
  Pause, 
  Eye, 
  MousePointer, 
  Search, 
  X,
  PhoneCall,
  MessageSquare, 
  FileText, 
  Calendar,
  Zap,
  Check,
  BarChart3
} from 'lucide-react';
import { 
  MultiPlatformCampaign, 
  Lead, 
  AdvertisingObjective, 
  SupportedAdPlatform 
} from '../types';

const PLATFORM_CONFIGS: Record<SupportedAdPlatform, { name: string; icon: string }> = {
  facebook: { name: 'Facebook', icon: '📘' },
  instagram: { name: 'Instagram', icon: '📸' },
  google: { name: 'Google Ads', icon: '🌐' },
  tiktok: { name: 'TikTok', icon: '🎵' },
  youtube: { name: 'YouTube', icon: '▶️' }
};

const OBJECTIVE_LABELS: Record<AdvertisingObjective, { label: string; desc: string; icon: string }> = {
  more_leads: { label: 'Generate Leads', desc: 'Direct phone, WhatsApp & form inquiries', icon: '🎯' },
  whatsapp_orders: { label: 'WhatsApp Orders', desc: 'Direct customer order conversations', icon: '💬' },
  brand_discovery: { label: 'Store Discovery', desc: 'Maximize local reach and visits', icon: '🌟' },
  store_traffic: { label: 'Walk-in Traffic', desc: 'Drive customers to your shop location', icon: '🏬' },
  app_installs: { label: 'Direct Sales', desc: 'Drive invoice payment conversions', icon: '💳' },
  more_messages: { label: 'Chat Messages', desc: 'Drive direct inbox inquiries', icon: '📨' },
  more_website_visitors: { label: 'Website Visitors', desc: 'Send traffic to your profile or website', icon: '🌐' },
  more_calls: { label: 'Phone Calls', desc: 'Receive calls from interested buyers', icon: '📞' },
  more_product_sales: { label: 'Catalog Sales', desc: 'Showcase and sell inventory items', icon: '🛍️' },
  more_local_customers: { label: 'Local Customers', desc: 'Target customers in your city', icon: '📍' },
  brand_awareness: { label: 'Mass Reach', desc: 'Broad reach across video and social feeds', icon: '📢' }
};

export const CampaignManagementView: React.FC = () => {
  const { 
    currentUser, 
    businesses, 
    campaigns, 
    leads, 
    updateLeadStatus, 
    openInvoiceDetail, 
    refreshData 
  } = useApp();

  const userBiz = businesses.find(b => b.ownerId === currentUser.id) || businesses[0];
  const userCampaigns = campaigns.filter(c => c.businessId === userBiz?.id || currentUser.role === 'SUPER_ADMIN');
  const userLeads = leads.filter(l => l.businessId === userBiz?.id || currentUser.role === 'SUPER_ADMIN');

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

  const togglePlatform = (p: SupportedAdPlatform) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(item => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const toggleCity = (city: string) => {
    if (targetCities.includes(city)) {
      if (targetCities.length > 1) {
        setTargetCities(targetCities.filter(c => c !== city));
      }
    } else {
      setTargetCities([...targetCities, city]);
    }
  };

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
      alert('Please fill out all required fields.');
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
            interests: [userBiz.categoryLabel, 'Online Shopping', 'Nigeria Commerce']
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
          notes: newLeadNotes || 'Captured from direct enquiry'
        })
      });
      setIsAddLeadModalOpen(false);
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadEmail('');
      setNewLeadItem('');
      setNewLeadNotes('');
      refreshData();
    } catch (err) {
      console.error('Failed to add lead:', err);
    }
  };

  const filteredLeads = userLeads.filter(lead => {
    const matchesStatus = leadStatusFilter === 'all' || lead.status === leadStatusFilter;
    const matchesSearch = !leadSearch || 
      lead.customerName.toLowerCase().includes(leadSearch.toLowerCase()) ||
      lead.customerPhone.includes(leadSearch) ||
      lead.interestItem.toLowerCase().includes(leadSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div id="campaign-management-view" className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">Campaigns & CRM</h1>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Multi-Platform
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Manage multi-channel campaigns (Facebook, Instagram, Google) and track client leads
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="add-lead-btn"
              onClick={() => setIsAddLeadModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Add Lead</span>
            </button>

            <button
              id="launch-campaign-hero-btn"
              onClick={() => {
                setCampaignTitle(`${userBiz?.name || 'Boost'} Campaign`);
                setHeadline(`Discover ${userBiz?.categoryLabel || 'Services'} in ${userBiz?.location.city || 'Kaduna'}`);
                setBodyCopy(`Connect with ${userBiz?.name || 'our verified store'}. Fast delivery and reliable service.`);
                setIsCreateModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Campaign</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
              <span className="font-medium">Total Budget</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">₦{totalSpend.toLocaleString()}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Budget allocated</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
              <span className="font-medium">Impressions</span>
              <Eye className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">{totalImpressions.toLocaleString()}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Total views</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
              <span className="font-medium">Clicks</span>
              <MousePointer className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">{totalClicks.toLocaleString()}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(1)}% CTR` : '3.4% CTR'}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
              <span className="font-medium">Total Leads</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">{totalLeadsCount}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Avg ₦{avgCpl.toLocaleString()} / Lead</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
              <span className="font-medium">Est. ROAS</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg font-bold text-gray-900">{avgRoas}x</div>
            <div className="text-[11px] text-gray-400 mt-0.5">Return on spend</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200 flex items-center gap-2 overflow-x-auto text-xs font-medium pb-1">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'campaigns'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Campaigns ({userCampaigns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'leads'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Leads CRM ({userLeads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Platform Matrix</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          {userCampaigns.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl p-6">
              <Megaphone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <h2 className="text-sm font-semibold text-gray-900 mb-1">No Active Campaigns</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4">
                Launch a campaign across Meta, Google, and TikTok to generate customer leads.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Create Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userCampaigns.map((camp) => (
                <div 
                  key={camp.id} 
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-gray-900">{camp.title}</h2>
                        <span className={`px-2 py-0.2 rounded text-[10px] font-medium uppercase ${
                          camp.status === 'active' 
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {camp.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {OBJECTIVE_LABELS[camp.objective]?.label || camp.objective} • Budget: ₦{camp.totalBudgetNGN.toLocaleString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleCampaignStatus(camp.id, camp.status)}
                      className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium flex items-center gap-1 self-start sm:self-center transition-colors cursor-pointer"
                    >
                      {camp.status === 'active' ? (
                        <>
                          <Pause className="w-3 h-3" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" /> Resume
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
                    <div>
                      <span className="text-gray-400 font-medium">Platforms:</span>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {camp.platformAllocations.map(alloc => (
                          <span 
                            key={alloc.platform} 
                            className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px] font-medium"
                          >
                            {PLATFORM_CONFIGS[alloc.platform]?.name} ({alloc.percentage}%)
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-400 font-medium">Performance:</span>
                      <div className="text-gray-700 font-medium mt-1">
                        {camp.analytics?.totalImpressions.toLocaleString() || 0} views • {camp.analytics?.totalClicks || 0} clicks
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-400 font-medium">Conversions:</span>
                      <div className="text-green-700 font-medium mt-1">
                        {camp.analytics?.leadsGenerated || 0} leads • {camp.analytics?.roas || 4.2}x ROAS
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
          <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
                />
              </div>

              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-600"
              >
                <option value="all">All Stages</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Won / Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div className="text-xs text-gray-500">
              {filteredLeads.length} leads
            </div>
          </div>

          {/* Leads Grid */}
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl p-6 text-xs text-gray-400">
              No leads match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-semibold text-gray-900 text-xs">{lead.customerName}</h2>
                        <span className="text-[10px] text-gray-500">
                          {PLATFORM_CONFIGS[lead.platformSource]?.name}
                        </span>
                      </div>
                      
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                        className="text-[11px] font-medium rounded border border-gray-200 px-1.5 py-0.5 bg-gray-50 text-gray-700 focus:outline-none"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="converted">Converted</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-[11px] space-y-1">
                      <div className="flex justify-between text-gray-600">
                        <span>Interest:</span>
                        <span className="font-medium text-gray-900">{lead.interestItem}</span>
                      </div>
                      {lead.customerPhone && (
                        <div className="flex justify-between text-gray-600">
                          <span>Phone:</span>
                          <span className="font-mono">{lead.customerPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-100">
                    <a
                      href={`tel:${lead.customerPhone}`}
                      className="flex-1 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <PhoneCall className="w-3 h-3 text-blue-600" />
                      <span>Call</span>
                    </a>

                    <a
                      href={`https://wa.me/${lead.customerPhone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1 rounded bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>

                    {lead.invoiceId && (
                      <button
                        onClick={() => openInvoiceDetail(lead.invoiceId!)}
                        className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                        title="View Invoice"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(PLATFORM_CONFIGS).map(([platformKey, conf]) => (
              <div 
                key={platformKey} 
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{conf.icon}</span>
                    <h2 className="font-semibold text-gray-900 text-sm">{conf.name}</h2>
                  </div>
                  <span className="px-2 py-0.2 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                    Active
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                    <span>Est. Reach</span>
                    <span className="font-semibold text-gray-900">
                      {(totalImpressions * 0.28).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                    <span>CTR</span>
                    <span className="font-semibold text-blue-600">3.8%</span>
                  </div>
                  <div className="flex justify-between py-1 text-gray-600">
                    <span>Avg. CPC</span>
                    <span className="font-semibold text-gray-900">₦42.50</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL (MULTI-STEP WIZARD) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-200 rounded-xl max-w-xl w-full p-5 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase">Step {step} of 3</span>
                <h2 className="text-base font-bold text-gray-900">Create Campaign</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1 */}
            {step === 1 && (
              <div className="py-4 space-y-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Campaign Title</label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    placeholder="e.g. Ramadan Sale"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Objective</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(OBJECTIVE_LABELS).slice(0, 4).map(([objKey, item]) => (
                      <div
                        key={objKey}
                        onClick={() => setObjective(objKey as AdvertisingObjective)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          objective === objKey
                            ? 'bg-blue-50 border-blue-600 text-blue-900'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-medium text-xs">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-700 font-medium mb-1">
                    <span>Budget (NGN)</span>
                    <span className="text-blue-600 font-bold">₦{totalBudget.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="500000"
                    step="5000"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="py-4 space-y-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Advertising Channels</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(PLATFORM_CONFIGS).map(([pKey, pConf]) => {
                      const isSelected = selectedPlatforms.includes(pKey as SupportedAdPlatform);
                      return (
                        <div
                          key={pKey}
                          onClick={() => togglePlatform(pKey as SupportedAdPlatform)}
                          className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 text-blue-900 font-medium'
                              : 'bg-white border-gray-200 text-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{pConf.icon}</span>
                            <span>{pConf.name}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Target Cities</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Kaduna', 'Abuja', 'Lagos', 'Kano', 'Port Harcourt'].map(city => {
                      const isSelected = targetCities.includes(city);
                      return (
                        <button
                          key={city}
                          type="button"
                          onClick={() => toggleCity(city)}
                          className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

            {/* Step 3 */}
            {step === 3 && (
              <div className="py-4 space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={bodyCopy}
                    onChange={(e) => setBodyCopy(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-1">Image URL</label>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs cursor-pointer"
                >
                  Back
                </button>
              ) : <div />}

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
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs cursor-pointer"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleLaunchCampaign}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Launching...' : 'Launch Campaign'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD LEAD MODAL */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full p-5 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
              <h2 className="font-bold text-gray-900 text-sm">Add Lead</h2>
              <button
                onClick={() => setIsAddLeadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fatima Bello"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +2348012345678"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Product / Interest</label>
                <input
                  type="text"
                  placeholder="e.g. Leather Loafers"
                  value={newLeadItem}
                  onChange={(e) => setNewLeadItem(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-1">Channel</label>
                <select
                  value={newLeadPlatform}
                  onChange={(e) => setNewLeadPlatform(e.target.value as SupportedAdPlatform)}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="google">Google</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
