import { useState, useRef, useEffect } from 'react'
import type { Company } from '../App'
import { NIFTY50_COMPANIES } from '../App'
import { useAuth } from '../context/AuthContext'

interface HeaderProps {
  selectedCompany: Company
  onSelectCompany: (company: Company) => void
  onMenuToggle: () => void
  onNavigateToProfile?: () => void
  onNavigateToAuth?: () => void
}

export default function Header({
  selectedCompany: _selectedCompany,
  onSelectCompany,
  onMenuToggle,
  onNavigateToProfile,
  onNavigateToAuth,
}: HeaderProps) {
  const { currentUser, logout, isAuthenticated } = useAuth()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  const filtered = query.length > 0
    ? NIFTY50_COMPANIES.filter(c =>
        c.ticker.toLowerCase().includes(query.toLowerCase()) ||
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : NIFTY50_COMPANIES

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="bg-white border-b border-[#e9ecef] px-4 py-3 flex items-center gap-4 shrink-0">
      <button
        className="lg:hidden p-1 text-[#495057] hover:text-[#0f1117]"
        onClick={onMenuToggle}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <rect y="3" width="20" height="1.5" rx="1" />
          <rect y="9.25" width="20" height="1.5" rx="1" />
          <rect y="15.5" width="20" height="1.5" rx="1" />
        </svg>
      </button>

      <div ref={ref} className="flex-1 max-w-xl relative">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adb5bd]" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search NIFTY 50 ticker or company (e.g., Tata Steel, Infosys)"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#f8f9fa] border border-[#e9ecef] rounded text-[#0f1117] placeholder:text-[#adb5bd] focus:outline-none focus:border-[#1c7ed6] focus:bg-white transition-colors"
          />
        </div>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e9ecef] rounded shadow-lg z-50 max-h-64 overflow-y-auto">
            {filtered.map(company => (
              <button
                key={company.ticker}
                onClick={() => {
                  onSelectCompany(company)
                  setQuery('')
                  setOpen(false)
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#f8f9fa] transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-[#0f1117]">{company.ticker}</span>
                  <span className="text-xs text-[#868e96] ml-2">{company.name}</span>
                </div>
                <span className={`text-xs font-mono font-medium ${company.changePct >= 0 ? 'text-[#2f9e44]' : 'text-[#e03131]'}`}>
                  {company.changePct >= 0 ? '+' : ''}{company.changePct.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2f9e44] animate-pulse" />
          <span className="text-xs text-[#495057] font-medium">Live</span>
        </div>
        <div className="h-3 w-px bg-[#e9ecef]" />
        <span className="text-xs text-[#868e96]">FYERS Connected</span>
      </div>

      {/* User Status / Profile Button */}
      <div ref={userRef} className="relative shrink-0 ml-auto sm:ml-0">
        {isAuthenticated && currentUser ? (
          <div>
            <button
              onClick={() => setUserDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-[#f8f9fa] border border-transparent hover:border-[#e9ecef] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#0f1117] text-white text-xs font-semibold flex items-center justify-center">
                {currentUser.avatarInitials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-[#0f1117] leading-none">{currentUser.fullName}</p>
                <p className="text-[10px] text-[#868e96] mt-0.5 leading-none">@{currentUser.username}</p>
              </div>
              <svg className="w-3 h-3 text-[#868e96]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-[#e9ecef] rounded shadow-lg z-50 py-1 text-xs">
                <div className="px-3 py-2 border-b border-[#e9ecef]">
                  <p className="font-semibold text-[#0f1117] truncate">{currentUser.fullName}</p>
                  <p className="text-[11px] text-[#868e96] truncate">{currentUser.email}</p>
                </div>
                {onNavigateToProfile && (
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false)
                      onNavigateToProfile()
                    }}
                    className="w-full text-left px-3 py-2 text-[#495057] hover:bg-[#f8f9fa] hover:text-[#0f1117] flex items-center gap-2"
                  >
                    <span>View Profile</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setUserDropdownOpen(false)
                    logout()
                  }}
                  className="w-full text-left px-3 py-2 text-[#e03131] hover:bg-[#fff5f5] flex items-center gap-2 border-t border-[#e9ecef]"
                >
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onNavigateToAuth}
            className="px-3 py-1.5 bg-[#0f1117] text-white text-xs font-semibold rounded hover:bg-[#212529] transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  )
}

