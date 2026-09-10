import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getUserProfile,
  updateUserProfile,
} from '../lib/api'
import type {
  ProfileResponse,
  TradeHistoryItem,
} from '../types/api'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export default function Profile() {
  const { currentUser, logout } = useAuth()

  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    username: '',
    phone: '',
  })

  const loadProfileData = async () => {
    try {
      setLoading(true)
      const activeId = currentUser?.id || 'usr_demo_trader'
      const userMeta = currentUser ? {
        fullName: currentUser.fullName,
        email: currentUser.email,
        username: currentUser.username,
        phone: currentUser.phone,
        avatarInitials: currentUser.avatarInitials,
      } : undefined

      const profData = await getUserProfile(activeId, userMeta)
      setProfile(profData)
      setEditForm({
        fullName: profData.full_name,
        email: profData.email,
        username: profData.username,
        phone: profData.phone,
      })
    } catch (err) {
      console.error('Failed to load profile data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfileData()
  }, [currentUser?.id])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)
    try {
      const activeId = profile?.id || currentUser?.id || 'usr_demo_trader'
      const updated = await updateUserProfile(
        {
          full_name: editForm.fullName,
          email: editForm.email,
          username: editForm.username,
          phone: editForm.phone,
        },
        activeId,
      )
      setProfile(updated)
      setIsEditing(false)
      setFeedback('Profile updated successfully!')
      setTimeout(() => setFeedback(null), 4000)
    } catch (err: any) {
      setFeedback(`Failed to update profile: ${err.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  const isDemo = !currentUser || currentUser.id === 'usr_demo_trader'

  // Display fallbacks
  const displayName = profile?.full_name || currentUser?.fullName || (isDemo ? 'John Doe' : 'Trader')
  const displayEmail = profile?.email || currentUser?.email || (isDemo ? 'demo@virtuebyte.com' : '')
  const displayUsername = profile?.username
    ? `@${profile.username}`
    : (currentUser?.username ? `@${currentUser.username}` : (isDemo ? '@johndoe' : ''))
  const displayPhone = profile?.phone
    ? (profile.phone.startsWith('+') ? profile.phone : `+91 ${profile.phone}`)
    : (currentUser?.phone ? `+91 ${currentUser.phone}` : (isDemo ? '+91 9876543210' : ''))
  const initials = profile?.avatar_initials || currentUser?.avatarInitials || (isDemo ? 'JD' : 'TR')
  const memberSince = profile?.registered_at
    ? new Date(profile.registered_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : (isDemo ? 'Jan 2026' : 'Today')

  // Demo user retains demo stats; real account has 0 trades until purchased
  const totalTrades = profile?.stats?.total_trades ?? (isDemo ? 5 : 0)
  const winRate = profile?.stats?.win_rate_pct ?? (isDemo ? 66.7 : 0)
  const realizedPnl = profile?.stats?.total_realized_pnl ?? (isDemo ? 1337.0 : 0)
  const trades: TradeHistoryItem[] = profile?.recent_trades ?? []

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#0f1117]">User Profile</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#1971c2] hover:text-white hover:bg-[#1971c2] border border-[#a5d8ff] rounded transition-colors"
          >
            Edit Profile
          </button>
          {currentUser && (
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-semibold text-[#e03131] hover:text-white hover:bg-[#e03131] border border-[#ffc9c9] rounded transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-3 text-xs font-medium rounded border ${
          feedback.includes('Failed') ? 'bg-[#fff5f5] text-[#e03131] border-[#ffc9c9]' : 'bg-[#ebfbee] text-[#2f9e44] border-[#b2f2bb]'
        }`}>
          {feedback}
        </div>
      )}

      {/* User Info Card */}
      <div className="bg-white border border-[#e9ecef] rounded p-6 flex flex-col md:flex-row md:items-center gap-6 shadow-xs">
        <div className="w-16 h-16 bg-[#0f1117] rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white text-xl font-bold tracking-tight">{initials}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[#0f1117]">{displayName}</h2>
            <span className="text-[10px] px-2 py-0.5 bg-[#ebfbee] text-[#2f9e44] font-medium rounded">
              Verified Trader
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#868e96]">
            <span>{displayEmail}</span>
            <span>•</span>
            <span>{displayUsername}</span>
            <span>•</span>
            <span>{displayPhone}</span>
            <span>•</span>
            <span>Member since {memberSince}</span>
          </div>
        </div>

        <div className="md:ml-auto flex gap-6 text-center">
          <div>
            <p className="text-[10px] text-[#868e96] uppercase tracking-widest font-medium">Total Trades</p>
            <p className="text-lg font-semibold text-[#0f1117] mt-1">{totalTrades}</p>
          </div>
        </div>
      </div>

      {/* Trade History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#0f1117]">
            {isDemo ? 'Demo Trade History' : 'Your Trade History'}
          </h2>
          <span className="text-xs text-[#868e96]">{trades.length} recorded trade{trades.length === 1 ? '' : 's'}</span>
        </div>

        <div className="bg-white border border-[#e9ecef] rounded overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#f8f9fa] border-b border-[#e9ecef]">
                <tr>
                  <th className="px-4 py-3 font-medium text-[#495057]">Date</th>
                  <th className="px-4 py-3 font-medium text-[#495057]">Ticker</th>
                  <th className="px-4 py-3 font-medium text-[#495057]">Type</th>
                  <th className="px-4 py-3 font-medium text-[#495057]">Qty</th>
                  <th className="px-4 py-3 font-medium text-[#495057]">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9ecef]">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#868e96] text-xs">
                      No trade history recorded yet. You have not purchased anything yet.
                    </td>
                  </tr>
                ) : (
                  trades.map((trade, idx) => (
                    <tr key={`${trade.ticker}-${trade.date}-${trade.created_at || idx}`} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="px-4 py-3 text-[#495057] font-mono text-xs">{trade.date}</td>
                      <td className="px-4 py-3 font-medium text-[#0f1117]">{trade.ticker}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                          trade.type === 'BUY' ? 'bg-[#ebfbee] text-[#2f9e44]' : 'bg-[#fff5f5] text-[#e03131]'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#0f1117]">{trade.qty}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#0f1117]">₹{fmt(trade.price)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-[#e9ecef]">
            <h3 className="text-base font-bold text-[#0f1117] mb-1">Edit Profile Details</h3>
            <p className="text-xs text-[#868e96] mb-4">Updates will be saved directly into PostgreSQL (`user_profiles`).</p>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[#495057] mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-[#ced4da] rounded focus:outline-hidden focus:border-[#1971c2]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#495057] mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-[#ced4da] rounded focus:outline-hidden focus:border-[#1971c2]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#495057] mb-1">Username</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-[#ced4da] rounded focus:outline-hidden focus:border-[#1971c2]"
                />
              </div>
              <div>
                <label className="block font-medium text-[#495057] mb-1">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-[#ced4da] rounded focus:outline-hidden focus:border-[#1971c2]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#e9ecef]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 font-semibold text-[#495057] hover:bg-[#f1f3f5] rounded border border-[#ced4da]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 font-semibold text-white bg-[#1971c2] hover:bg-[#1864ab] rounded transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
