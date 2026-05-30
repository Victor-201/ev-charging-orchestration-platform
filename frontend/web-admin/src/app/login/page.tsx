'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { motion } from 'framer-motion';
import { Zap, Eye, EyeOff, AlertCircle, Loader2, Mail, Lock, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mapApiError } from '@/i18n/error-mapping';
import { cn } from '@/core/utils/cn';

// Shared theme components
import Background from '@/core/theme/Background';
import GlassCard from '@/core/theme/GlassCard';
import ThemeToggle from '@/core/theme/ThemeToggle';
import LanguageSwitcher from '@/core/theme/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { t } = useTranslation('common');

  const [step, setStep] = useState<'splash' | 'login'>('splash');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    // Elegant transition timer to shift from Splash to Login form
    const timer = setTimeout(() => {
      setStep('login');
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setShake(false);
    try {
      await login(email, password, mfaToken || undefined);
      router.push('/dashboard');
    } catch (err: unknown) {
      // Trigger card shaking on authentication failure
      setShake(true);
      setTimeout(() => setShake(false), 400);

      const res = (err as { response?: { data?: { message?: string; code?: string } } }).response;
      if (res?.data?.code === 'MFA_REQUIRED') {
        setShowMfa(true);
        setError(t('auth.mfa_required_toast'));
      } else {
        setError(mapApiError(res?.data?.code, res?.data?.message));
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Shared animated tech background */}
      <Background />

      {/* Floating sliding switch controls */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      {step === 'splash' && (
        <div className="relative w-full h-screen flex flex-col items-center justify-center z-10 text-center select-none overflow-hidden">
          {/* Logo container starting at the center of the viewport */}
          <motion.div
            layoutId="brand-logo-box"
            className="w-[1120px] h-[1120px] rounded-full flex items-center justify-center shadow-glow absolute shrink-0"
            style={{
              background: 'var(--sq-3-bg)',
              border: '1.5px solid var(--sq-3-border)',
              boxShadow: 'var(--sq-shadow)',
            }}
            transition={{ type: 'spring', stiffness: 50, damping: 14 }}
          >
            {/* Outer rotating tech HUD ring */}
            <motion.div
              className="absolute w-[450px] h-[450px] rounded-full border border-dashed pointer-events-none"
              style={{ borderColor: 'rgba(6, 182, 212, 0.25)' }}
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
            />

            {/* Inner rotating tech HUD ring */}
            <motion.div
              className="absolute w-[370px] h-[370px] rounded-full border-2 border-dashed pointer-events-none"
              style={{ borderColor: 'rgba(6, 182, 212, 0.4)' }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
            />

            {/* Concentric expanding pulse energy wave */}
            <motion.div
              className="absolute w-[300px] h-[300px] rounded-full border pointer-events-none"
              style={{ borderColor: 'rgba(6, 182, 212, 0.15)' }}
              animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            />

            {/* Glowing reactor core background glow */}
            <div 
              className="absolute w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40 animate-pulse"
              style={{ background: 'var(--brand-cyan)' }}
            />

            {/* Center Logo with float & pulse glow */}
            <motion.img
              layoutId="brand-logo-img"
              src="/EVoltBoard.png"
              alt="EVoltBoard"
              className="w-64 h-64 object-contain z-10 relative pointer-events-none"
              animate={{ 
                y: [0, -8, 0],
                filter: [
                  'drop-shadow(0 0 20px rgba(6,182,212,0.4))', 
                  'drop-shadow(0 0 45px rgba(6,182,212,0.75))', 
                  'drop-shadow(0 0 20px rgba(6,182,212,0.4))'
                ]
              }}
              transition={{ 
                y: { repeat: Infinity, duration: 4, ease: 'easeInOut' },
                filter: { repeat: Infinity, duration: 3, ease: 'easeInOut' }
              }}
            />
          </motion.div>


          {/* Simple breathing loading indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="absolute bottom-16 flex items-center gap-2 z-20"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: 'var(--brand-cyan)' }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.25, 1] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        </div>
      )}

      {step === 'login' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          className="w-full max-w-[420px] z-10"
        >
          {/* Custom reusable card with shaking effects */}
          <GlassCard className={cn(shake ? 'shake-error' : '')} showShine showMarkers>
            <div className="p-10">
              {/* Header: Logo elements morph directly into here */}
              <div className="text-center mb-8">
                <motion.div
                  layoutId="brand-logo-box"
                  className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full shadow-glow-sm"
                  style={{
                    background: 'var(--sq-3-bg)',
                    border: '1.5px solid var(--sq-3-border)',
                  }}
                >
                  <motion.img
                    layoutId="brand-logo-img"
                    src="/EVoltBoard.png"
                    alt="EVoltBoard Logo"
                    className="w-12 h-12 object-contain"
                  />
                </motion.div>
                <motion.h1
                  layoutId="brand-title"
                  className="text-2xl font-bold mb-1 tracking-tight"
                  style={{ color: 'var(--text-main)', letterSpacing: '-0.5px' }}
                >
                  {t('brand.name')}
                </motion.h1>
                <motion.p
                  layoutId="brand-subtitle"
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-faded)' }}
                >
                  {t('auth.platform_subtitle')}
                </motion.p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2.5 p-3.5 mb-5 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Address */}
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-faded)' }}
                  >
                    {t('auth.email_label')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faded pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      className="ev-input pl-11 focus:ring-2 focus:ring-cyan/20 focus:border-cyan"
                      placeholder={t('auth.email_placeholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-faded)' }}
                  >
                    {t('auth.password_label')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faded pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="ev-input pl-11 pr-11 focus:ring-2 focus:ring-cyan/20 focus:border-cyan"
                      placeholder={t('auth.password_placeholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-text-main transition-colors duration-200"
                      style={{ color: 'var(--text-faded)' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* MFA Code Section (Reveal with motion) */}
                {showMfa && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden"
                  >
                    <label
                      className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: 'var(--text-faded)' }}
                    >
                      {t('auth.mfa_label')}
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faded pointer-events-none">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        className="ev-input pl-11 font-mono tracking-[0.3em] text-center text-lg focus:ring-2 focus:ring-cyan/20 focus:border-cyan"
                        placeholder={t('auth.mfa_placeholder')}
                        maxLength={6}
                        value={mfaToken}
                        onChange={(e) => setMfaToken(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-4 disabled:opacity-60 disabled:cursor-not-allowed select-none relative overflow-hidden"
                  style={{ borderRadius: '14px' }}
                >
                  <div className="absolute inset-0" style={{ background: 'var(--sq-shine)' }} />
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                      <span className="relative z-10">{t('auth.login_loading')}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 animate-pulse relative z-10" />
                      <span className="relative z-10">{t('auth.login_btn')}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Card Footer info */}
              <div
                className="mt-6 pt-5 text-center"
                style={{ borderTop: '1.5px solid var(--card-border)' }}
              >
                <p className="text-[11px] font-medium" style={{ color: 'var(--text-faded)' }}>
                  {t('auth.footer_text')}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
