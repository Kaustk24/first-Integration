import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, LoginCredentials, RegisterData } from '../types/auth'
import { getUserProfile } from '../lib/api'

interface StoredAccount extends User {
  passwordHash: string // in a mock front-end app, we store plain/hashed mock password
}

interface AuthContextType {
  currentUser: User | null
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => { success: boolean; error?: string }
  register: (data: RegisterData) => { success: boolean; error?: string }
  logout: () => void
  resetPassword: (identifier: string, newPassword: string) => { success: boolean; error?: string }
  rememberedIdentifier: string
  setRememberedIdentifier: (val: string) => void
}

const STORAGE_USERS_KEY = 'n5_registered_users'
const STORAGE_ACTIVE_USER_ID = 'n5_active_user_id'
const STORAGE_REMEMBERED_KEY = 'n5_remembered_identifier'

const DEFAULT_DEMO_USER: StoredAccount = {
  id: 'usr_demo_trader',
  fullName: 'John Doe',
  email: 'demo@virtuebyte.com',
  username: 'johndoe',
  phone: '9876543210',
  passwordHash: 'Demo@1234',
  registeredAt: '2026-01-15T09:30:00.000Z',
  avatarInitials: 'JD',
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return 'TR'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<StoredAccount[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USERS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return [DEFAULT_DEMO_USER]
  })

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const activeId = localStorage.getItem(STORAGE_ACTIVE_USER_ID)
      if (activeId) {
        const raw = localStorage.getItem(STORAGE_USERS_KEY)
        const all: StoredAccount[] = raw ? JSON.parse(raw) : [DEFAULT_DEMO_USER]
        const found = all.find(u => u.id === activeId)
        if (found) {
          const { passwordHash: _, ...safeUser } = found
          return safeUser
        }
      }
    } catch {
      // ignore
    }
    return null
  })

  const [rememberedIdentifier, setRememberedIdentifierState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_REMEMBERED_KEY) || ''
    } catch {
      return ''
    }
  })

  // Persist users
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users))
    } catch {
      // ignore
    }
  }, [users])

  const setRememberedIdentifier = useCallback((val: string) => {
    setRememberedIdentifierState(val)
    try {
      if (val) {
        localStorage.setItem(STORAGE_REMEMBERED_KEY, val)
      } else {
        localStorage.removeItem(STORAGE_REMEMBERED_KEY)
      }
    } catch {
      // ignore
    }
  }, [])

  const login = useCallback(
    ({ identifier, password, rememberMe }: LoginCredentials) => {
      const trimmedId = identifier.trim().toLowerCase()
      const found = users.find(
        u => u.email.toLowerCase() === trimmedId || u.username.toLowerCase() === trimmedId
      )

      if (!found) {
        return { success: false, error: 'No account found with this email or username.' }
      }

      if (found.passwordHash !== password) {
        return { success: false, error: 'Incorrect password. Please try again.' }
      }

      if (rememberMe) {
        setRememberedIdentifier(identifier.trim())
      } else {
        setRememberedIdentifier('')
      }

      const { passwordHash: _, ...safeUser } = found
      setCurrentUser(safeUser)
      try {
        localStorage.setItem(STORAGE_ACTIVE_USER_ID, safeUser.id)
      } catch {
        // ignore
      }

      return { success: true }
    },
    [users, setRememberedIdentifier]
  )

  const register = useCallback(
    (data: RegisterData) => {
      const trimmedEmail = data.email.trim().toLowerCase()
      const trimmedUsername = data.username.trim().toLowerCase()
      const trimmedPhone = data.phone.trim().replace(/\D/g, '').slice(-10)

      if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
        return { success: false, error: 'An account with this email address already exists.' }
      }

      if (users.some(u => u.username.toLowerCase() === trimmedUsername)) {
        return { success: false, error: 'This username is already taken. Please pick another.' }
      }

      if (users.some(u => u.phone === trimmedPhone)) {
        return { success: false, error: 'This phone number is already registered.' }
      }

      const newUser: StoredAccount = {
        id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        username: data.username.trim(),
        phone: trimmedPhone,
        passwordHash: data.password,
        registeredAt: new Date().toISOString(),
        avatarInitials: computeInitials(data.fullName),
      }

      const updatedUsers = [...users, newUser]
      setUsers(updatedUsers)

      // Auto login newly registered user
      const { passwordHash: _, ...safeUser } = newUser
      setCurrentUser(safeUser)
      try {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updatedUsers))
        localStorage.setItem(STORAGE_ACTIVE_USER_ID, safeUser.id)
      } catch {
        // ignore
      }

      // Asynchronously initialize clean user profile in PostgreSQL database
      getUserProfile(safeUser.id, {
        fullName: safeUser.fullName,
        email: safeUser.email,
        username: safeUser.username,
        phone: safeUser.phone,
        avatarInitials: safeUser.avatarInitials,
      }).catch(err => console.warn('PostgreSQL auto-sync deferred:', err))

      return { success: true }
    },
    [users]
  )

  const resetPassword = useCallback(
    (identifier: string, newPassword: string) => {
      const trimmedId = identifier.trim().toLowerCase()
      const index = users.findIndex(
        u => u.email.toLowerCase() === trimmedId || u.username.toLowerCase() === trimmedId
      )

      if (index === -1) {
        return { success: false, error: 'No account found matching this identifier.' }
      }

      const updated = [...users]
      updated[index] = {
        ...updated[index],
        passwordHash: newPassword,
      }
      setUsers(updated)
      try {
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated))
      } catch {
        // ignore
      }

      return { success: true }
    },
    [users]
  )

  const logout = useCallback(() => {
    setCurrentUser(null)
    try {
      localStorage.removeItem(STORAGE_ACTIVE_USER_ID)
    } catch {
      // ignore
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        register,
        logout,
        resetPassword,
        rememberedIdentifier,
        setRememberedIdentifier,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
