'use client';

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
  Lock, 
  FileText, 
  LogOut, 
  ArrowLeft,
  KeyRound,
  Copy,
  Check,
  AlertCircle,
  ShieldAlert,
  Download,
  Key,
  Clock,
  ExternalLink,
  Eye,
  X,
  FolderTree
} from 'lucide-react';
import { AuditLogEntity, AdminVerificationRequestItem, AdminVerificationDetailResponse, BusinessVerificationStatus } from '../types';
import { AuthTestSuiteModal } from './AuthTestSuiteModal';
import { CategoryManagementTab } from './CategoryManagementTab';
import { authApi, adminApi, fetchWithAuth, formatAuthError } from '../lib/api';
import { Logo } from './Logo';

export const AdminPanelView: React.FC = () => {
  const { 
    currentUser,
    isAuthenticated,
    isAuthLoading,
    setActiveView,
    logout,
    businesses, 
    advertisements, 
    reports, 
    invoices, 
    allUsers,
    refreshData 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'businesses' | 'verifications' | 'categories' | 'ads' | 'reports' | 'financials' | 'audit_logs' | 'users' | 'security'>('businesses');
  const [fxSpread, setFxSpread] = useState<number>(2.0);
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState(false);

  // Verifications State (Epic 2 Feature 2.3 Task 2.3.3)
  const [verificationRequests, setVerificationRequests] = useState<AdminVerificationRequestItem[]>([]);
  const [verificationsLoading, setVerificationsLoading] = useState(false);
  const [verificationStatusFilter, setVerificationStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [verificationSearch, setVerificationSearch] = useState('');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [selectedVerification, setSelectedVerification] = useState<AdminVerificationDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejectionReasonError, setRejectionReasonError] = useState<string | null>(null);
  const [approveConfirmModalOpen, setApproveConfirmModalOpen] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntity[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('');

  // Two-Factor Authentication (2FA) State
  const [twoFactorStatus, setTwoFactorStatus] = useState<{
    twoFactorEnabled: boolean;
    remainingRecoveryCodes: number;
    userEmail: string;
  } | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    otpauthUrl: string;
    recoveryCodes: string[];
  } | null>(null);
  const [totpVerifyInput, setTotpVerifyInput] = useState('');
  const [disablePasswordInput, setDisablePasswordInput] = useState('');
  const [regenPasswordInput, setRegenPasswordInput] = useState('');
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false);

  // 1. Loading State (Prevent UI Flash)
  if (isAuthLoading) {
    return (
      <div id="admin-auth-loading" className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-[#16C784]" />
          <p className="text-xs font-medium tracking-wide">Verifying Super Admin Authorization...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State -> Prompt Super Admin Login
  if (!isAuthenticated) {
    return (
      <div id="admin-unauthenticated-state" className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-[#071A17] text-[#16C784] rounded-xl flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Admin Sign In Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Please sign in with authorized executive credentials to access the administration portal.
          </p>
          <div className="pt-2">
            <button
              id="admin-login-redirect-btn"
              onClick={() => setActiveView('admin_login')}
              className="w-full py-2.5 px-4 rounded-lg bg-[#071A17] hover:bg-[#071A17]/90 text-[#16C784] border border-[#16C784]/30 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Sign In to Super Admin Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated CLIENT Access Denied (Strict 403 Forbidden State)
  const isSuperAdmin = currentUser && currentUser.role === 'SUPER_ADMIN' && currentUser.email.toLowerCase().trim() === 'maddyahamco00@gmail.com';

  if (!isSuperAdmin) {
    return (
      <div id="admin-access-denied-state" className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F8FAFC]">
        <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            You don't have permission to access this page.
          </p>
          <div className="pt-2">
            <button
              id="admin-access-denied-back-btn"
              onClick={() => setActiveView('discover')}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const data = await fetchWithAuth<{ success: boolean; auditLogs?: AuditLogEntity[]; logs?: AuditLogEntity[] }>('/api/admin/audit-logs');
      if (data.success) {
        setAuditLogs(data.auditLogs || data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await adminApi.getVerifications({ status: 'PENDING' });
      if (res.success) {
        setPendingCount(res.total ?? res.count ?? 0);
      }
    } catch (err) {
      console.error('Failed to load pending verifications count:', err);
    }
  };

  const fetchVerifications = async (
    statusOverride?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED',
    searchOverride?: string
  ) => {
    setVerificationsLoading(true);
    try {
      const statusToUse = statusOverride !== undefined ? statusOverride : verificationStatusFilter;
      const searchToUse = searchOverride !== undefined ? searchOverride : verificationSearch;
      const res = await adminApi.getVerifications({
        status: statusToUse === 'ALL' ? undefined : statusToUse,
        search: searchToUse.trim() || undefined
      });
      if (res.success) {
        setVerificationRequests(res.requests || []);
      }
      fetchPendingCount();
    } catch (err) {
      console.error('Failed to load verification requests:', err);
    } finally {
      setVerificationsLoading(false);
    }
  };

  const handleOpenDetails = async (requestId: string) => {
    setDetailLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await adminApi.getVerificationDetails(requestId);
      if (res.success) {
        setSelectedVerification(res);
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to load verification details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedVerification) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await adminApi.approveVerification(selectedVerification.request.id);
      if (res.success) {
        setActionSuccess('Business verification approved successfully.');
        setApproveConfirmModalOpen(false);
        await handleOpenDetails(selectedVerification.request.id);
        await fetchVerifications();
        await refreshData();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to approve verification request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification) return;
    const trimmed = rejectionReasonInput.trim();
    if (!trimmed) {
      setRejectionReasonError('Please provide a reason for rejecting the request.');
      return;
    }
    if (trimmed.length < 3) {
      setRejectionReasonError('Rejection reason must be at least 3 characters long.');
      return;
    }
    if (trimmed.length > 500) {
      setRejectionReasonError('Rejection reason cannot exceed 500 characters.');
      return;
    }

    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    setRejectionReasonError(null);
    try {
      const res = await adminApi.rejectVerification(selectedVerification.request.id, trimmed);
      if (res.success) {
        setActionSuccess('Business verification request has been rejected.');
        setRejectionModalOpen(false);
        setRejectionReasonInput('');
        await handleOpenDetails(selectedVerification.request.id);
        await fetchVerifications();
        await refreshData();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Failed to reject verification request.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCount();
  }, []);

  useEffect(() => {
    if (activeTab === 'verifications') {
      fetchVerifications();
    } else if (activeTab === 'audit_logs') {
      fetchAuditLogs();
    } else if (activeTab === 'security') {
      fetchTwoFactorStatus();
      setSecurityError(null);
      setSecurityMessage(null);
    }
  }, [activeTab, verificationStatusFilter]);

  const fetchTwoFactorStatus = async () => {
    setTwoFactorLoading(true);
    try {
      const res = await authApi.get2FAStatus();
      if (res.success) {
        setTwoFactorStatus({
          twoFactorEnabled: res.twoFactorEnabled,
          remainingRecoveryCodes: res.remainingRecoveryCodes,
          userEmail: res.userEmail
        });
      }
    } catch (err: unknown) {
      console.error('Failed to load 2FA status:', err);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleStartSetup = async () => {
    setIsSubmitting2FA(true);
    setSecurityError(null);
    setSecurityMessage(null);
    try {
      const res = await authApi.setup2FA();
      if (res.success) {
        setSetupData({
          secret: res.secret,
          otpauthUrl: res.otpauthUrl,
          recoveryCodes: res.recoveryCodes
        });
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setSecurityError(formatted.message);
    } finally {
      setIsSubmitting2FA(false);
    }
  };

  const handleConfirmEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData || !totpVerifyInput.trim()) {
      setSecurityError('Please enter the 6-digit TOTP code from your authenticator app.');
      return;
    }

    setIsSubmitting2FA(true);
    setSecurityError(null);
    setSecurityMessage(null);
    try {
      const res = await authApi.enable2FA(totpVerifyInput.trim(), setupData.recoveryCodes);
      if (res.success) {
        setSecurityMessage('Two-Factor Authentication successfully activated for Super Admin.');
        setNewRecoveryCodes(setupData.recoveryCodes);
        setSetupData(null);
        setTotpVerifyInput('');
        await fetchTwoFactorStatus();
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setSecurityError(formatted.message);
    } finally {
      setIsSubmitting2FA(false);
    }
  };

  const handleConfirmDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePasswordInput) {
      setSecurityError('Super Admin password is required to disable Two-Factor Authentication.');
      return;
    }

    setIsSubmitting2FA(true);
    setSecurityError(null);
    setSecurityMessage(null);
    try {
      const res = await authApi.disable2FA(disablePasswordInput);
      if (res.success) {
        setSecurityMessage('Two-Factor Authentication has been disabled.');
        setIsDisableModalOpen(false);
        setDisablePasswordInput('');
        setNewRecoveryCodes(null);
        await fetchTwoFactorStatus();
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setSecurityError(formatted.message);
    } finally {
      setIsSubmitting2FA(false);
    }
  };

  const handleConfirmRegenerateCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regenPasswordInput) {
      setSecurityError('Super Admin password is required to regenerate recovery codes.');
      return;
    }

    setIsSubmitting2FA(true);
    setSecurityError(null);
    setSecurityMessage(null);
    try {
      const res = await authApi.regenerateRecoveryCodes(regenPasswordInput);
      if (res.success && res.recoveryCodes) {
        setNewRecoveryCodes(res.recoveryCodes);
        setSecurityMessage('New emergency recovery codes have been generated. Store them safely.');
        setIsRegenModalOpen(false);
        setRegenPasswordInput('');
        await fetchTwoFactorStatus();
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      setSecurityError(formatted.message);
    } finally {
      setIsSubmitting2FA(false);
    }
  };

  const totalGMV = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.total, 0);

  const handleVerifyBusiness = async (bizId: string, isVerified: boolean) => {
    try {
      await fetchWithAuth(`/api/admin/businesses/${bizId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ isVerified })
      });
      refreshData();
    } catch (err) {
      console.error('Failed to update verification status:', err);
    }
  };

  const handleToggleAdBoost = async (adId: string, isBoosted: boolean) => {
    try {
      await fetchWithAuth(`/api/admin/ads/${adId}/boost`, {
        method: 'POST',
        body: JSON.stringify({ isBoosted })
      });
      refreshData();
    } catch (err) {
      console.error('Failed to toggle boost status:', err);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await fetchWithAuth(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST'
      });
      refreshData();
    } catch (err) {
      console.error('Failed to resolve report:', err);
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED') => {
    try {
      const data = await fetchWithAuth<{ success: boolean; error?: string }>(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (data.success) {
        await refreshData();
      } else {
        alert(data.error || 'Failed to update user status');
      }
    } catch (err) {
      const formatted = formatAuthError(err);
      alert(formatted.message);
    }
  };

  const handleAdminLogout = async () => {
    await logout();
    setActiveView('admin_login');
  };

  const filteredLogs = auditLogs.filter(l => 
    l.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
    l.details.toLowerCase().includes(auditFilter.toLowerCase()) ||
    l.actorEmail.toLowerCase().includes(auditFilter.toLowerCase())
  );

  return (
    <div id="admin-panel-view" className="min-h-screen bg-[#F8FAFC] pb-20 text-slate-900">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] bg-white px-4 py-5 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo variant="icon" size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#16C784]/15 text-[#16C784] border border-[#16C784]/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage platform businesses, advertisements, user roles, and security logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="admin-run-tests-btn"
              onClick={() => setIsTestSuiteOpen(true)}
              className="px-3 py-2 rounded-lg bg-[#071A17] hover:bg-[#071A17]/90 text-[#16C784] border border-[#16C784]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#16C784]" />
              <span>Security Test Suite</span>
            </button>
            <button
              id="admin-exit-discover-btn"
              onClick={() => setActiveView('discover')}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Site</span>
            </button>
            <button
              id="admin-logout-btn"
              onClick={handleAdminLogout}
              className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Admin Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Businesses</span>
              <Building2 className="w-4 h-4 text-[#16C784]" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{businesses.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {businesses.filter(b => b.isVerified).length} verified
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Active Ads</span>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{advertisements.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {advertisements.filter(a => a.isBoosted).length} boosted
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Total Settled</span>
              <DollarSign className="w-4 h-4 text-[#16C784]" />
            </div>
            <div className="text-2xl font-bold text-slate-900">₦{totalGMV.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {invoices.filter(i => i.status === 'paid').length} paid invoices
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Audit Events</span>
              <FileText className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {auditLogs.length > 0 ? auditLogs.length : 'Active'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Recorded actions
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-[#E2E8F0] flex items-center gap-2 text-xs font-medium overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('businesses')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer font-semibold ${
              activeTab === 'businesses' ? 'border-[#16C784] text-[#16C784]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Businesses ({businesses.length})
          </button>
          <button
            id="admin-tab-verifications-btn"
            onClick={() => {
              setActiveTab('verifications');
              setActionSuccess(null);
              setActionError(null);
            }}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer font-semibold flex items-center gap-1.5 ${
              activeTab === 'verifications' ? 'border-[#16C784] text-[#16C784]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verifications</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            id="admin-tab-categories-btn"
            onClick={() => setActiveTab('categories')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer font-semibold flex items-center gap-1.5 ${
              activeTab === 'categories' ? 'border-[#16C784] text-[#16C784]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Categories & Taxonomy</span>
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer font-semibold ${
              activeTab === 'ads' ? 'border-[#16C784] text-[#16C784]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Advertisements ({advertisements.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer font-semibold ${
              activeTab === 'users' ? 'border-[#16C784] text-[#16C784]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            User Accounts ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer font-semibold ${
              activeTab === 'audit_logs' ? 'border-[#16C784] text-[#16C784]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer font-semibold ${
              activeTab === 'reports' ? 'border-[#16C784] text-[#16C784]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Reports ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer font-semibold ${
              activeTab === 'financials' ? 'border-[#16C784] text-[#16C784]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            FX Settings
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer font-semibold flex items-center gap-1.5 ${
              activeTab === 'security' ? 'border-[#16C784] text-[#16C784]' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Security & 2FA</span>
            {twoFactorStatus?.twoFactorEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#16C784]" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* 1. BUSINESSES TAB */}
        {activeTab === 'businesses' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                    <th className="p-3 font-semibold">Business</th>
                    <th className="p-3 font-semibold">Location</th>
                    <th className="p-3 font-semibold">Tier</th>
                    <th className="p-3 font-semibold">Verification</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {businesses.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img src={b.logoUrl} alt={b.name} className="w-8 h-8 rounded-lg object-cover border border-slate-100" />
                          <div>
                            <div className="font-semibold text-slate-900">{b.name}</div>
                            <div className="text-[11px] text-slate-500">{b.categoryLabel}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{b.location.city}, {b.location.state}</td>
                      <td className="p-3">
                        <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {b.tier}
                        </span>
                      </td>
                      <td className="p-3">
                        {b.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[#16C784] font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-slate-400">Unverified</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleVerifyBusiness(b.id, !b.isVerified)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                            b.isVerified
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-[#16C784]/15 text-[#16C784] hover:bg-[#16C784]/25'
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

        {/* VERIFICATIONS TAB (Epic 2 Feature 2.3 Task 2.3.3) */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => {
                    setVerificationStatusFilter('PENDING');
                    fetchVerifications('PENDING');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    verificationStatusFilter === 'PENDING'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Review</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setVerificationStatusFilter('ALL');
                    fetchVerifications('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    verificationStatusFilter === 'ALL'
                      ? 'bg-[#071A17] text-[#16C784] border border-[#16C784]/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Requests
                </button>
                <button
                  onClick={() => {
                    setVerificationStatusFilter('APPROVED');
                    fetchVerifications('APPROVED');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    verificationStatusFilter === 'APPROVED'
                      ? 'bg-[#16C784]/15 text-[#16C784] border border-[#16C784]/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approved</span>
                </button>
                <button
                  onClick={() => {
                    setVerificationStatusFilter('REJECTED');
                    fetchVerifications('REJECTED');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    verificationStatusFilter === 'REJECTED'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Rejected</span>
                </button>
              </div>

              {/* Search & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={verificationSearch}
                    onChange={(e) => setVerificationSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchVerifications();
                    }}
                    placeholder="Search business or notes..."
                    className="pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[#16C784] focus:border-[#16C784] outline-none w-56 text-slate-900"
                  />
                  {verificationSearch && (
                    <button
                      onClick={() => {
                        setVerificationSearch('');
                        fetchVerifications(undefined, '');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => fetchVerifications()}
                  disabled={verificationsLoading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Refresh Queue"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verificationsLoading ? 'animate-spin text-[#16C784]' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Global Action Alerts */}
            {actionSuccess && (
              <div className="p-3 bg-[#16C784]/10 border border-[#16C784]/30 rounded-xl text-xs text-[#16C784] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
                  <span className="font-semibold">{actionSuccess}</span>
                </div>
                <button onClick={() => setActionSuccess(null)} className="text-[#16C784] hover:opacity-75">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="font-semibold">{actionError}</span>
                </div>
                <button onClick={() => setActionError(null)} className="text-red-600 hover:opacity-75">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Verification Queue Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
              {verificationsLoading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#16C784]" />
                  <p className="text-xs">Loading verification requests...</p>
                </div>
              ) : verificationRequests.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-800">No verification requests found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {verificationStatusFilter === 'PENDING'
                      ? 'There are currently no pending verification requests requiring review.'
                      : 'No verification requests match the selected filters.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                        <th className="p-3 font-semibold">Business</th>
                        <th className="p-3 font-semibold">Owner</th>
                        <th className="p-3 font-semibold">Submitted</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {verificationRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3">
                            <div>
                              <div className="font-semibold text-slate-900">{req.businessName}</div>
                              {req.businessSlug && (
                                <div className="text-[11px] text-slate-400">@{req.businessSlug}</div>
                              )}
                              {req.notes && (
                                <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">
                                  &ldquo;{req.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-700 font-medium">{req.ownerName || 'Unknown'}</div>
                            <div className="text-[11px] text-slate-400">{req.ownerEmail || '—'}</div>
                          </td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(req.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {req.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                              </span>
                            )}
                            {req.status === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#16C784]/15 text-[#16C784] border border-[#16C784]/30">
                                <CheckCircle2 className="w-3 h-3 text-[#16C784]" /> Approved
                              </span>
                            )}
                            {req.status === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
                                <XCircle className="w-3 h-3 text-red-600" /> Rejected
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenDetails(req.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect & Review</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. ADVERTISEMENTS MODERATION */}
        {activeTab === 'ads' && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-100 bg-slate-50/50">
                    <th className="p-3 font-semibold">Ad Title</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Price</th>
                    <th className="p-3 font-semibold">Boost Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advertisements.map((ad) => (
                    <tr key={ad.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img src={ad.mediaUrls[0]} alt={ad.title} className="w-8 h-8 rounded object-cover border border-slate-100" />
                          <div>
                            <div className="font-semibold text-slate-900">{ad.title}</div>
                            <div className="text-[11px] text-slate-500">{ad.businessName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">{ad.category}</td>
                      <td className="p-3 font-medium text-slate-900">
                        {ad.price ? `₦${ad.price.toLocaleString()}` : 'Custom'}
                      </td>
                      <td className="p-3">
                        {ad.isBoosted ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium text-[11px] inline-flex items-center gap-1 border border-amber-200">
                            <Flame className="w-3 h-3 text-amber-500" /> Boosted
                          </span>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleAdBoost(ad.id, !ad.isBoosted)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                            ad.isBoosted
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">User Reports</h3>
            {reports.length === 0 ? (
              <p className="text-xs text-slate-500">No active reports.</p>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div key={rep.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{rep.targetName}</span>
                        <span className="text-slate-500">({rep.targetType})</span>
                        <span className="text-red-600 font-semibold">Reason: {rep.reason}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{rep.details}</p>
                    </div>

                    <div>
                      {rep.status === 'resolved' ? (
                        <span className="text-[#16C784] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleResolveReport(rep.id)}
                          className="px-2.5 py-1 rounded bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
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
          <div className="max-w-xl bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">
              Foreign Exchange (FX) Spread Settings
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Configure the margin applied to international customer transactions.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between font-medium text-slate-700 mb-1">
                  <span>FX Spread Margin:</span>
                  <span className="text-[#16C784] font-bold">{fxSpread}%</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={fxSpread}
                  onChange={(e) => setFxSpread(Number(e.target.value))}
                  className="w-full accent-[#16C784]"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Base Rate (USD/NGN):</span>
                  <span className="font-mono text-slate-900">₦1,520.00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Effective Rate:</span>
                  <span className="font-mono font-bold text-slate-900">
                    ₦{(1520 * (1 - fxSpread / 100)).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => alert(`FX Margin updated to ${fxSpread}%.`)}
                className="w-full py-2 rounded-lg bg-[#16C784] hover:bg-[#14B8A6] text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
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
                <h3 className="text-sm font-semibold text-slate-900">User Accounts</h3>
                <p className="text-xs text-slate-500">
                  Manage user roles and account statuses
                </p>
              </div>
              <button
                onClick={refreshData}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
              <div className="divide-y divide-slate-100">
                {allUsers.map((user) => {
                  const isSuperAdmin = user.role === 'SUPER_ADMIN';
                  return (
                    <div key={user.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                          alt={user.name}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-100"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{user.name}</span>
                            {isSuperAdmin ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-[#071A17] text-[#16C784] border border-[#16C784]/30">
                                Super Admin
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                                {user.clientType || 'client'}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 text-[11px]">{user.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          user.status === 'ACTIVE'
                            ? 'bg-[#16C784]/15 text-[#16C784] border border-[#16C784]/30'
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
                                className="px-2 py-1 rounded bg-[#16C784]/15 hover:bg-[#16C784]/25 text-[#16C784] text-xs font-semibold cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                            {user.status !== 'SUSPENDED' && (
                              <button
                                onClick={() => handleUpdateUserStatus(user.id, 'SUSPENDED')}
                                className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold cursor-pointer"
                              >
                                Suspend
                              </button>
                            )}
                            {user.status !== 'DISABLED' && (
                              <button
                                onClick={() => handleUpdateUserStatus(user.id, 'DISABLED')}
                                className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer"
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
                <h3 className="text-sm font-semibold text-slate-900">Security Audit Logs</h3>
                <p className="text-xs text-slate-500">
                  Authentication and platform event history
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    placeholder="Search logs..."
                    className="pl-8 pr-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#16C784]"
                  />
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="p-1.5 rounded-lg bg-white border border-[#E2E8F0] text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  title="Refresh Logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
              {auditLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading audit records...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No audit logs found.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="p-3 hover:bg-slate-50/60 transition-colors text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold uppercase bg-slate-100 text-slate-700">
                            {log.action}
                          </span>
                          <span className="font-semibold text-slate-900">{log.actorEmail}</span>
                          <span className="text-slate-400 font-mono text-[10px]">({log.ipAddress})</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 font-mono text-[11px] break-all">{log.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. SECURITY & 2FA TAB */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Header & Context */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#16C784]" />
                  <span>Super Admin Security & Two-Factor Authentication</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  RFC 6238 compliant TOTP multi-factor protection and emergency recovery code vault for the Super Admin account.
                </p>
              </div>
              <button
                onClick={fetchTwoFactorStatus}
                disabled={twoFactorLoading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${twoFactorLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            {/* Alert Messages */}
            {securityMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{securityMessage}</span>
                </div>
                <button 
                  onClick={() => setSecurityMessage(null)}
                  className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold cursor-pointer ml-3"
                >
                  ✕
                </button>
              </div>
            )}

            {securityError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{securityError}</span>
                </div>
                <button 
                  onClick={() => setSecurityError(null)}
                  className="text-rose-700 hover:text-rose-950 text-xs font-semibold cursor-pointer ml-3"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Status Overview Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  2FA Protection Status
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {twoFactorLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                  ) : twoFactorStatus?.twoFactorEnabled ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <Check className="w-3.5 h-3.5" />
                        Active & Enforced
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Disabled / Not Configured
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Requires 6-digit TOTP code or emergency recovery code on every login.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Protected Principal
                </span>
                <p className="text-sm font-bold text-slate-900 font-mono">
                  {twoFactorStatus?.userEmail || 'maddyahamco00@gmail.com'}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  <span>Role: SUPER_ADMIN (Immutable)</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Emergency Recovery Vault
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {twoFactorStatus?.twoFactorEnabled ? (
                    <span className="text-emerald-700 font-semibold">
                      {twoFactorStatus.remainingRecoveryCodes} code{twoFactorStatus.remainingRecoveryCodes === 1 ? '' : 's'} available
                    </span>
                  ) : (
                    <span className="text-slate-400">None enrolled</span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 mt-2">
                  Each recovery code is single-use and hashed with SHA-256 in storage.
                </p>
              </div>
            </div>

            {/* Display newly generated / regenerated recovery codes if available */}
            {newRecoveryCodes && newRecoveryCodes.length > 0 && (
              <div className="bg-[#071A17] text-white border border-[#16C784]/30 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#16C784]" />
                    <h3 className="text-sm font-bold text-white">
                      Your Emergency Recovery Codes (Save Immediately)
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newRecoveryCodes.join('\n'));
                      setCopiedCodes(true);
                      setTimeout(() => setCopiedCodes(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-[#16C784] hover:bg-[#16C784]/90 text-[#071A17] font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedCodes ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodes ? 'Copied to Clipboard' : 'Copy All Codes'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  These codes can be used to authenticate if you lose access to your authenticator app. Each code can only be used once. Store them in a secure password manager or offline safe. They will not be displayed again.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {newRecoveryCodes.map((code, idx) => (
                    <div 
                      key={idx}
                      className="px-3 py-2 bg-white/10 border border-white/15 rounded-lg text-center font-mono font-semibold text-xs text-[#16C784] tracking-wider"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Action View: Enrolled vs Unenrolled */}
            {twoFactorStatus?.twoFactorEnabled ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Two-Factor Authentication Controls
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Your Super Admin account is protected by multi-factor authentication. You can rotate recovery codes or disable 2FA below.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setRegenPasswordInput('');
                      setSecurityError(null);
                      setIsRegenModalOpen(true);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate Emergency Backup Codes</span>
                  </button>

                  <button
                    onClick={() => {
                      setDisablePasswordInput('');
                      setSecurityError(null);
                      setIsDisableModalOpen(true);
                    }}
                    className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disable Two-Factor Authentication</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
                  <p className="font-semibold text-slate-800">Security Architecture Mandates:</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>Session TTL: Super Admin sessions expire in 12 hours regardless of client cookie preferences.</li>
                    <li>Rate Limiting: Exceeding 5 failed TOTP attempts activates progressive lockout defense.</li>
                    <li>Role Boundary: Client accounts cannot invoke admin authentication routes or access 2FA secrets.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
                {!setupData ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Enroll in Two-Factor Authentication
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Secure your Super Admin account with standard TOTP (Time-Based One-Time Password) authentication compatible with Google Authenticator, Microsoft Authenticator, 1Password, and Authy.
                      </p>
                    </div>

                    <button
                      onClick={handleStartSetup}
                      disabled={isSubmitting2FA}
                      className="px-4 py-2.5 bg-[#071A17] hover:bg-[#071A17]/90 text-[#16C784] border border-[#16C784]/40 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      {isSubmitting2FA ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#16C784]" />
                          <span>Generating Secure Keys...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Begin 2FA Enrollment</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Complete 2FA Setup
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Follow the 3 steps below to verify your authenticator app and activate protection.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSetupData(null);
                          setTotpVerifyInput('');
                          setSecurityError(null);
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                      >
                        Cancel Setup
                      </button>
                    </div>

                    {/* Step 1: Secret Key */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-mono">1</span>
                        <span>Add to your Authenticator App</span>
                      </span>
                      <p className="text-xs text-slate-500 pl-6.5">
                        Scan the URI or manually enter the Base32 Secret Key into Google Authenticator or your password vault:
                      </p>
                      <div className="pl-6.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-semibold text-slate-800 tracking-wider flex-1 break-all">
                          {setupData.secret}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(setupData.secret);
                            setCopiedSecret(true);
                            setTimeout(() => setCopiedSecret(false), 2000);
                          }}
                          className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSecret ? 'Copied' : 'Copy Secret'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 2: Emergency Recovery Codes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-mono">2</span>
                          <span>Save 8 Single-Use Recovery Codes</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(setupData.recoveryCodes.join('\n'));
                            setCopiedCodes(true);
                            setTimeout(() => setCopiedCodes(false), 2000);
                          }}
                          className="text-xs text-[#16C784] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCodes ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCodes ? 'Copied Codes' : 'Copy All'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 pl-6.5">
                        If you ever lose access to your authenticator device, each code grants a one-time emergency sign-in.
                      </p>
                      <div className="pl-6.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {setupData.recoveryCodes.map((code, idx) => (
                          <div
                            key={idx}
                            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-center font-mono text-xs text-slate-700 font-semibold"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Step 3: Verify & Activate */}
                    <form onSubmit={handleConfirmEnable2FA} className="space-y-3 pt-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-mono">3</span>
                        <span>Verify 6-digit TOTP Code</span>
                      </span>
                      <div className="pl-6.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          type="text"
                          required
                          maxLength={8}
                          value={totpVerifyInput}
                          onChange={(e) => setTotpVerifyInput(e.target.value.replace(/\s+/g, ''))}
                          placeholder="e.g. 123456"
                          className="w-full sm:w-48 px-3.5 py-2 text-sm font-mono tracking-widest border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#16C784] focus:border-[#16C784] outline-none text-center"
                        />
                        <button
                          type="submit"
                          disabled={isSubmitting2FA || !totpVerifyInput.trim()}
                          className="px-4 py-2 bg-[#071A17] hover:bg-[#071A17]/90 text-[#16C784] border border-[#16C784]/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {isSubmitting2FA ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#16C784]" />
                              <span>Activating 2FA...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Verify & Activate 2FA</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 8. CATEGORIES & TAXONOMY TAB (Epic 3 Feature 3.1 Tasks 3.1.1 & 3.1.2) */}
        {activeTab === 'categories' && (
          <CategoryManagementTab />
        )}

        {/* Modal: Disable 2FA */}
        {isDisableModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-sm font-bold text-slate-900">
                  Confirm Disabling Two-Factor Authentication
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Disabling 2FA lowers the security of the executive Super Admin account. To authorize this change, please enter your master password:
              </p>
              <form onSubmit={handleConfirmDisable2FA} className="space-y-3">
                <input
                  type="password"
                  required
                  autoFocus
                  value={disablePasswordInput}
                  onChange={(e) => setDisablePasswordInput(e.target.value)}
                  placeholder="Enter Super Admin Password"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-rose-500 focus:border-rose-500 outline-none"
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDisableModalOpen(false);
                      setDisablePasswordInput('');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting2FA || !disablePasswordInput}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting2FA ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Confirm Disable</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Regenerate Recovery Codes */}
        {isRegenModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 text-slate-800">
                <RefreshCw className="w-5 h-5 text-[#16C784]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Regenerate Emergency Recovery Codes
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generating new recovery codes will immediately invalidate all existing unused recovery codes. Enter your Super Admin master password to proceed:
              </p>
              <form onSubmit={handleConfirmRegenerateCodes} className="space-y-3">
                <input
                  type="password"
                  required
                  autoFocus
                  value={regenPasswordInput}
                  onChange={(e) => setRegenPasswordInput(e.target.value)}
                  placeholder="Enter Super Admin Password"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-[#16C784] focus:border-[#16C784] outline-none"
                />
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegenModalOpen(false);
                      setRegenPasswordInput('');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting2FA || !regenPasswordInput}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting2FA ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Generate New Codes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Verification Request Details Modal (Epic 2 Feature 2.3 Task 2.3.3) */}
        {selectedVerification && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Verification Request: {selectedVerification.businessProfile?.name || 'Business'}
                    </h3>
                    {selectedVerification.request.status === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                        Pending Review
                      </span>
                    )}
                    {selectedVerification.request.status === 'APPROVED' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#16C784]/15 text-[#16C784] border border-[#16C784]/30">
                        Approved
                      </span>
                    )}
                    {selectedVerification.request.status === 'REJECTED' && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
                        Rejected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Request ID: <span className="font-mono text-slate-700">{selectedVerification.request.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedVerification(null);
                    setActionSuccess(null);
                    setActionError(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Alert in Modal */}
              {actionSuccess && (
                <div className="p-3 bg-[#16C784]/10 border border-[#16C784]/30 rounded-xl text-xs text-[#16C784] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#16C784]" />
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* 4 Distinct Information Cards */}
              <div className="space-y-4 text-xs">
                {/* 1. Submitted Verification Information */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>Submitted Verification Request</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500">Submission Date:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {new Date(selectedVerification.submittedInformation?.submittedAt || selectedVerification.request.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Current Request Status:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedVerification.request.status}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Merchant Notes & CAC / Registry Information:</span>
                    <div className="mt-1 p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedVerification.submittedInformation?.notes || selectedVerification.request.notes || (
                        <span className="text-slate-400 italic">No notes provided with this verification submission.</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Business Profile Information */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-600" />
                    <span>Business Profile</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500">Business Name:</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {selectedVerification.businessProfile?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Public Slug:</span>
                      <p className="font-mono text-slate-800 mt-0.5">
                        @{selectedVerification.businessProfile?.slug || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Categories:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedVerification.businessProfile?.categoryIds?.join(', ') || 'General'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Location:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedVerification.businessProfile?.location ? `${selectedVerification.businessProfile.location.city}, ${selectedVerification.businessProfile.location.state}` : 'Not Specified'}
                      </p>
                    </div>
                  </div>
                  {selectedVerification.businessProfile?.description && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500">Description:</span>
                      <p className="mt-0.5 text-slate-700 leading-relaxed">
                        {selectedVerification.businessProfile.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Owner Information */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-slate-600" />
                    <span>Business Owner Account</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-500">Owner Name:</span>
                      <p className="font-semibold text-slate-900 mt-0.5">
                        {selectedVerification.ownerInformation?.name || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Contact Email:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedVerification.ownerInformation?.email || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Account Type:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedVerification.ownerInformation?.clientType || 'CLIENT'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Registered Since:</span>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedVerification.ownerInformation?.createdAt ? new Date(selectedVerification.ownerInformation.createdAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Review Decision & Audit Metadata */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-slate-600" />
                    <span>Review Decision & Audit Metadata</span>
                  </h4>
                  {selectedVerification.request.status === 'PENDING' ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                      <div className="flex items-center gap-2 font-semibold">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Awaiting Super Admin Decision</span>
                      </div>
                      <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        This request is currently pending. Review the submitted registration details and business profile above before deciding to approve or reject.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500">Decision Status:</span>
                          <p className={`font-bold mt-0.5 ${selectedVerification.request.status === 'APPROVED' ? 'text-[#16C784]' : 'text-red-600'}`}>
                            {selectedVerification.request.status}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Reviewed At:</span>
                          <p className="font-medium text-slate-800 mt-0.5">
                            {selectedVerification.request.reviewedAt ? new Date(selectedVerification.request.reviewedAt).toLocaleString() : '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Reviewing Administrator:</span>
                          <p className="font-medium text-slate-800 mt-0.5">
                            {selectedVerification.reviewInformation?.reviewerEmail || selectedVerification.request.reviewerId || 'Super Admin'}
                          </p>
                        </div>
                      </div>
                      {selectedVerification.request.status === 'REJECTED' && selectedVerification.request.rejectionReason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <span className="text-xs font-bold text-red-800">Rejection Reason Provided to Merchant:</span>
                          <p className="text-xs text-red-700 mt-1 leading-relaxed whitespace-pre-wrap font-medium">
                            {selectedVerification.request.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVerification(null);
                    setActionSuccess(null);
                    setActionError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>

                {selectedVerification.request.status === 'PENDING' ? (
                  <div className="flex items-center gap-2">
                    <button
                      id="admin-open-reject-btn"
                      type="button"
                      onClick={() => {
                        setRejectionReasonInput('');
                        setRejectionReasonError(null);
                        setRejectionModalOpen(true);
                      }}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-600" />
                      <span>Reject Request</span>
                    </button>
                    <button
                      id="admin-open-approve-btn"
                      type="button"
                      onClick={() => setApproveConfirmModalOpen(true)}
                      className="px-4 py-2 bg-[#071A17] hover:bg-[#071A17]/90 text-[#16C784] border border-[#16C784]/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16C784]" />
                      <span>Approve Verification</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-400 italic">
                    Decision finalized — request is locked
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approve Confirmation Modal */}
        {approveConfirmModalOpen && selectedVerification && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#16C784]/15 text-[#16C784] flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Approve Business Verification</h3>
                  <p className="text-xs text-slate-500">Super Admin Approval Action</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to approve verification for <span className="font-semibold text-slate-900">{selectedVerification.businessProfile?.name || 'this business'}</span>?
              </p>
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg text-[11px] text-emerald-800 leading-relaxed">
                This will mark the business as <strong>Verified</strong> across Boost Market, grant the verification badge, and record this decision in the platform security audit log.
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setApproveConfirmModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="admin-confirm-approve-btn"
                  type="button"
                  disabled={actionLoading}
                  onClick={handleApprove}
                  className="px-4 py-2 bg-[#071A17] hover:bg-[#071A17]/90 text-[#16C784] border border-[#16C784]/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{actionLoading ? 'Approving...' : 'Confirm Approval'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {rejectionModalOpen && selectedVerification && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reject Verification Request</h3>
                  <p className="text-xs text-slate-500">{selectedVerification.businessProfile?.name || 'Business'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Provide a clear and constructive reason for rejection. This reason will be displayed to the merchant so they can resolve the issues and resubmit.
              </p>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Quick Reason Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'CAC / registration documents are unclear or unverified.',
                    'Physical business location could not be confirmed.',
                    'Provided contact phone number and email are unreachable.',
                    'Business profile contains incomplete or mismatched registry data.'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRejectionReasonInput(preset);
                        setRejectionReasonError(null);
                      }}
                      className="px-2 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors cursor-pointer text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1">
                <textarea
                  id="admin-rejection-reason-input"
                  rows={3}
                  maxLength={500}
                  value={rejectionReasonInput}
                  onChange={(e) => {
                    setRejectionReasonInput(e.target.value);
                    if (rejectionReasonError) setRejectionReasonError(null);
                  }}
                  placeholder="Explain why verification is rejected (e.g. CAC documents blurry, please re-upload clear certificate)..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 focus:border-red-500 outline-none text-slate-900 resize-none leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px]">
                  <span className={rejectionReasonError ? 'text-red-600 font-medium' : 'text-slate-400'}>
                    {rejectionReasonError || 'Min 3 characters, max 500 characters'}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {rejectionReasonInput.length} / 500
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    setRejectionModalOpen(false);
                    setRejectionReasonError(null);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="admin-confirm-reject-btn"
                  type="button"
                  disabled={actionLoading || !rejectionReasonInput.trim()}
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{actionLoading ? 'Rejecting...' : 'Confirm Rejection'}</span>
                </button>
              </div>
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
