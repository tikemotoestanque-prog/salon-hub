import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useStore } from './store.jsx'
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
import Settings from './pages/Settings.jsx'
import LandingPage from './pages/LandingPage.jsx'

export default function App() {
  const { resetData } = useStore()
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">✂️ SalonHub <small>顧客管理</small></div>
        <nav className="nav">
          <NavLink to="/" end>ダッシュボード</NavLink>
          <NavLink to="/timetable">予約TT</NavLink>
          <NavLink to="/customers">顧客一覧</NavLink>
          <NavLink to="/alerts">フォロー漏れ</NavLink>
          <NavLink to="/new">新規登録</NavLink>
          <NavLink to="/settings">設定</NavLink>
        </nav>
        <span className="spacer" />
        <button className="reset-btn" onClick={() => { if (confirm('サンプルデータに戻しますか？')) resetData() }}>
          データ初期化
        </button>
      </header>
      <main className="main">
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
          <Route path="/settings" element={<Settings />} />
          <Route path="/lp" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}
