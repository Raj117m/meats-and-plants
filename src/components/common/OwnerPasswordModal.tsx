import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, X, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export const OwnerPasswordModal: React.FC = () => {
  const { ownerModalOpen, setOwnerModalOpen, loginAsOwner, ownerName } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!ownerModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError(false);

    const success = await loginAsOwner(password);
    if (!success) {
      setError(true);
      setSubmitting(false);
    } else {
      setPassword('');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className={`bg-white rounded-[24px] p-6 w-full max-w-sm warm-card transition-all ${
          error ? 'animate-shake' : ''
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DF]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F6F2EA] flex items-center justify-center text-[#2F7D4F]">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-[#22201C]">Owner Access</h3>
              <p className="text-xs text-[#7A746A]">Enter manager password</p>
            </div>
          </div>
          <button
            onClick={() => {
              setOwnerModalOpen(false);
              setError(false);
              setPassword('');
            }}
            className="p-1.5 rounded-full hover:bg-[#F6F2EA] text-[#7A746A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#7A746A] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                autoFocus
                className={`w-full px-3.5 py-3 rounded-xl bg-[#F6F2EA] border text-sm text-[#22201C] focus:outline-none transition-colors ${
                  error
                    ? 'border-[#D9534A] focus:border-[#D9534A]'
                    : 'border-[#ECE7DF] focus:border-[#2F7D4F]'
                }`}
              />
              <KeyRound size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A746A]/60" />
            </div>

            {error && (
              <p className="text-xs text-[#D9534A] font-medium mt-1.5">
                Incorrect password. Please try again.
              </p>
            )}

            <p className="text-[11px] text-[#7A746A] mt-2">
              Default password: <code className="bg-[#F6F2EA] px-1.5 py-0.5 rounded font-mono text-[#22201C]">meats2026</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-[#2F7D4F] hover:bg-[#276842] disabled:opacity-50 transition-all tap-bounce flex items-center justify-center gap-2 shadow-xs"
          >
            <span>{submitting ? 'Verifying...' : 'Unlock Dashboard'}</span>
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
