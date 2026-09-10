'use client';

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
  Building2,
  UserCheck,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authApi, formatAuthError } from '../lib/api';
import { UserProfile, AccountSecurityState, ClientType } from '../types';
import { SecuritySettingsModal } from './SecuritySettingsModal';
import { validatePhoneNumber, normalizePhoneNumber, formatPhoneDisplay } from '../lib/phoneUtils';

export const ClientProfileView: React.FC = () => {
  const { currentUser, setCurrentUser, isAuthenticated, setActiveView, businesses } = useApp();

  // Profile data state
  const [profile, setProfile] = useState<UserProfile>(currentUser);
  const [securityState, setSecurityState] = useState<AccountSecurityState | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Editable Form Fields
  const [name, setName] = useState<string>(currentUser.name || '');
  const [username, setUsername] = useState<string>(currentUser.username || '');
  const [phone, setPhone] = useState<string>(currentUser.phone || '');
  const [contactEmail, setContactEmail] = useState<string>(currentUser.contactEmail || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [contactEmailError, setContactEmailError] = useState<string | null>(null);
  const [isSavingContactOnly, setIsSavingContactOnly] = useState<boolean>(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [clientType, setClientType] = useState<ClientType>(currentUser.clientType || 'customer');
  const [bio, setBio] = useState<string>(currentUser.bio || '');
  const [city, setCity] = useState<string>(currentUser.location?.city || '');
  const [state, setState] = useState<string>(currentUser.location?.state || '');
  const [country, setCountry] = useState<string>(currentUser.location?.country || 'Nigeria');
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser.avatarUrl || '');

  // Avatar Management State (Epic 2 Task 2.1.3)
  const avatarFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState<boolean>(false);
  const [avatarMessage, setAvatarMessage] = useState<{ text: string; isError: boolean } | null>(null);

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
        setUsername(res.user.username || '');
        setPhone(res.user.phone || '');
        setContactEmail(res.user.contactEmail || '');
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

  // Handle Contact-Only Save (Epic 2 Task 2.1.4)
  const handleSaveContactInfo = async () => {
    setPhoneError(null);
    setContactEmailError(null);
    setContactSuccess(null);
    setProfileError(null);

    // Validate phone if provided
    let normalizedPhone: string | undefined = undefined;
    if (phone.trim()) {
      const pVal = validatePhoneNumber(phone);
      if (!pVal.valid) {
        setPhoneError(pVal.error || 'Invalid phone number format.');
        return;
      }
      normalizedPhone = pVal.normalized;
    }

    // Validate contact email if provided
    let cleanContactEmail: string | undefined = undefined;
    if (contactEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        setContactEmailError('Please enter a valid contact email address.');
        return;
      }
      cleanContactEmail = contactEmail.trim().toLowerCase();
    }

    setIsSavingContactOnly(true);
    try {
      const res = await authApi.updateContactInfo({
        phone: normalizedPhone !== undefined ? normalizedPhone : '',
        contactEmail: cleanContactEmail !== undefined ? cleanContactEmail : ''
      });

      if (res.success) {
        setContactSuccess('Contact information updated successfully.');
        if (res.user) {
          setProfile(res.user);
          setCurrentUser(res.user);
        }
        if (res.contact.phone) {
          setPhone(res.contact.phone);
        } else {
          setPhone('');
        }
        if (res.contact.contactEmail) {
          setContactEmail(res.contact.contactEmail);
        } else {
          setContactEmail('');
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
      setIsSavingContactOnly(false);
    }
  };

  // Handle Profile Create / Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setContactSuccess(null);
    setPhoneError(null);
    setContactEmailError(null);

    // Basic client-side validation
    if (!name.trim() || name.trim().length < 2) {
      setProfileError('Full name must be at least 2 characters.');
      return;
    }

    if (username.trim()) {
      if (username.trim().length < 3) {
        setProfileError('Username must be at least 3 characters.');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        setProfileError('Username can only contain alphanumeric characters and underscores.');
        return;
      }
    }

    // Phone format validation
    let normalizedPhone: string | undefined = undefined;
    if (phone.trim()) {
      const pVal = validatePhoneNumber(phone);
      if (!pVal.valid) {
        setPhoneError(pVal.error || 'Invalid phone number format.');
        setProfileError(pVal.error || 'Invalid phone number format.');
        return;
      }
      normalizedPhone = pVal.normalized;
    }

    // Contact email format validation
    let cleanContactEmail: string | undefined = undefined;
    if (contactEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
        setContactEmailError('Please enter a valid contact email address.');
        setProfileError('Please enter a valid contact email address.');
        return;
      }
      cleanContactEmail = contactEmail.trim().toLowerCase();
    }

    setIsSavingProfile(true);

    try {
      if (!profile.hasProfile) {
        // Epic 2 Task 2.1.1: Client Profile Creation Flow
        const createPayload = {
          name: name.trim(),
          username: username.trim() || undefined,
          phone: normalizedPhone || undefined,
          contactEmail: cleanContactEmail || undefined,
          clientType,
          bio: bio.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
          location: {
            city: city.trim() || undefined,
            state: state.trim() || undefined,
            country: country.trim() || undefined,
            lat: profile.location?.lat || 9.0820,
            lng: profile.location?.lng || 8.6753
          }
        };

        const res = await authApi.createProfile(createPayload);
        if (res.success && res.user) {
          setProfile(res.user);
          setCurrentUser(res.user);
          setProfileSuccess('Application profile created successfully! Welcome to Boost Market.');
          if (res.profile?.username) {
            setUsername(res.profile.username);
          } else if (res.user.username) {
            setUsername(res.user.username);
          }
        }
      } else {
        // Epic 2 Task 2.1.2: Client Profile Update Flow
        const updates: Partial<UserProfile> & { username?: string } = {
          name: name.trim(),
          username: username.trim() || undefined,
          phone: normalizedPhone !== undefined ? normalizedPhone : '',
          contactEmail: cleanContactEmail !== undefined ? cleanContactEmail : '',
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
          if (res.profile?.username) {
            setUsername(res.profile.username);
          } else if (res.user.username) {
            setUsername(res.user.username);
          }
          if (res.securityState) {
            setSecurityState(res.securityState);
          }
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

  // Handle Avatar File Upload (Epic 2 Task 2.1.3)
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarMessage(null);

    // Client-side validation: format check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarMessage({
        text: 'Invalid file format. Only JPEG, PNG, and WebP images are permitted.',
        isError: true
      });
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
      return;
    }

    // Client-side validation: size check (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setAvatarMessage({
        text: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 5MB.`,
        isError: true
      });
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image file'));
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await authApi.uploadAvatar({
        image: base64Data,
        filename: file.name
      });

      if (res.success && res.avatarUrl) {
        setAvatarUrl(res.avatarUrl);
        setProfile(prev => ({
          ...prev,
          avatarUrl: res.avatarUrl,
          avatarKey: res.avatarKey
        }));
        setCurrentUser({
          ...currentUser,
          avatarUrl: res.avatarUrl,
          avatarKey: res.avatarKey
        });
        setAvatarMessage({
          text: 'Profile picture updated successfully.',
          isError: false
        });
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      if (formatted.isSessionExpired || formatted.status === 401) {
        setIsSessionExpired(true);
      } else {
        setAvatarMessage({
          text: formatted.message,
          isError: true
        });
      }
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  // Handle Avatar Removal (Epic 2 Task 2.1.3)
  const handleRemoveAvatar = async () => {
    if (!avatarUrl && !profile.avatarUrl) return;

    setAvatarMessage(null);
    setIsRemovingAvatar(true);

    try {
      const res = await authApi.removeAvatar();
      if (res.success) {
        setAvatarUrl('');
        setProfile(prev => ({
          ...prev,
          avatarUrl: undefined,
          avatarKey: undefined
        }));
        setCurrentUser({
          ...currentUser,
          avatarUrl: undefined,
          avatarKey: undefined
        });
        setAvatarMessage({
          text: 'Profile picture removed successfully.',
          isError: false
        });
      }
    } catch (err: unknown) {
      const formatted = formatAuthError(err);
      if (formatted.isSessionExpired || formatted.status === 401) {
        setIsSessionExpired(true);
      } else {
        setAvatarMessage({
          text: formatted.message,
          isError: true
        });
      }
    } finally {
      setIsRemovingAvatar(false);
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
      const res = await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      if (res.success) {
        setPasswordSuccess('Password updated successfully. All active sessions have been revoked for your security. Please sign in with your new password.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
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
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#16C784]/15 border border-[#16C784]/30 text-[#071A17] font-bold text-2xl flex items-center justify-center shrink-0 shadow-sm">
                {avatarUrl || profile.avatarUrl ? (
                  <img
                    id="header-profile-avatar-img"
                    src={avatarUrl || profile.avatarUrl}
                    alt={profile.name || 'User Avatar'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}
                {(!avatarUrl && !profile.avatarUrl) && (
                  <span>{profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}</span>
                )}
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
                  {profile.hasProfile ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                      Profile Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Profile Setup Needed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                  {profile.username && (
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      @{profile.username}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {profile.email}
                  </span>
                  {profile.phone && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {profile.phone}
                    </span>
                  )}
                  {profile.contactEmail && profile.contactEmail !== profile.email && (
                    <span className="flex items-center gap-1 text-slate-600" title="Personal Contact Email">
                      <Mail className="w-3.5 h-3.5 text-[#16C784]" />
                      {profile.contactEmail}
                    </span>
                  )}
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

              {contactSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    {contactSuccess}
                  </span>
                  <button onClick={() => setContactSuccess(null)} className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer">
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

              {/* Epic 2 Task 2.1.1: Profile Setup Callout Banner */}
              {!profile.hasProfile && (
                <div className="mb-5 p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                      Application Profile Not Yet Created
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Your authentication account is active, but your public client profile has not been created yet. Complete the form below and click <strong>Create Application Profile</strong> to set up your marketplace identity.
                    </p>
                  </div>
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
                    disabled={isSavingProfile}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (profileError) setProfileError(null);
                    }}
                    placeholder="Your legal or display name"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 disabled:opacity-50 transition-all"
                  />
                </div>

                {/* Unique Username Handle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Unique Username / Handle
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Unique handle (3-30 chars, a-z, 0-9, _)
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-medium text-sm">@</span>
                    <input
                      id="profile-username-input"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                        if (profileError) setProfileError(null);
                      }}
                      placeholder="e.g. johndoe"
                      maxLength={30}
                      disabled={isSavingProfile}
                      className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white disabled:opacity-50 transition-all"
                    />
                  </div>
                </div>

                {/* Account Classification */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Classification
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <select
                      id="profile-client-type-select"
                      disabled={isSavingProfile}
                      value={clientType}
                      onChange={(e) => setClientType(e.target.value as ClientType)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 disabled:opacity-50 transition-all"
                    >
                      <option value="customer">Customer / Buyer</option>
                      <option value="business">Business / Merchant</option>
                      <option value="freelancer">Freelancer / Professional</option>
                      <option value="advertiser">Brand / Advertiser</option>
                      <option value="service_provider">Service Provider</option>
                    </select>
                  </div>
                </div>

                {/* Personal Contact Information Section (Epic 2 Task 2.1.4) */}
                <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#16C784]" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Personal Contact Information
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Manage your phone number and alternative communication email address.
                      </p>
                    </div>
                    <button
                      type="button"
                      id="profile-contact-save-quick-btn"
                      onClick={handleSaveContactInfo}
                      disabled={isSavingContactOnly || isSavingProfile}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#16C784] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingContactOnly ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      {isSavingContactOnly ? 'Saving...' : 'Save Contact'}
                    </button>
                  </div>

                  {/* Primary Account Authentication Email (Immutable) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Primary Account Email (Sign-in Identity)
                      </label>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Immutable login identity
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        id="profile-email-readonly"
                        type="email"
                        readOnly
                        disabled
                        value={profile.email}
                        className="w-full pl-9 pr-24 py-2 text-sm bg-slate-100/90 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed select-none"
                      />
                      <div className="absolute right-3 top-2.5">
                        {profile.emailVerifiedAt ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Verified Login Email
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Verification Pending
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      This address is tied directly to your sign-in credentials and security notices.
                    </p>
                  </div>

                  {/* Contact Email (Alternative / Communications) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Personal Contact Email <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <span className="text-[11px] text-slate-400">
                        For personal inquiries & notifications
                      </span>
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        id="profile-contact-email-input"
                        type="email"
                        disabled={isSavingProfile || isSavingContactOnly}
                        value={contactEmail}
                        onChange={(e) => {
                          setContactEmail(e.target.value);
                          if (contactEmailError) setContactEmailError(null);
                          if (profileError) setProfileError(null);
                        }}
                        placeholder="e.g. personal.contact@example.com"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] text-slate-900 disabled:opacity-50 transition-all"
                      />
                    </div>
                    {contactEmailError && (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {contactEmailError}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1">
                      Leave blank to use your primary account email for marketplace communications.
                    </p>
                  </div>

                  {/* Phone Number Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Phone Number
                      </label>
                      <span className="inline-flex items-center text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        Unverified (For contact only)
                      </span>
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        id="profile-phone-input"
                        type="tel"
                        disabled={isSavingProfile || isSavingContactOnly}
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (phoneError) setPhoneError(null);
                          if (profileError) setProfileError(null);
                        }}
                        onBlur={() => {
                          if (phone.trim()) {
                            const val = validatePhoneNumber(phone);
                            if (val.valid && val.normalized) {
                              setPhone(val.normalized);
                            }
                          }
                        }}
                        placeholder="+234 800 000 0000 or 0803 123 4567"
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] text-slate-900 disabled:opacity-50 transition-all"
                      />
                    </div>
                    {phoneError ? (
                      <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {phoneError}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Accepts Nigerian formats (e.g. 0803... or +234...) and international numbers (E.164).
                      </p>
                    )}
                  </div>
                </div>

                {/* Location Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                    <input
                      id="profile-city-input"
                      type="text"
                      disabled={isSavingProfile}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lagos"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 disabled:opacity-50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State / Region</label>
                    <input
                      id="profile-state-input"
                      type="text"
                      disabled={isSavingProfile}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Lagos State"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 disabled:opacity-50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                    <input
                      id="profile-country-input"
                      type="text"
                      disabled={isSavingProfile}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. Nigeria"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 disabled:opacity-50 transition-all"
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
                    disabled={isSavingProfile}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Brief description about yourself or your business activity..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#16C784] focus:bg-white text-slate-900 disabled:opacity-50 transition-all resize-none"
                  />
                </div>

                {/* Profile Picture / Avatar Management (Epic 2 Task 2.1.3) */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Profile Picture
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Upload a professional JPEG, PNG, or WebP photo up to 5MB.
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      Max 5 MB
                    </span>
                  </div>

                  {avatarMessage && (
                    <div
                      className={`mb-3 p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        avatarMessage.isError
                          ? 'bg-rose-50 border border-rose-200 text-rose-800'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {avatarMessage.isError ? (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span>{avatarMessage.text}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Avatar Preview Thumbnail */}
                    <div className="relative group w-20 h-20 rounded-2xl overflow-hidden bg-white border-2 border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                      {avatarUrl || profile.avatarUrl ? (
                        <img
                          id="profile-avatar-preview-img"
                          src={avatarUrl || profile.avatarUrl}
                          alt={profile.name || 'User Avatar'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#16C784]/15 flex items-center justify-center text-[#071A17] font-bold text-2xl">
                          {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                      {(isUploadingAvatar || isRemovingAvatar) && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] flex items-center justify-center text-white text-xs">
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-1 w-full space-y-2">
                      <input
                        ref={avatarFileInputRef}
                        id="profile-avatar-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarFileSelect}
                        disabled={isUploadingAvatar || isRemovingAvatar || isSavingProfile}
                      />

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          id="profile-avatar-upload-btn"
                          type="button"
                          onClick={() => avatarFileInputRef.current?.click()}
                          disabled={isUploadingAvatar || isRemovingAvatar || isSavingProfile}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#16C784] hover:bg-[#14b376] text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {isUploadingAvatar ? 'Uploading Image...' : 'Upload New Photo'}
                        </button>

                        {(avatarUrl || profile.avatarUrl) && (
                          <button
                            id="profile-avatar-remove-btn"
                            type="button"
                            onClick={handleRemoveAvatar}
                            disabled={isUploadingAvatar || isRemovingAvatar || isSavingProfile}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {isRemovingAvatar ? 'Removing...' : 'Remove Photo'}
                          </button>
                        )}
                      </div>

                      <div className="pt-1">
                        <details className="text-[11px] text-slate-500 cursor-pointer">
                          <summary className="hover:text-slate-700 select-none">Or specify an image URL directly</summary>
                          <div className="mt-2">
                            <input
                              id="profile-avatar-url-input"
                              type="url"
                              disabled={isSavingProfile || isUploadingAvatar}
                              value={avatarUrl}
                              onChange={(e) => setAvatarUrl(e.target.value)}
                              placeholder="https://example.com/avatar.jpg"
                              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16C784] text-slate-900"
                            />
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
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
                    {isSavingProfile 
                      ? 'Saving...' 
                      : profile.hasProfile 
                        ? 'Save Profile Changes' 
                        : 'Create Application Profile'}
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

            {/* Business Profile Card (Epic 2 Feature 2.2 Task 2.2.1) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Building2 className="w-5 h-5 text-[#16C784]" />
                <h3 className="text-base font-bold text-slate-900">Business Profile</h3>
              </div>

              {profile.businessId ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <div className="text-xs font-semibold text-emerald-900">
                      {businesses.find(b => b.id === profile.businessId)?.name || 'Registered Business'}
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      Business profile established and linked to your account.
                    </div>
                  </div>
                  <button
                    id="profile-view-merchant-hub-btn"
                    onClick={() => setActiveView('merchant_dashboard')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Open Merchant Business Hub
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    You haven't established a business profile on Boost Market yet. Create one now to start listing and showcasing your business.
                  </p>
                  <button
                    id="profile-create-business-btn"
                    onClick={() => setActiveView('create_business')}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16C784] hover:bg-[#14b376] text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Create Business
                  </button>
                </div>
              )}
            </div>

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
