import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { useStore } from './store.jsx'
import { useAuth } from './AuthContext.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CustomerList from './pages/CustomerList.jsx'
import CustomerDetail from './pages/CustomerDetail.jsx'
import Timetable from './pages/Timetable.jsx'
import FollowUpAlerts from './pages/FollowUpAlerts.jsx'
import NewCustomer from './pages/NewCustomer.jsx'
import EditCustomer from './pages/EditCustomer.jsx'
import CustomerMyPage from './pages/CustomerMyPage.jsx'
import CustomerPortal from './pages/CustomerPortal.jsx'
import TreatmentRecord from './pages/TreatmentRecord.jsx'
import CheckIn from './pages/CheckIn.jsx'
import Settings from './pages/Settings.jsx'
import LandingPage from './pages/LandingPage.jsx'
import GuestBooking from './pages/GuestBooking.jsx'
import AccessPage from './pages/AccessPage.jsx'
import MenuPage from './pages/MenuPage.jsx'
import LiffPage from './pages/LiffPage.jsx'

// お客様向け（管理画面のヘッダーを出さない独立ページ）
const CUSTOMER_PREFIXES = ['/lp', '/u/', '/book', '/access', '/menu', '/liff']

export default function App() {
  const { resetData } = useStore()
  const { session, signOut } = useAuth()
  const { pathname } = useLocation()
  const isCustomer = CUSTOMER_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))

  // 初期化中（session=undefined）はローディング表示
  if (session === undefined) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#888' }}>読み込み中…</div>
  }

  // お客様向けページは認証不要
  // 管理画面はログイン必須（Supabase未設定時はスルー）
  if (!isCustomer && session === null) {
    return <Login />
  }

  const routes = (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/customers" element={<CustomerList />} />
      <Route path="/customer/:id" element={<CustomerDetail />} />
      <Route path="/customer/:id/edit" element={<EditCustomer />} />
      <Route path="/m/:id" element={<CustomerMyPage />} />
      <Route path="/u/:id" element={<CustomerPortal />} />
      <Route path="/timetable" element={<Timetable />} />
      <Route path="/alerts" element={<FollowUpAlerts />} />
      <Route path="/new" element={<NewCustomer />} />
      <Route path="/record/:id" element={<TreatmentRecord />} />
      <Route path="/checkin" element={<CheckIn />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/lp" element={<LandingPage />} />
      <Route path="/book" element={<GuestBooking />} />
      <Route path="/access" element={<AccessPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/liff" element={<LiffPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )

  // お客様向けページは管理画面のガワ（ヘッダー等）なしの独立表示
  if (isCustomer) {
    return <div className="app customer-app">{routes}</div>
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">✂️ サロピ <small>顧客管理</small></div>
        <nav className="nav">
          <NavLink to="/" end>ダッシュボード</NavLink>
          <NavLink to="/timetable">予約TT</NavLink>
          <NavLink to="/checkin">チェックイン</NavLink>
          <NavLink to="/customers">顧客一覧</NavLink>
          <NavLink to="/alerts">フォロー漏れ</NavLink>
          <NavLink to="/new">新規登録</NavLink>
          <NavLink to="/settings">設定</NavLink>
        </nav>
        <span className="spacer" />
{session && (
          <button className="reset-btn" onClick={() => { if (confirm('ログアウトしますか？')) signOut() }} style={{ marginLeft: '0.5rem' }}>
            ログアウト
          </button>
        )}
      </header>
      <main className="main">{routes}</main>
    </div>
  )
}
