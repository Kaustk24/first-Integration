import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import TradeDiscovery from './pages/TradeDiscovery'
import RiskManagement from './pages/RiskManagement'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'
import AuthPage from './pages/AuthPage'
import { AuthProvider, useAuth } from './context/AuthContext'

export type Page = 'dashboard' | 'trade-discovery' | 'risk-management' | 'analytics' | 'profile' | 'auth'

export interface Company {
  ticker: string
  name: string
  sector: string
  price: number
  change: number
  changePct: number
}

export interface TradeInputs {
  ticker: string
  qty: number
  limitPrice: number
}

export const NIFTY50_COMPANIES: Company[] = [
  { ticker: 'ADANIENT', name: 'Adani Enterprises', sector: 'Metals & Mining', price: 2306.20, change: -175.80, changePct: -7.09 },
  { ticker: 'ADANIPORTS', name: 'Adani Ports', sector: 'Services', price: 1045.50, change: 12.30, changePct: 1.19 },
  { ticker: 'APOLLOHOSP', name: 'Apollo Hospitals', sector: 'Healthcare', price: 5430.15, change: -23.45, changePct: -0.43 },
  { ticker: 'ASIANPAINT', name: 'Asian Paints', sector: 'Consumer Durables', price: 2890.65, change: 15.20, changePct: 0.53 },
  { ticker: 'AXISBANK', name: 'Axis Bank', sector: 'Banking', price: 1067.85, change: -5.40, changePct: -0.50 },
  { ticker: 'BAJAJ-AUTO', name: 'Bajaj Auto', sector: 'Automobile', price: 7120.30, change: 85.40, changePct: 1.21 },
  { ticker: 'BAJFINANCE', name: 'Bajaj Finance', sector: 'NBFC', price: 7218.40, change: 112.60, changePct: 1.59 },
  { ticker: 'BAJAJFINSV', name: 'Bajaj Finserv', sector: 'NBFC', price: 1540.25, change: 18.50, changePct: 1.22 },
  { ticker: 'BEL', name: 'Bharat Electronics', sector: 'Capital Goods', price: 189.40, change: 2.10, changePct: 1.12 },
  { ticker: 'BPCL', name: 'Bharat Petroleum', sector: 'Energy', price: 560.15, change: -8.30, changePct: -1.46 },
  { ticker: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecommunication', price: 1125.80, change: 10.45, changePct: 0.94 },
  { ticker: 'BRITANNIA', name: 'Britannia', sector: 'FMCG', price: 5120.90, change: -35.60, changePct: -0.69 },
  { ticker: 'CIPLA', name: 'Cipla', sector: 'Healthcare', price: 1345.60, change: 14.80, changePct: 1.11 },
  { ticker: 'COALINDIA', name: 'Coal India', sector: 'Metals & Mining', price: 345.75, change: 5.25, changePct: 1.54 },
  { ticker: 'DIVISLAB', name: 'Divis Labs', sector: 'Healthcare', price: 3890.45, change: -45.20, changePct: -1.15 },
  { ticker: 'DRREDDY', name: "Dr. Reddy's Labs", sector: 'Healthcare', price: 5670.30, change: 25.40, changePct: 0.45 },
  { ticker: 'EICHERMOT', name: 'Eicher Motors', sector: 'Automobile', price: 4892.35, change: 48.15, changePct: 0.99 },
  { ticker: 'GRASIM', name: 'Grasim', sector: 'Construction Materials', price: 2150.80, change: 18.90, changePct: 0.89 },
  { ticker: 'HCLTECH', name: 'HCL Tech', sector: 'IT', price: 1580.45, change: -12.30, changePct: -0.77 },
  { ticker: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', price: 1812.75, change: 14.25, changePct: 0.79 },
  { ticker: 'HDFCLIFE', name: 'HDFC Life', sector: 'Financial Services', price: 615.30, change: 5.40, changePct: 0.89 },
  { ticker: 'HEROMOTOCO', name: 'Hero MotoCorp', sector: 'Automobile', price: 4560.90, change: -25.60, changePct: -0.56 },
  { ticker: 'HINDALCO', name: 'Hindalco', sector: 'Metals & Mining', price: 580.25, change: 8.45, changePct: 1.48 },
  { ticker: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', price: 2345.60, change: -15.80, changePct: -0.67 },
  { ticker: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', price: 1342.85, change: 8.45, changePct: 0.63 },
  { ticker: 'INDUSINDBK', name: 'IndusInd Bank', sector: 'Banking', price: 1456.70, change: 22.30, changePct: 1.55 },
  { ticker: 'INFY', name: 'Infosys', sector: 'IT', price: 1894.30, change: 31.70, changePct: 1.70 },
  { ticker: 'ITC', name: 'ITC', sector: 'FMCG', price: 412.50, change: 2.10, changePct: 0.51 },
  { ticker: 'JSWSTEEL', name: 'JSW Steel', sector: 'Metals & Mining', price: 825.40, change: -12.50, changePct: -1.49 },
  { ticker: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking', price: 1780.60, change: -8.90, changePct: -0.50 },
  { ticker: 'LT', name: 'Larsen & Toubro', sector: 'Capital Goods', price: 3450.25, change: 45.60, changePct: 1.34 },
  { ticker: 'LTIM', name: 'LTIMindtree', sector: 'IT', price: 5120.80, change: -56.30, changePct: -1.09 },
  { ticker: 'M&M', name: 'Mahindra & Mahindra', sector: 'Automobile', price: 1890.45, change: 15.20, changePct: 0.81 },
  { ticker: 'MARUTI', name: 'Maruti Suzuki', sector: 'Automobile', price: 10560.75, change: -120.40, changePct: -1.13 },
  { ticker: 'NESTLEIND', name: 'Nestle India', sector: 'FMCG', price: 2540.30, change: 18.50, changePct: 0.73 },
  { ticker: 'NTPC', name: 'NTPC', sector: 'Power', price: 325.60, change: 4.20, changePct: 1.31 },
  { ticker: 'ONGC', name: 'ONGC', sector: 'Oil & Gas', price: 260.45, change: 2.80, changePct: 1.09 },
  { ticker: 'POWERGRID', name: 'Power Grid', sector: 'Power', price: 280.15, change: -3.40, changePct: -1.20 },
  { ticker: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', price: 2981.45, change: 22.30, changePct: 0.75 },
  { ticker: 'SBILIFE', name: 'SBI Life', sector: 'Financial Services', price: 1450.60, change: 12.30, changePct: 0.86 },
  { ticker: 'SBIN', name: 'State Bank of India', sector: 'Banking', price: 745.25, change: 5.60, changePct: 0.76 },
  { ticker: 'SHRIRAMFIN', name: 'Shriram Finance', sector: 'NBFC', price: 2340.50, change: 45.20, changePct: 1.97 },
  { ticker: 'SUNPHARMA', name: 'Sun Pharma', sector: 'Healthcare', price: 1560.80, change: -18.40, changePct: -1.17 },
  { ticker: 'TATACONSUM', name: 'Tata Consumer', sector: 'FMCG', price: 1120.45, change: 8.50, changePct: 0.76 },
  { ticker: 'TATAMOTORS', name: 'Tata Motors', sector: 'Automobile', price: 980.30, change: 14.20, changePct: 1.47 },
  { ticker: 'TATASTEEL', name: 'Tata Steel', sector: 'Metals & Mining', price: 162.45, change: -2.15, changePct: -1.31 },
  { ticker: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', price: 3742.10, change: -18.60, changePct: -0.49 },
  { ticker: 'TECHM', name: 'Tech Mahindra', sector: 'IT', price: 1250.60, change: -8.40, changePct: -0.67 },
  { ticker: 'TITAN', name: 'Titan', sector: 'Consumer Durables', price: 3450.25, change: 25.60, changePct: 0.75 },
  { ticker: 'TRENT', name: 'Trent', sector: 'Consumer Services', price: 3890.15, change: 55.40, changePct: 1.44 },
  { ticker: 'ULTRACEMCO', name: 'UltraTech Cement', sector: 'Construction Materials', price: 9850.40, change: -120.50, changePct: -1.21 },
  { ticker: 'WIPRO', name: 'Wipro', sector: 'IT', price: 543.20, change: -4.80, changePct: -0.88 },
]

function AppContent() {
  const { isAuthenticated } = useAuth()
  const [page, setPage] = useState<Page>('dashboard')
  const [guestMode, setGuestMode] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company>(NIFTY50_COMPANIES[0])
  const [tradeInputs, setTradeInputs] = useState<TradeInputs>({
    ticker: NIFTY50_COMPANIES[0].ticker,
    qty: 1,
    limitPrice: NIFTY50_COMPANIES[0].price,
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigateTo = useCallback((p: Page) => {
    setPage(p)
    setSidebarOpen(false)
  }, [])

  const selectCompany = useCallback((company: Company) => {
    setSelectedCompany(company)
    setTradeInputs(prev => ({ ...prev, ticker: company.ticker, limitPrice: company.price }))
  }, [])

  const analyzeMyTrade = useCallback((inputs: TradeInputs) => {
    setTradeInputs(inputs)
    const company = NIFTY50_COMPANIES.find(c => c.ticker === inputs.ticker)
    if (company) setSelectedCompany(company)
    navigateTo('risk-management')
  }, [navigateTo])

  // If user is not authenticated and has not opted for guest preview, show AuthPage
  if (!isAuthenticated && !guestMode) {
    return (
      <AuthPage
        initialMode="login"
        onSkipToDashboard={() => setGuestMode(true)}
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9fa]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        currentPage={page}
        onNavigate={navigateTo}
        open={sidebarOpen}
        onNavigateToAuth={() => setGuestMode(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          selectedCompany={selectedCompany}
          onSelectCompany={selectCompany}
          onMenuToggle={() => setSidebarOpen(o => !o)}
          onNavigateToProfile={() => navigateTo('profile')}
          onNavigateToAuth={() => setGuestMode(false)}
        />

        <main className="flex-1 overflow-y-auto">
          {page === 'dashboard' && (
            <Dashboard
              selectedCompany={selectedCompany}
              onSelectCompany={selectCompany}
              onNavigate={navigateTo}
            />
          )}
          {page === 'trade-discovery' && (
            <TradeDiscovery
              selectedCompany={selectedCompany}
              tradeInputs={tradeInputs}
              onAnalyze={analyzeMyTrade}
            />
          )}
          {page === 'risk-management' && (
            <RiskManagement
              selectedCompany={selectedCompany}
              tradeInputs={tradeInputs}
              onNavigate={navigateTo}
            />
          )}
          {page === 'analytics' && (
            <Analytics selectedCompany={selectedCompany} onSelectCompany={selectCompany} />
          )}
          {page === 'profile' && (
            <Profile />
          )}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

