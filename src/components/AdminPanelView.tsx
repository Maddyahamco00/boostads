import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  Flame, 
  DollarSign, 
  ShieldCheck, 
  RefreshCw, 
  Search,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';
import { AuditLogEntity } from '../types';
import { AuthTestSuiteModal } from './AuthTestSuiteModal';

export const AdminPanelView: React.FC = () => {
  const { 
    businesses, 
    advertisements, 
    reports, 
    invoices, 
    allUsers,
    refreshData 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'businesses' | 'ads' | 'reports' | 'financials' | 'audit_logs' | 'users'>('businesses');
  const [fxSpread, setFxSpread] = useState<number>(2.0);
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntity[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.auditLogs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit_logs') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const totalGMV = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.total, 0);

  const handleVerifyBusiness = async (bizId: string, isVerified: boolean) => {
    try {
      await fetch(`/api/admin/businesses/${bizId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified })
      });
      refreshData();
    } catch (err) {
      console.error('Failed to update verification status:', err);
    }
  };

  const handleToggleAdBoost = async (adId: string, isBoosted: boolean) => {
    try {
      await fetch(`/api/admin/ads/${adId}/boost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBoosted })
      });
      refreshData();
    } catch (err) {
      console.error('Failed to toggle boost status:', err);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST'
      });
      refreshData();
    } catch (err) {
      console.error('Failed to resolve report:', err);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED') => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        await refreshData();
      } else {
        alert(data.error || 'Failed to update user status');
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const filteredLogs = auditLogs.filter(l => 
    l.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
    l.details.toLowerCase().includes(auditFilter.toLowerCase()) ||
    l.actorEmail.toLowerCase().includes(auditFilter.toLowerCase())
  );

  return (
    <div id="admin-panel-view" className="min-h-screen bg-gray-50 pb-20 text-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Manage platform businesses, advertisements, user roles, and security logs
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTestSuiteOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Run Security Tests</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium">Businesses</span>
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{businesses.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {businesses.filter(b => b.isVerified).length} verified
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium">Active Ads</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{advertisements.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {advertisements.filter(a => a.isBoosted).length} boosted
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium">Total Settled</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">₦{totalGMV.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {invoices.filter(i => i.status === 'paid').length} paid invoices
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium">Audit Events</span>
              <FileText className="w-4 h-4 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {auditLogs.length > 0 ? auditLogs.length : 'Active'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Recorded actions
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200 flex items-center gap-2 text-xs font-medium overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('businesses')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'businesses' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Businesses ({businesses.length})
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'ads' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Advertisements ({advertisements.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'users' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            User Accounts ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'audit_logs' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'reports' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'financials' ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            FX Settings
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* 1. BUSINESSES TAB */}
        {activeTab === 'businesses' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100 bg-gray-50/50">
                    <th className="p-3 font-medium">Business</th>
                    <th className="p-3 font-medium">Location</th>
                    <th className="p-3 font-medium">Tier</th>
                    <th className="p-3 font-medium">Verification</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {businesses.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img src={b.logoUrl} alt={b.name} className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
                          <div>
                            <div className="font-semibold text-gray-900">{b.name}</div>
                            <div className="text-[11px] text-gray-500">{b.categoryLabel}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-600">{b.location.city}, {b.location.state}</td>
                      <td className="p-3">
                        <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {b.tier}
                        </span>
                      </td>
                      <td className="p-3">
                        {b.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-gray-400">Unverified</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleVerifyBusiness(b.id, !b.isVerified)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                            b.isVerified
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                          }`}
                        >
                          {b.isVerified ? 'Revoke Verification' : 'Verify Business'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. ADVERTISEMENTS MODERATION */}
        {activeTab === 'ads' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100 bg-gray-50/50">
                    <th className="p-3 font-medium">Ad Title</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Price</th>
                    <th className="p-3 font-medium">Boost Status</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {advertisements.map((ad) => (
                    <tr key={ad.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img src={ad.mediaUrls[0]} alt={ad.title} className="w-8 h-8 rounded object-cover border border-gray-100" />
                          <div>
                            <div className="font-semibold text-gray-900">{ad.title}</div>
                            <div className="text-[11px] text-gray-500">{ad.businessName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-600">{ad.category}</td>
                      <td className="p-3 font-medium text-gray-900">
                        {ad.price ? `₦${ad.price.toLocaleString()}` : 'Custom'}
                      </td>
                      <td className="p-3">
                        {ad.isBoosted ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium text-[11px] inline-flex items-center gap-1 border border-amber-200">
                            <Flame className="w-3 h-3 text-amber-500" /> Boosted
                          </span>
                        ) : (
                          <span className="text-gray-400">Standard</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleAdBoost(ad.id, !ad.isBoosted)}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                            ad.isBoosted
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          }`}
                        >
                          {ad.isBoosted ? 'Remove Boost' : 'Boost Ad'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">User Reports</h3>
            {reports.length === 0 ? (
              <p className="text-xs text-gray-500">No active reports.</p>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{rep.targetName}</span>
                        <span className="text-gray-500">({rep.targetType})</span>
                        <span className="text-red-600 font-medium">Reason: {rep.reason}</span>
                      </div>
                      <p className="text-gray-600 mt-1">{rep.details}</p>
                    </div>

                    <div>
                      {rep.status === 'resolved' ? (
                        <span className="text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleResolveReport(rep.id)}
                          className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. FINANCIALS TAB */}
        {activeTab === 'financials' && (
          <div className="max-w-xl bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Foreign Exchange (FX) Spread Settings
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Configure the margin applied to international customer transactions.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-medium text-gray-700 mb-1">
                  <span>FX Spread Margin:</span>
                  <span className="text-blue-600">{fxSpread}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={fxSpread}
                  onChange={(e) => setFxSpread(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Base Rate (USD/NGN):</span>
                  <span className="font-mono text-gray-900">₦1,520.00</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Effective Rate:</span>
                  <span className="font-mono font-medium text-gray-900">
                    ₦{(1520 * (1 - fxSpread / 100)).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => alert(`FX Margin updated to ${fxSpread}%.`)}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Save FX Settings
              </button>
            </div>
          </div>
        )}

        {/* 5. USER ACCOUNTS & ROLES TAB */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">User Accounts</h3>
                <p className="text-xs text-gray-500">
                  Manage user roles and account statuses
                </p>
              </div>
              <button
                onClick={refreshData}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="divide-y divide-gray-100">
                {allUsers.map((user) => {
                  const isSuperAdmin = user.role === 'SUPER_ADMIN';
                  return (
                    <div key={user.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                          alt={user.name}
                          className="w-9 h-9 rounded-lg object-cover border border-gray-100"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{user.name}</span>
                            {isSuperAdmin ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                Super Admin
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-gray-100 text-gray-700">
                                {user.clientType || 'client'}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 text-[11px]">{user.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          user.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : user.status === 'SUSPENDED'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {user.status || 'ACTIVE'}
                        </span>

                        {!isSuperAdmin && (
                          <div className="flex items-center gap-1">
                            {user.status !== 'ACTIVE' && (
                              <button
                                onClick={() => handleUpdateUserStatus(user.id, 'ACTIVE')}
                                className="px-2 py-1 rounded bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                            {user.status !== 'SUSPENDED' && (
                              <button
                                onClick={() => handleUpdateUserStatus(user.id, 'SUSPENDED')}
                                className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}
                            {user.status !== 'DISABLED' && (
                              <button
                                onClick={() => handleUpdateUserStatus(user.id, 'DISABLED')}
                                className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium cursor-pointer"
                              >
                                Disable
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 6. SECURITY AUDIT LOGS TAB */}
        {activeTab === 'audit_logs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Security Audit Logs</h3>
                <p className="text-xs text-gray-500">
                  Authentication and platform event history
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    placeholder="Search logs..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                  title="Refresh Logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              {auditLoading ? (
                <div className="p-8 text-center text-gray-400 text-xs">Loading audit records...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">No audit logs found.</div>
              ) : (
                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="p-3 hover:bg-gray-50/60 transition-colors text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium uppercase bg-gray-100 text-gray-700">
                            {log.action}
                          </span>
                          <span className="font-medium text-gray-900">{log.actorEmail}</span>
                          <span className="text-gray-400 font-mono text-[10px]">({log.ipAddress})</span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-600 font-mono text-[11px] break-all">{log.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Security Test Suite Runner Modal */}
      <AuthTestSuiteModal
        isOpen={isTestSuiteOpen}
        onClose={() => setIsTestSuiteOpen(false)}
      />
    </div>
  );
};
