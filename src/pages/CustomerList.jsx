import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { StatusBadge, SourceBadge } from '../components/Badges.jsx'
import { initials, daysSince, yen } from '../utils.js'

export default function CustomerList() {
  const { customers, settings } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  // ステータス（自動）とタグ（手動）を1つの絞り込みプルダウンにまとめる。
  // 値は 'all' | 'status:<key>' | 'tag:<name>'
  const [filter, setFilter] = useState('all')

  const list = useMemo(() => {
    return customers.filter((c) => {
      let okFilter = true
      if (filter.startsWith('status:')) okFilter = c.status === filter.slice(7)
      else if (filter.startsWith('tag:')) okFilter = (c.tags || []).includes(filter.slice(4))
      const okQ = !q || (c.name + c.kana + c.lastMenu).toLowerCase().includes(q.toLowerCase())
      return okFilter && okQ
    })
  }, [customers, q, filter])

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
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">すべて（ステータス・タグ）</option>
          <optgroup label="🔒 ステータス（自動）">
            {Object.entries(settings.statuses).map(([k, m]) => (
              <option key={'status:' + k} value={'status:' + k}>{m.icon} {m.label}</option>
            ))}
          </optgroup>
          {settings.tags && settings.tags.length > 0 && (
            <optgroup label="🏷 タグ（手動）">
              {settings.tags.map((t) => <option key={'tag:' + t} value={'tag:' + t}>🏷 {t}</option>)}
            </optgroup>
          )}
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
                  {(c.tags || []).map((t) => <span key={t} className="pill" style={{ background: '#e7f2ea', color: '#2f6b46', borderColor: '#bfe0cb' }}>🏷 {t}</span>)}
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
