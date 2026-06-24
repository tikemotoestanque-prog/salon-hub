import { useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { StatusBadge, SourceBadge } from '../components/Badges.jsx'
import { daysSince } from '../utils.js'

const THRESHOLD = 60

export default function FollowUpAlerts() {
  const { customers } = useStore()
  const nav = useNavigate()

  const alerts = customers
    .map((c) => ({ c, days: daysSince(c.lastVisit) }))
    .filter((x) => x.days != null && x.days >= THRESHOLD)
    .sort((a, b) => b.days - a.days)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>フォロー漏れアラート</h1>
          <p>最終来店から {THRESHOLD} 日以上経過した顧客：{alerts.length} 名</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="empty">フォロー漏れの顧客はいません 🎉</div>
      ) : (
        alerts.map(({ c, days }) => (
          <div
            key={c.id}
            className={'card alert-card ' + (days >= 90 ? 'lv-high' : 'lv-mid')}
            onClick={() => nav('/customer/' + c.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="alert-days">
              <div className="n" style={{ color: days >= 90 ? '#d64545' : '#e08a1e' }}>{days}</div>
              <div className="l">日経過</div>
            </div>
            <div className="alert-info">
              <div className="nm">{c.name} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>{c.kana}</span></div>
              <div className="sub">最終来店 {c.lastVisit} / 前回: {c.lastMenu} / 担当 {c.assignedStaff || '未定'}</div>
              <div className="meta" style={{ marginTop: 6 }}>
                <StatusBadge status={c.status} />
                <SourceBadge source={c.source} />
                <span className="pill">{c.phone}</span>
              </div>
            </div>
            <button className="btn ghost" onClick={(e) => { e.stopPropagation(); nav('/customer/' + c.id) }}>詳細</button>
          </div>
        ))
      )}
    </div>
  )
}
