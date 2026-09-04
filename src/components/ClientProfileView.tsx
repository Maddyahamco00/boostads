import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  Laptop, 
  RefreshCw, 
  ArrowLeft,
  Calendar,
  Check,
  Building,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, formatAuthError } from '../lib/api';
import { UserProfile, AccountSecurityState, ClientType } from '../types';
import { SecuritySettingsModal } from './SecuritySettingsModal';

export const ClientProfileView: React.FC = () => {
  const { currentUser, setCurrentUser, isAuthenticated, setActiveView } = useApp();

  // Profile data state
  const [profile, setProfile] = useState<UserProfile>(currentUser);
  const [securityState, setSecurityState] = useState<AccountSecurityState | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Editable Form Fields
  const [name, setName] = useState<string>(currentUser.name || '');
  const [phone, setPhone] = useState<string>(currentUser.phone || '');
  const [clientType, setClientType] = useState<ClientType>(currentUser.clientType || 'customer');
  const [bio, setBio] = useState<string>(currentUser.bio || '');
  const [city, setCity] = useState<string>(currentUser.location?.city || '');
  const [state, setState] = useState<string>(currentUser.location?.state || '');
  const [country, setCountry] = useState<string>(currentUser.location?.country || 'Nigeria');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser.avatarUrl || '');

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Security Modal State
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);

  // Session Expiration State
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);

  // Fetch verified profile from server on mount
  const loadProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await authApi.getProfile();
      if (res.success && res.user) {
        setProfile(res.user);
        setCurrentUser(res.user);
        setName(res.user.name || '');
        setPhone(res.user.phone || '');
        setClientType(res.user.clientType || 'customer');
        setBio(res.user.bio || '');
        setCity(res.user.location?.city || '');
        setState(res.user.location?.state || '');
        setCountry(res.user.location?.country || 'Nigeria');
        setAvatarUrl(res.user.avatarUrl || '');
        if (res.securityState) {
          setSecurityState(res.securityState);
        }
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      if (formatted.isSessionExpired || formatted.status === 401) {
        setIsSessionExpired(true);
      } else {
        setProfileError(formatted.message);
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    } else {
      setIsLoadingProfile(false);
    }
  }, [isAuthenticated]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    // Basic client-side validation
    if (!name.trim() || name.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters.');
      return;
    }

    setIsSavingProfile(true);

    try {
      const updates: Partial<UserProfile> = {
        name: name.trim(),
        phone: phone.trim(),
        clientType,
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
        location: {
          city: city.trim(),
          state: state.trim(),
          country: country.trim(),
          lat: profile.location?.lat || 9.0820,
          lng: profile.location?.lng || 8.6753
        }
      };

      const res = await authApi.updateProfile(updates);
      if (res.success && res.user) {
        setProfile(res.user);
        setCurrentUser(res.user);
        setProfileSuccess('Profile information updated successfully.');
        if (res.securityState) {
          setSecurityState(res.securityState);
        }
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      if (formatted.isSessionExpired || formatted.status === 401) {
        setIsSessionExpired(true);
      } else {
        setProfileError(formatted.message);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('New password must contain both letters and numbers.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordSuccess('Password updated successfully. All active sessions have been secured.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Reload security state to reflect session rotation
        loadProfile();
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      if (formatted.isSessionExpired || formatted.status === 401) {
        setIsSessionExpired(true);
      } else {
        setPasswordError(formatted.message);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Password validation indicators
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasMatchingConfirm = newPassword.length > 0 && newPassword === confirmPassword;

  // Unauthenticated / Session Expired Guard
  if (!isAuthenticated || isSessionExpired) {
    return (
      <div className="max-w-xl mx-auto my-16 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Authentication Required</h2>
          <p className="text-sm text-slate-600 mb-6">
            Your session has expired or you are not logged in. Please sign in to view and manage your account profile.
          </p>
          <button
            id="profile-session-login-btn"
            onClick={() => setActiveView('login')}
            className="w-full py-2.5 px-4 bg-[#16C784] hover:bg-[#14b376] text-white font-medium rounded-xl transition-colors cursor-pointer"
          >
            Sign In to Boost Market
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="profile-back-to-explore-btn"
              onClick={() => setActiveView('discover')}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              title="Return to explore"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Client Profile & Settings</h1>
              <p className="text-xs text-slate-500">
                Manage your account credentials, personal information, and platform security.
              </p>
            </div>
          </div>

          <button
            id="profile-reload-btn"
            onClick={loadProfile}
            disabled={isLoadingProfile}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProfile ? 'animate-spin text-[#16C784]' : 'text-slate-500'}`} />
            Refresh
          </button>
        </div>

        {/* Account Overview Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#16C784]/15 border border-[#16C784]/30 text-[#071A17] font-bold text-xl flex items-center justify-center shrink-0">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-slate-900">{profile.name}</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <UserCheck className="w-3 h-3 mr-1" />
                    {profile.role}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                    {profile.status}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                    {profile.clientType || 'Customer'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {profile.email}
                  </span>
                  {profile.location?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {profile.location.city}, {profile.location.state || profile.location.country}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Member since {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right sm:self-center shrink-0">
              <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 uppercase tracking-wide">
                Tier: {profile.tier || 'Free'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid: Profile Info Form + Security State */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Editable Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#16C784]" />
                  <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
                </div>
                <span className="text-xs text-slate-400">Allowed editable fields</span>
              </div>

              {/* Feedback Alerts */}
              {profileSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    {profileSuccess}
                  </span>
                  <button onClick={() => setProfileSuccess(null)} className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer">
                    Dismiss
                  </button>
                </div>
              )}

              {profileError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    {profileError}
                  </span>
                  <button onClick={() => setProfileError(null)} className="text-red-700 hover:text-red-900 text-xs cursor-pointer">
                    Dismiss
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="profile-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (profileError) setProfileError(null);
                    }}
                    placeholder="Your legal or display name"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                  />
                </div>

                {/* Account Email (Read-Only) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Email Address
                    </label>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      Immutable account identity
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="profile-email-readonly"
                      type="email"
                      readOnly
                      disabled
                      value={profile.email}
                      className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed select-none"
                    />
                    <div className="absolute right-3 top-2.5">
                      {profile.emailVerifiedAt ? (
                        <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pending Verification
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone & Client Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        id="profile-phone-input"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+234 800 000 0000"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Classification
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <select
                        id="profile-client-type-select"
                        value={clientType}
                        onChange={(e) => setClientType(e.target.value as ClientType)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                      >
                        <option value="customer">Customer / Buyer</option>
                        <option value="business">Business / Merchant</option>
                        <option value="freelancer">Freelancer / Professional</option>
                        <option value="advertiser">Brand / Advertiser</option>
                        <option value="service_provider">Service Provider</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      id="profile-city-input"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lagos"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State / Region</label>
                    <input
                      id="profile-state-input"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Lagos State"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                    <input
                      id="profile-country-input"
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. Nigeria"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                    />
                  </div>
                </div>

                {/* Bio / Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      About / Bio
                    </label>
                    <span className="text-[11px] text-slate-400">{bio.length}/500</span>
                  </div>
                  <textarea
                    id="profile-bio-textarea"
                    rows={3}
                    maxLength={500}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief description about yourself or your business activity..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all resize-none"
                  />
                </div>

                {/* Avatar URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Avatar Image URL
                  </label>
                  <input
                    id="profile-avatar-url-input"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex justify-end">
                  <button
                    id="profile-save-btn"
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16C784] hover:bg-[#14b376] text-white font-medium text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-slate-700" />
                  <h3 className="text-base font-bold text-slate-900">Change Password</h3>
                </div>
                <span className="text-xs text-slate-400">Authenticated password update</span>
              </div>

              {/* Password Feedback */}
              {passwordSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    {passwordSuccess}
                  </span>
                  <button onClick={() => setPasswordSuccess(null)} className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer">
                    Dismiss
                  </button>
                </div>
              )}

              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    {passwordError}
                  </span>
                  <button onClick={() => setPasswordError(null)} className="text-red-700 hover:text-red-900 text-xs cursor-pointer">
                    Dismiss
                  </button>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="profile-current-password-input"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder="••••••••••••"
                      className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="profile-new-password-input"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        placeholder="Min. 8 characters"
                        className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="profile-confirm-password-input"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        placeholder="Repeat new password"
                        className="w-full pr-10 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Criteria Helpers */}
                {newPassword.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                    <div className="font-medium text-slate-700 mb-1">Password Requirements:</div>
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`} />
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasLetter ? 'text-emerald-600' : 'text-slate-400'}`} />
                      Contains at least one letter
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700' : 'text-slate-500'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`} />
                      Contains at least one number
                    </div>
                    {confirmPassword.length > 0 && (
                      <div className={`flex items-center gap-1.5 ${hasMatchingConfirm ? 'text-emerald-700' : 'text-red-600'}`}>
                        <Check className={`w-3.5 h-3.5 ${hasMatchingConfirm ? 'text-emerald-600' : 'text-red-400'}`} />
                        Passwords match
                      </div>
                    )}
                  </div>
                )}

                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Security Notice:</strong> Changing your password will immediately revoke and rotate all other active login sessions across your devices.
                  </span>
                </div>

                {/* Password Submit Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    id="profile-change-password-btn"
                    type="submit"
                    disabled={isChangingPassword || !currentPassword || !hasMinLength}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Key className="w-4 h-4" />
                    {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* Right Column: Account Security State & Controls */}
          <div className="space-y-6">

            {/* Security Health Summary Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Shield className="w-5 h-5 text-[#16C784]" />
                <h3 className="text-base font-bold text-slate-900">Security Health</h3>
              </div>

              {/* Status Items */}
              <div className="space-y-3 text-xs">
                {/* Email Verification */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <div className="font-semibold text-slate-900">Email Verification</div>
                    <div className="text-slate-500">{profile.email}</div>
                  </div>
                  {profile.emailVerifiedAt ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <Check className="w-3 h-3 mr-0.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Unverified
                    </span>
                  )}
                </div>

                {/* Two-Factor Authentication */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <div className="font-semibold text-slate-900">Two-Factor Auth (2FA)</div>
                    <div className="text-slate-500">TOTP Authenticator</div>
                  </div>
                  {securityState?.twoFactorEnabled || profile.twoFactorEnabled ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                      Disabled
                    </span>
                  )}
                </div>

                {/* Active Sessions */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <div className="font-semibold text-slate-900">Active Sessions</div>
                    <div className="text-slate-500">
                      {securityState?.activeSessionsCount ?? 1} device session(s) active
                    </div>
                  </div>
                  <Laptop className="w-4 h-4 text-slate-400" />
                </div>

                {/* Password State */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <div className="font-semibold text-slate-900">Account Password</div>
                    <div className="text-slate-500">Encrypted with bcrypt</div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                </div>
              </div>

              {/* Manage 2FA & Sessions Button */}
              <button
                id="profile-manage-security-modal-btn"
                onClick={() => setIsSecurityModalOpen(true)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-slate-600" />
                Manage 2FA & Active Sessions
              </button>
            </div>

            {/* Account Metadata Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3 text-xs">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                Account Details
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Account ID</span>
                <span className="font-mono text-slate-800">{profile.id}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Account Role</span>
                <span className="font-semibold text-slate-800">{profile.role}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Account Status</span>
                <span className="font-semibold text-emerald-700">{profile.status}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Created At</span>
                <span className="text-slate-800">{new Date(profile.createdAt).toLocaleString()}</span>
              </div>

              {profile.updatedAt && (
                <div className="flex justify-between text-slate-600">
                  <span>Last Updated</span>
                  <span className="text-slate-800">{new Date(profile.updatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Embedded Security & 2FA Modal */}
      <SecuritySettingsModal
        isOpen={isSecurityModalOpen}
        onClose={() => {
          setIsSecurityModalOpen(false);
          loadProfile();
        }}
      />
    </div>
  );
};
