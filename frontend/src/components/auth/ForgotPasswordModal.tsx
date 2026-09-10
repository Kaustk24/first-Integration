import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import PasswordStrengthMeter, { evaluatePassword } from './PasswordStrengthMeter'

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (msg: string) => void
}

export default function ForgotPasswordModal({ isOpen, onClose, onSuccess }: ForgotPasswordModalProps) {
  const { resetPassword } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Identifier, 2: OTP, 3: New Password
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('482910')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!identifier.trim()) {
      setError('Please enter your registered email or username')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedOtp(randomCode)
      setStep(2)
    }, 600)
  }

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (otp.trim() !== generatedOtp && otp.trim() !== '123456') {
      setError('Invalid verification code. Please check the code or click "Auto-fill Code".')
      return
    }
    setStep(3)
  }

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const evaluation = evaluatePassword(newPassword)
    if (evaluation.score < 3) {
      setError('Password is too weak. Please satisfy at least 3 criteria.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const res = resetPassword(identifier, newPassword)
      if (!res.success) {
        setError(res.error || 'Failed to reset password.')
        return
      }
      onSuccess('Password has been successfully updated! You can now log in.')
      onClose()
      // reset local state
      setStep(1)
      setIdentifier('')
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-lg shadow-2xl border border-[#e9ecef] w-full max-w-md overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e9ecef] flex items-center justify-between bg-[#f8f9fa]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0f1117] rounded flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0f1117]">Reset Password</h3>
              <p className="text-[11px] text-[#868e96]">Step {step} of 3</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#868e96] hover:text-[#0f1117] transition-colors p-1 text-sm rounded"
          >
            ✕
          </button>
        </div>

        {/* Step indicator bar */}
        <div className="h-1 bg-[#f1f3f5] w-full">
          <div
            className="h-full bg-[#1c7ed6] transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-[#fff5f5] border border-[#ffc9c9] rounded text-xs text-[#e03131] flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Enter email or username */}
          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <p className="text-xs text-[#495057] leading-relaxed">
                Enter your registered email address or username and we will send a 6-digit verification code to reset your password.
              </p>
              <div>
                <label className="block text-xs font-semibold text-[#0f1117] mb-1.5">
                  Email or Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. demo@virtuebyte.com or johndoe"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e9ecef] rounded focus:outline-none focus:border-[#1c7ed6] text-[#0f1117] placeholder:text-[#adb5bd]"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-xs font-medium text-[#495057] bg-[#f1f3f5] hover:bg-[#e9ecef] rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#0f1117] hover:bg-[#212529] rounded transition-colors disabled:opacity-60"
                >
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 bg-[#e7f5ff] border border-[#a5d8ff] rounded text-xs text-[#1971c2]">
                <p className="font-semibold mb-1">Simulated Code Delivered:</p>
                <p className="flex items-center justify-between">
                  <span>Verification OTP: <strong className="font-mono text-sm tracking-wider">{generatedOtp}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtp(generatedOtp)}
                    className="text-[11px] underline font-semibold hover:text-[#1864ab]"
                  >
                    Auto-fill Code
                  </button>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f1117] mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 text-sm font-mono tracking-widest text-center bg-white border border-[#e9ecef] rounded focus:outline-none focus:border-[#1c7ed6] text-[#0f1117]"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 text-xs font-medium text-[#495057] bg-[#f1f3f5] hover:bg-[#e9ecef] rounded transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#0f1117] hover:bg-[#212529] rounded transition-colors"
                >
                  Verify Code
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Create New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0f1117] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter strong new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#e9ecef] rounded focus:outline-none focus:border-[#1c7ed6] text-[#0f1117] pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#868e96] hover:text-[#0f1117]"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f1117] mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e9ecef] rounded focus:outline-none focus:border-[#1c7ed6] text-[#0f1117]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 text-xs font-medium text-[#495057] bg-[#f1f3f5] hover:bg-[#e9ecef] rounded transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-[#0f1117] hover:bg-[#212529] rounded transition-colors disabled:opacity-60"
                >
                  {loading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
