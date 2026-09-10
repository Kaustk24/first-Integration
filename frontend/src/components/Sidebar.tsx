import type { Page } from '../App'
import { useAuth } from '../context/AuthContext'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  open: boolean
  onNavigateToAuth?: () => void
}

const navItems: { id: Page; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'trade-discovery', label: 'Trade Discovery' },
  { id: 'risk-management', label: 'Risk Management' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'profile', label: 'Profile' },
]

const modelStatus = {
  api: 'Connected',
}

export default function Sidebar({ currentPage, onNavigate, open, onNavigateToAuth }: SidebarProps) {
  const { currentUser, logout, isAuthenticated } = useAuth()

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-56 flex flex-col bg-white border-r border-[#e9ecef]
        transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#e9ecef]">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-6 h-6 bg-[#0f1117] rounded-sm flex items-center justify-center">
            <span className="text-white text-[10px] font-bold tracking-tight">N5</span>
          </div>
          <span className="text-sm font-bold text-[#0f1117] tracking-tight">NIFTY50-ML</span>
        </div>
        <p className="text-[10px] text-[#868e96] ml-8 tracking-wide uppercase">Trading Intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-left text-sm transition-colors
              ${currentPage === item.id
                ? 'bg-[#0f1117] text-white font-medium'
                : 'text-[#495057] hover:bg-[#f1f3f5] hover:text-[#0f1117]'
              }
            `}
          >
            <span className={`text-[8px] ${currentPage === item.id ? 'text-[#1c7ed6]' : 'text-[#adb5bd]'}`}>●</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User Section & Logout */}
      <div className="p-3 border-t border-[#e9ecef] space-y-3">
        {isAuthenticated && currentUser ? (
          <div className="bg-[#f8f9fa] border border-[#e9ecef] rounded p-2.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-[#0f1117] text-white rounded-full flex items-center justify-center text-xs font-semibold shrink-0">
                {currentUser.avatarInitials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-[#0f1117] truncate leading-tight">{currentUser.fullName}</p>
                <p className="text-[10px] text-[#868e96] truncate">@{currentUser.username}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onNavigate('profile')}
                className="flex-1 py-1 text-[11px] font-medium text-[#495057] hover:text-[#0f1117] bg-white border border-[#e9ecef] rounded hover:bg-[#f1f3f5] transition-colors text-center"
              >
                Profile
              </button>
              <button
                onClick={logout}
                className="flex-1 py-1 text-[11px] font-medium text-[#e03131] hover:text-[#c92a2a] bg-white border border-[#e9ecef] rounded hover:bg-[#fff5f5] transition-colors text-center"
              >
                Log Out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onNavigateToAuth}
            className="w-full py-2 bg-[#0f1117] text-white text-xs font-semibold rounded hover:bg-[#212529] transition-colors"
          >
            Sign In / Register
          </button>
        )}

        {/* Model Status */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-[#868e96]">API Status</span>
          <span className="flex items-center gap-1 text-[10px] text-[#2f9e44] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2f9e44] inline-block animate-pulse" />
            {modelStatus.api}
          </span>
        </div>
      </div>
    </aside>
  )
}

