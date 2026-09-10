import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

interface LoginFormProps {
  onNavigateToRegister: () => void
  onOpenForgotPassword: () => void
  onSuccessNotice?: string
}

export default function LoginForm({
  onNavigateToRegister,
  onOpenForgotPassword,
  onSuccessNotice,
}: LoginFormProps) {
  const { login, rememberedIdentifier } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-fill remembered identifier if present
  useEffect(() => {
    if (rememberedIdentifier) {
      setIdentifier(rememberedIdentifier)
      setRememberMe(true)
    }
  }, [rememberedIdentifier])

  const validate = (): boolean => {
    const errs: typeof errors = {}
    if (!identifier.trim()) {
      errs.identifier = 'Email or username is required.'
    }
    if (!password) {
      errs.password = 'Password is required.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setErrors({})

    // Small delay to provide nice responsive feeling
    setTimeout(() => {
      const res = login({ identifier: identifier.trim(), password, rememberMe })
      setIsSubmitting(false)
      if (!res.success) {
        setErrors({ general: res.error || 'Invalid credentials. Please verify and try again.' })
      }
    }, 400)
  }

  const handleFillDemo = () => {
    setIdentifier('demo@virtuebyte.com')
    setPassword('Demo@1234')
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {onSuccessNotice && (
        <div className="p-3 bg-[#ebfbee] border border-[#b2f2bb] rounded text-xs text-[#2b8a3e] flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          <span>{onSuccessNotice}</span>
        </div>
      )}

      {errors.general && (
        <div className="p-3 bg-[#fff5f5] border border-[#ffc9c9] rounded text-xs text-[#e03131] flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>{errors.general}</span>
        </div>
      )}

      {/* Email / Username field */}
      <div>
        <label className="block text-xs font-semibold text-[#0f1117] mb-1.5" htmlFor="login-identifier">
          Email or Username <span className="text-[#e03131]">*</span>
        </label>
        <div className="relative">
          <input
            id="login-identifier"
            type="text"
            placeholder="name@company.com or username"
            value={identifier}
            onChange={e => {
              setIdentifier(e.target.value)
              if (errors.identifier) setErrors(prev => ({ ...prev, identifier: undefined }))
            }}
            className={`w-full px-3 py-2 text-sm bg-white border rounded text-[#0f1117] placeholder:text-[#adb5bd] transition-colors focus:outline-none ${
              errors.identifier
                ? 'border-[#e03131] focus:border-[#e03131]'
                : 'border-[#e9ecef] focus:border-[#1c7ed6]'
            }`}
          />
        </div>
        {errors.identifier && (
          <p className="text-[11px] text-[#e03131] mt-1 font-medium">{errors.identifier}</p>
        )}
      </div>

      {/* Password field */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-[#0f1117]" htmlFor="login-password">
            Password <span className="text-[#e03131]">*</span>
          </label>
          <button
            type="button"
            onClick={onOpenForgotPassword}
            className="text-xs text-[#1c7ed6] hover:text-[#1864ab] font-medium hover:underline transition-colors"
          >
            Forgot Password?
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={e => {
              setPassword(e.target.value)
              if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
            }}
            className={`w-full px-3 py-2 text-sm bg-white border rounded text-[#0f1117] placeholder:text-[#adb5bd] transition-colors focus:outline-none pr-10 ${
              errors.password
                ? 'border-[#e03131] focus:border-[#e03131]'
                : 'border-[#e9ecef] focus:border-[#1c7ed6]'
            }`}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#868e96] hover:text-[#0f1117] p-1 transition-colors"
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
        {errors.password && (
          <p className="text-[11px] text-[#e03131] mt-1 font-medium">{errors.password}</p>
        )}
      </div>

      {/* Remember Me */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={e => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-[#ced4da] text-[#0f1117] focus:ring-[#1c7ed6] accent-[#0f1117]"
          />
          <span className="text-xs text-[#495057]">Remember Me</span>
        </label>

        {/* Demo Account Helper */}
        <button
          type="button"
          onClick={handleFillDemo}
          className="text-[11px] font-semibold text-[#868e96] hover:text-[#0f1117] flex items-center gap-1 bg-[#f8f9fa] border border-[#e9ecef] px-2 py-1 rounded hover:bg-[#f1f3f5] transition-colors"
          title="Fills demo credentials: demo@virtuebyte.com / Demo@1234"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#2f9e44]" />
          Fill Demo Account
        </button>
      </div>

      {/* Login Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 bg-[#0f1117] text-white text-sm font-semibold rounded hover:bg-[#212529] active:bg-[#000000] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Signing In...</span>
          </>
        ) : (
          <span>Login</span>
        )}
      </button>

      {/* Navigate to Register */}
      <div className="pt-3 text-center border-t border-[#e9ecef]">
        <p className="text-xs text-[#868e96]">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="text-[#0f1117] font-semibold hover:text-[#1c7ed6] hover:underline transition-colors"
          >
            Create Account
          </button>
        </p>
      </div>
    </form>
  )
}
