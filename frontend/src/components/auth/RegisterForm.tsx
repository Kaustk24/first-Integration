import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import PasswordStrengthMeter, { evaluatePassword } from './PasswordStrengthMeter'

interface RegisterFormProps {
  onNavigateToLogin: () => void
}

export default function RegisterForm({ onNavigateToLogin }: RegisterFormProps) {
  const { register } = useAuth()

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field] || errors.general) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        delete next.general
        return next
      })
    }
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    // Full Name
    if (!formData.fullName.trim()) {
      errs.fullName = 'Full Name is required.'
    } else if (formData.fullName.trim().length < 2) {
      errs.fullName = 'Full Name must be at least 2 characters.'
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      errs.email = 'Email is required.'
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.'
    }

    // Username
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!formData.username.trim()) {
      errs.username = 'Username is required.'
    } else if (!usernameRegex.test(formData.username.trim())) {
      errs.username = 'Username must be 3-20 characters (letters, numbers, underscores only).'
    }

    // Phone Number (+91)
    const rawPhone = formData.phone.trim().replace(/\D/g, '')
    if (!rawPhone) {
      errs.phone = 'Phone number is required.'
    } else if (rawPhone.length !== 10 || !/^[6-9]/.test(rawPhone)) {
      errs.phone = 'Enter a valid 10-digit Indian mobile number (e.g., 9876543210).'
    }

    // Password & Strength
    if (!formData.password) {
      errs.password = 'Password is required.'
    } else {
      const evaluation = evaluatePassword(formData.password)
      if (evaluation.score < 3) {
        errs.password = 'Please create a stronger password (satisfy at least 3 criteria).'
      }
    }

    // Confirm Password
    if (!formData.confirmPassword) {
      errs.confirmPassword = 'Confirm Password is required.'
    } else if (formData.password !== formData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setErrors({})

    setTimeout(() => {
      const res = register({
        fullName: formData.fullName,
        email: formData.email,
        username: formData.username,
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      })

      setIsSubmitting(false)
      if (!res.success) {
        setErrors({ general: res.error || 'Failed to create account.' })
      }
    }, 450)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
      {errors.general && (
        <div className="p-3 bg-[#fff5f5] border border-[#ffc9c9] rounded text-xs text-[#e03131] flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>{errors.general}</span>
        </div>
      )}

      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold text-[#0f1117] mb-1" htmlFor="reg-fullname">
          Full Name <span className="text-[#e03131]">*</span>
        </label>
        <input
          id="reg-fullname"
          type="text"
          placeholder="e.g. John Doe"
          value={formData.fullName}
          onChange={e => handleChange('fullName', e.target.value)}
          className={`w-full px-3 py-2 text-sm bg-white border rounded text-[#0f1117] placeholder:text-[#adb5bd] transition-colors focus:outline-none ${
            errors.fullName
              ? 'border-[#e03131] focus:border-[#e03131]'
              : 'border-[#e9ecef] focus:border-[#1c7ed6]'
          }`}
        />
        {errors.fullName && (
          <p className="text-[11px] text-[#e03131] mt-1 font-medium">{errors.fullName}</p>
        )}
      </div>

      {/* Email and Username 2-col row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#0f1117] mb-1" htmlFor="reg-email">
            Email <span className="text-[#e03131]">*</span>
          </label>
          <input
            id="reg-email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={e => handleChange('email', e.target.value)}
            className={`w-full px-3 py-2 text-sm bg-white border rounded text-[#0f1117] placeholder:text-[#adb5bd] transition-colors focus:outline-none ${
              errors.email
                ? 'border-[#e03131] focus:border-[#e03131]'
                : 'border-[#e9ecef] focus:border-[#1c7ed6]'
            }`}
          />
          {errors.email && (
            <p className="text-[11px] text-[#e03131] mt-1 font-medium">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#0f1117] mb-1" htmlFor="reg-username">
            Username <span className="text-[#e03131]">*</span>
          </label>
          <input
            id="reg-username"
            type="text"
            placeholder="johndoe24"
            value={formData.username}
            onChange={e => handleChange('username', e.target.value)}
            className={`w-full px-3 py-2 text-sm bg-white border rounded text-[#0f1117] placeholder:text-[#adb5bd] transition-colors focus:outline-none ${
              errors.username
                ? 'border-[#e03131] focus:border-[#e03131]'
                : 'border-[#e9ecef] focus:border-[#1c7ed6]'
            }`}
          />
          {errors.username && (
            <p className="text-[11px] text-[#e03131] mt-1 font-medium">{errors.username}</p>
          )}
        </div>
      </div>

      {/* Phone Number (+91) */}
      <div>
        <label className="block text-xs font-semibold text-[#0f1117] mb-1" htmlFor="reg-phone">
          Phone Number <span className="text-[#e03131]">*</span>
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3 text-xs font-semibold bg-[#f1f3f5] text-[#495057] border border-r-0 border-[#e9ecef] rounded-l select-none">
            🇮🇳 +91
          </span>
          <input
            id="reg-phone"
            type="tel"
            maxLength={10}
            placeholder="9876543210"
            value={formData.phone}
            onChange={e => handleChange('phone', e.target.value.replace(/\D/g, ''))}
            className={`flex-1 px-3 py-2 text-sm bg-white border rounded-r text-[#0f1117] placeholder:text-[#adb5bd] transition-colors focus:outline-none ${
              errors.phone
                ? 'border-[#e03131] focus:border-[#e03131]'
                : 'border-[#e9ecef] focus:border-[#1c7ed6]'
            }`}
          />
        </div>
        {errors.phone && (
          <p className="text-[11px] text-[#e03131] mt-1 font-medium">{errors.phone}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-semibold text-[#0f1117] mb-1" htmlFor="reg-password">
          Password <span className="text-[#e03131]">*</span>
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create strong password"
            value={formData.password}
            onChange={e => handleChange('password', e.target.value)}
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

        {/* Real-time Password Strength Validation */}
        <PasswordStrengthMeter password={formData.password} />
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-xs font-semibold text-[#0f1117] mb-1" htmlFor="reg-confirmpass">
          Confirm Password <span className="text-[#e03131]">*</span>
        </label>
        <div className="relative">
          <input
            id="reg-confirmpass"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Repeat password"
            value={formData.confirmPassword}
            onChange={e => handleChange('confirmPassword', e.target.value)}
            className={`w-full px-3 py-2 text-sm bg-white border rounded text-[#0f1117] placeholder:text-[#adb5bd] transition-colors focus:outline-none pr-10 ${
              errors.confirmPassword
                ? 'border-[#e03131] focus:border-[#e03131]'
                : 'border-[#e9ecef] focus:border-[#1c7ed6]'
            }`}
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            onClick={() => setShowConfirmPassword(p => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#868e96] hover:text-[#0f1117] p-1 transition-colors"
          >
            {showConfirmPassword ? (
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
        {errors.confirmPassword && (
          <p className="text-[11px] text-[#e03131] mt-1 font-medium">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Terms notice */}
      <p className="text-[11px] text-[#868e96] leading-relaxed">
        By registering, you agree to our Terms of Service, Trading Risk Disclosures, and Privacy Policy.
      </p>

      {/* Create Account Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 bg-[#0f1117] text-white text-sm font-semibold rounded hover:bg-[#212529] active:bg-[#000000] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs cursor-pointer mt-1"
      >
        {isSubmitting ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Creating Account...</span>
          </>
        ) : (
          <span>Create Account</span>
        )}
      </button>

      {/* Navigate to Login */}
      <div className="pt-3 text-center border-t border-[#e9ecef]">
        <p className="text-xs text-[#868e96]">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-[#0f1117] font-semibold hover:text-[#1c7ed6] hover:underline transition-colors"
          >
            Log In
          </button>
        </p>
      </div>
    </form>
  )
}
