export interface User {
  id: string
  fullName: string
  email: string
  username: string
  phone: string
  registeredAt: string
  avatarInitials: string
}

export interface LoginCredentials {
  identifier: string // email or username
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  fullName: string
  email: string
  username: string
  phone: string
  password: string
  confirmPassword: string
}

export interface PasswordCriteria {
  minLength: boolean
  hasUpper: boolean
  hasLower: boolean
  hasNumber: boolean
  hasSpecial: boolean
}

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong'
