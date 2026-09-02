import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Clock,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserProfile } from '../types';

interface RegisterViewProps {
  onNavigateToLogin?: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigateToLogin }) => {
  const { setActiveView } = useApp();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  // Success States
  const [registeredUser, setRegisteredUser] = useState<UserProfile | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  useEffect(() => {
    if (window.location.pathname !== '/register') {
      window.history.replaceState({}, '', '/register');
    }
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds(prev => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const validateForm = () => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      errors.name = 'Full name is required';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!termsAccepted) {
      errors.terms = 'You must agree to the Terms of Service';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        password: password,
        confirmPassword: confirmPassword,
        termsAccepted: termsAccepted
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors && typeof data.errors === 'object') {
          setFieldErrors(data.errors);
        }
        throw new Error(data.error || 'Registration failed. Please try again.');
      }

      setRegisteredUser(data.user);
      setPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!registeredUser?.email || isSubmitting || resendStatus === 'loading' || cooldownSeconds > 0) return;

    setResendStatus('loading');
    setResendMessage(null);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredUser.email })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to send verification email.');
      }

      setResendStatus('sent');
      setResendMessage('Verification email sent! Please check your inbox.');
      setCooldownSeconds(60);
    } catch (err: unknown) {
      setResendStatus('error');
      setResendMessage(err instanceof Error ? err.message : 'Failed to send verification email.');
    }
  };

  const handleSignInClick = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      setActiveView('login');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-140px)] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center bg-[#F9FAFB] text-[#111827]">
      
      {/* Brand Header */}
      <div className="text-center mb-6">
        <button 
          onClick={() => setActiveView('discover')}
          className="inline-flex items-center gap-2 cursor-pointer focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Boost Market
          </span>
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 text-gray-900">
        
        {registeredUser ? (
          /* SUCCESS STATE */
          <div className="space-y-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">Account created!</h2>
              <p className="text-sm text-gray-600">
                We sent a verification link to <strong className="text-gray-900">{registeredUser.email}</strong>.
              </p>
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendStatus === 'loading' || cooldownSeconds > 0}
                className="text-xs font-medium text-blue-600 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                {resendStatus === 'loading' ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : cooldownSeconds > 0 ? (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>Resend in {cooldownSeconds}s</span>
                  </>
                ) : resendStatus === 'sent' ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Email sent</span>
                  </>
                ) : (
                  <span>Resend email</span>
                )}
              </button>

              {resendMessage && (
                <p className={`text-xs ${resendStatus === 'sent' ? 'text-green-600' : 'text-red-600'}`}>
                  {resendMessage}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleSignInClick}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors cursor-pointer"
              >
                Proceed to Sign In
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <div>
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-gray-900">Create your account</h1>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="register-fullname"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="John Doe"
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    fieldErrors.name ? 'border-red-500' : 'border-gray-200'
                  } rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors`}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="name@example.com"
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    fieldErrors.email ? 'border-red-500' : 'border-gray-200'
                  } rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    placeholder="Min. 8 characters"
                    className={`w-full px-3.5 pr-10 py-2.5 bg-white border ${
                      fieldErrors.password ? 'border-red-500' : 'border-gray-200'
                    } rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    placeholder="Repeat password"
                    className={`w-full px-3.5 pr-10 py-2.5 bg-white border ${
                      fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                    } rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (fieldErrors.terms) setFieldErrors(prev => ({ ...prev, terms: undefined }));
                    }}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>I agree to the Terms of Service and Privacy Policy.</span>
                </label>
                {fieldErrors.terms && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.terms}</p>
                )}
              </div>

              <button
                id="create-account-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Create Account'
                )}
              </button>

            </form>

            <div className="mt-6 text-center text-xs text-gray-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={handleSignInClick}
                className="font-medium text-blue-600 hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
