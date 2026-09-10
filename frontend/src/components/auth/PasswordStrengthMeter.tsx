import React, { useMemo } from 'react'
import type { PasswordCriteria, PasswordStrengthLevel } from '../../types/auth'

interface PasswordStrengthMeterProps {
  password: string
}

export function evaluatePassword(password: string): {
  criteria: PasswordCriteria
  score: number
  level: PasswordStrengthLevel
  label: string
} {
  const criteria: PasswordCriteria = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }

  const passedCount = Object.values(criteria).filter(Boolean).length

  let level: PasswordStrengthLevel = 'weak'
  let label = 'Too Weak'

  if (password.length === 0) {
    return { criteria, score: 0, level: 'weak', label: 'Enter password' }
  }

  if (passedCount <= 2) {
    level = 'weak'
    label = 'Weak'
  } else if (passedCount === 3) {
    level = 'fair'
    label = 'Fair'
  } else if (passedCount === 4) {
    level = 'good'
    label = 'Good'
  } else if (passedCount === 5) {
    level = 'strong'
    label = 'Strong'
  }

  return { criteria, score: passedCount, level, label }
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const { criteria, score, level, label } = useMemo(() => evaluatePassword(password), [password])

  if (!password) return null

  const getBarColor = (index: number) => {
    if (index >= score) return 'bg-[#e9ecef]'
    switch (level) {
      case 'weak':
        return 'bg-[#e03131]'
      case 'fair':
        return 'bg-[#f59f00]'
      case 'good':
        return 'bg-[#1c7ed6]'
      case 'strong':
        return 'bg-[#2f9e44]'
    }
  }

  const getLabelColor = () => {
    switch (level) {
      case 'weak':
        return 'text-[#e03131]'
      case 'fair':
        return 'text-[#f59f00]'
      case 'good':
        return 'text-[#1c7ed6]'
      case 'strong':
        return 'text-[#2f9e44]'
    }
  }

  const checklist = [
    { label: 'At least 8 characters', met: criteria.minLength },
    { label: 'One uppercase letter (A-Z)', met: criteria.hasUpper },
    { label: 'One lowercase letter (a-z)', met: criteria.hasLower },
    { label: 'One number (0-9)', met: criteria.hasNumber },
    { label: 'One special symbol (!@#$%^&*)', met: criteria.hasSpecial },
  ]

  return (
    <div className="mt-2.5 space-y-2 text-xs">
      {/* Visual meter bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 grid grid-cols-5 gap-1.5 h-1.5">
          {[0, 1, 2, 3, 4].map(idx => (
            <div
              key={idx}
              className={`rounded-full transition-all duration-200 ${getBarColor(idx)}`}
            />
          ))}
        </div>
        <span className={`text-[11px] font-semibold tracking-wide uppercase ${getLabelColor()}`}>
          {label}
        </span>
      </div>

      {/* Criteria checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 bg-[#f8f9fa] p-2.5 rounded border border-[#e9ecef]">
        {checklist.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            {item.met ? (
              <svg className="w-3.5 h-3.5 text-[#2f9e44] shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.739a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
              </svg>
            ) : (
              <span className="w-3.5 h-3.5 flex items-center justify-center text-[#adb5bd] shrink-0 text-[10px]">
                ○
              </span>
            )}
            <span className={item.met ? 'text-[#0f1117] font-medium' : 'text-[#868e96]'}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
