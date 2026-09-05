import React, { useState, useEffect } from 'react';
import {
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Smile,
  RefreshCw,
  X,
} from 'lucide-react';
import { UserProfile } from '../types.ts';
import { getEloConfig } from '../utils/elo.ts';

interface UserLoginModalProps {
  onLoginSuccess: (user: UserProfile) => void;
  isOpen: boolean;
  initialStep?: 'handle' | 'niceName';
  existingUser?: UserProfile | null;
  onClose?: () => void;
}

export const UserLoginModal: React.FC<UserLoginModalProps> = ({
  onLoginSuccess,
  isOpen,
  initialStep = 'handle',
  existingUser = null,
  onClose,
}) => {
  const [step, setStep] = useState<'handle' | 'niceName'>(initialStep);
  const [handle, setHandle] = useState<string>(existingUser?.displayHandle || '');
  const [niceName, setNiceName] = useState<string>(existingUser?.niceName || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<UserProfile | null>(existingUser);

  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      setHandle(existingUser?.displayHandle || '');
      setNiceName(existingUser?.niceName || '');
      setVerifiedUser(existingUser);
      setError(null);
    }
  }, [isOpen, initialStep, existingUser]);

  if (!isOpen) return null;

  const handleVerifyHandle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handle.trim()) {
      setError('Please enter your Codeforces handle.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/user/verify-and-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Codeforces ID verification failed');
      }

      const user: UserProfile = data.user;
      setVerifiedUser(user);

      // Check if user already has a nice name in database
      if (!user.niceName) {
        // Prompt for nice name
        setStep('niceName');
      } else {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error('Login verification error:', err);
      setError(err.message || 'Verification error. Please check the handle.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNiceName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedUser) return;
    if (!niceName.trim()) {
      setError('Please enter a nice name.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/user/update-nicename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: verifiedUser.cfHandle,
          niceName: niceName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save nice name');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      console.error('Save nice name error:', err);
      setError(err.message || 'Failed to save nice name.');
    } finally {
      setIsLoading(false);
    }
  };

  const elo = verifiedUser ? getEloConfig(verifiedUser.rating) : null;

  return (
    <div
      id="user-login-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {step === 'handle' ? (
          /* Step 1: Codeforces Handle Verification */
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 mb-1">
                <User className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                Welcome to CodeSync
              </h2>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Connect your Codeforces account. We verify your handle in real time and store your progress safely in PostgreSQL.
              </p>
            </div>

            <form onSubmit={handleVerifyHandle} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="input-cf-handle"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Codeforces ID / Handle
                </label>
                <div className="relative">
                  <input
                    id="input-cf-handle"
                    type="text"
                    value={handle}
                    onChange={(e) => {
                      setHandle(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. tourist, Petr, or your handle"
                    disabled={isLoading}
                    autoFocus
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                id="btn-verify-cf-handle"
                type="submit"
                disabled={isLoading || !handle.trim()}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/60 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Codeforces ID...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Step 2: Prompt for Nice Name */
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 text-cyan-400 mb-1">
                <Smile className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                One Last Detail!
              </h2>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Codeforces handle <strong className="text-emerald-400">{verifiedUser?.displayHandle}</strong> verified! What should we call you in CodeSync?
              </p>
            </div>

            {/* Verified CF badge */}
            {verifiedUser && elo && (
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {verifiedUser.avatar ? (
                    <img
                      src={verifiedUser.avatar}
                      alt={verifiedUser.displayHandle}
                      className="w-9 h-9 rounded-full border border-zinc-700 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                      {verifiedUser.displayHandle[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-zinc-200">
                      {verifiedUser.displayHandle}
                    </div>
                    <div className="text-[11px] text-zinc-400 capitalize">
                      {verifiedUser.rank}
                    </div>
                  </div>
                </div>

                <div
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${elo.badgeBg}`}
                >
                  {verifiedUser.rating || 'Unrated'}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveNiceName} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="input-user-nice-name"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Your Preferred Nice Name
                </label>
                <input
                  id="input-user-nice-name"
                  type="text"
                  value={niceName}
                  onChange={(e) => {
                    setNiceName(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Aritro, Alex, or Alexey"
                  disabled={isLoading}
                  autoFocus
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                id="btn-save-nice-name"
                type="submit"
                disabled={isLoading || !niceName.trim()}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white shadow-md transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Enter CodeSync</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
