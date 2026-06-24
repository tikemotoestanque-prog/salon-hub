import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { StatusBadge, SourceBadge } from '../components/Badges.jsx'
import { STATUS_META } from '../data/sampleData.js'
import { initials, daysSince, yen } from '../utils.js'

export default function CustomerList() {
  const { customers } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')

  const list = useMemo(() => {
    return customers.filter((c) => {
      const okStatus = status === 'all' || c.status === status
      const okQ = !q || (c.name + c.kana + c.lastMenu).toLowerCase().includes(q.toLowerCase())
      return okStatus && okQ
    })
  }, [customers, q, status])

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>顧客一覧</h1>
          <p>登録 {customers.length} 名 / 表示 {list.length} 名</p>
        </div>
        <button className="btn" onClick={() => nav('/new')}>＋ 新規顧客登録</button>
      </div>

      <div className="toolbar">
        <input placeholder="名前・カナ・メニューで検索" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">すべてのステータス</option>
          {Object.entries(STATUS_META).map(([k, m]) => (
            <option key={k} value={k}>{m.icon} {m.label}</option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="empty">該当する顧客がいません。</div>
      ) : (
        <div className="cust-grid">
          {list.map((c) => {
            const d = daysSince(c.lastVisit)
            return (
              <div key={c.id} className="card cust-card" onClick={() => nav('/customer/' + c.id)}>
                <div className="row1">
                  <div className="avatar">{initials(c.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="name">{c.name}</div>
                    <div className="kana">{c.kana}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="meta">
                  <SourceBadge source={c.source} />
                  <span className="pill">担当: {c.assignedStaff || '未定'}</span>
                </div>
                <div className="lastmenu">
                  <span className="lbl">前回メニュー</span>
                  {c.lastMenu || '（来店履歴なし）'}
                </div>
                <div className="stat-row">
                  <span>来店 <b>{c.visitCount}</b> 回</span>
                  <span>累計 <b>{yen(c.totalSpent)}</b></span>
                  <span>{d == null ? '未来店' : <>前回 <b>{d}</b> 日前</>}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
