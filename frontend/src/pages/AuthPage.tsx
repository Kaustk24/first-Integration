import React, { useState } from 'react'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal'

interface AuthPageProps {
  initialMode?: 'login' | 'register'
  onSkipToDashboard?: () => void
}

export default function AuthPage({ initialMode = 'login', onSkipToDashboard }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [successNotice, setSuccessNotice] = useState('')

  const handlePasswordResetSuccess = (msg: string) => {
    setSuccessNotice(msg)
    setMode('login')
  }

  return (
    <div className="min-h-screen w-full flex bg-[#f8f9fa] text-[#0f1117] font-sans">
      {/* Left side: Premium Fintech Branding & Highlights (hidden on mobile, visible on lg) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f1117] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle background ambient graphic */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#1c7ed6]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[#2f9e44]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded flex items-center justify-center shadow-md">
              <span className="text-[#0f1117] text-xs font-black tracking-tight">N5</span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">NIFTY50-ML</span>
              <span className="block text-[10px] text-[#adb5bd] tracking-widest uppercase font-semibold">
                Trading Intelligence
              </span>
            </div>
          </div>
        </div>

        {/* Hero Copy & Live Feature Highlights */}
        <div className="relative z-10 space-y-6 my-auto max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-[#2f9e44] animate-pulse" />
            <span>Real-time NSE Nifty 50 ML Signals</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight">
            Institutional-Grade Trading Analytics & Machine Learning Precision.
          </h1>

          <p className="text-sm text-[#adb5bd] leading-relaxed">
            Empower your market decisions with real-time confidence intervals, automated ATR-based risk management, and seamless FYERS broker order routing.
          </p>

        </div>

      </div>

      {/* Right side: Auth Form Card */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md bg-white border border-[#e9ecef] rounded-lg shadow-sm p-6 sm:p-8 relative">
          {/* Mobile brand header (when left side is hidden) */}
          <div className="lg:hidden flex items-center gap-2.5 mb-6 pb-4 border-b border-[#e9ecef]">
            <div className="w-7 h-7 bg-[#0f1117] rounded flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">N5</span>
            </div>
            <div>
              <span className="text-sm font-bold text-[#0f1117]">NIFTY50-ML</span>
              <span className="text-[10px] text-[#868e96] ml-2 tracking-wide uppercase">Trading Intelligence</span>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-[#e9ecef] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setSuccessNotice('')
              }}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'border-[#0f1117] text-[#0f1117]'
                  : 'border-transparent text-[#868e96] hover:text-[#495057]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setSuccessNotice('')
              }}
              className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'border-[#0f1117] text-[#0f1117]'
                  : 'border-transparent text-[#868e96] hover:text-[#495057]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form Header Title */}
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#0f1117]">
              {mode === 'login' ? 'Welcome Back' : 'Create Trading Account'}
            </h2>
            <p className="text-xs text-[#868e96] mt-1">
              {mode === 'login'
                ? 'Sign in to access your models, trade orders, and risk monitor.'
                : 'Fill in your details to start real-time ML trading intelligence.'}
            </p>
          </div>

          {/* Forms */}
          {mode === 'login' ? (
            <LoginForm
              onNavigateToRegister={() => setMode('register')}
              onOpenForgotPassword={() => setIsForgotModalOpen(true)}
              onSuccessNotice={successNotice}
            />
          ) : (
            <RegisterForm onNavigateToLogin={() => setMode('login')} />
          )}

          {/* Guest preview button */}
          {onSkipToDashboard && (
            <div className="mt-5 pt-3 border-t border-[#f1f3f5] text-center">
              <button
                type="button"
                onClick={onSkipToDashboard}
                className="text-xs text-[#868e96] hover:text-[#0f1117] font-medium transition-colors"
              >
                Skip authentication and explore dashboard →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        onSuccess={handlePasswordResetSuccess}
      />
    </div>
  )
}
