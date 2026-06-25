import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { StatusBadge } from '../components/Badges.jsx'
import { RES_SOURCE_META } from '../data/sampleData.js'
import { yen, visitPrice, daysSince, TODAY, TODAY_ISO } from '../utils.js'

const WD = ['日', '月', '火', '水', '木', '金', '土']

export default function Dashboard() {
  const { customers, reservations, settings } = useStore()
  const nav = useNavigate()

  const m = useMemo(() => {
    const monthPrefix = TODAY_ISO.slice(0, 7)
    let monthSales = 0, monthVisits = 0, todaySales = 0, todayVisits = 0
    customers.forEach((c) => (c.history || []).forEach((h) => {
      const p = visitPrice(h)
      if (h.date === TODAY_ISO) { todaySales += p; todayVisits++ }
      if (h.date.startsWith(monthPrefix)) { monthSales += p; monthVisits++ }
    }))
    const total = customers.length
    const repeat = total ? Math.round((customers.filter((c) => (c.visitCount || 0) >= 2).length / total) * 100) : 0
    const followupDays = settings.thresholds.followupDays
    const followup = customers.filter((c) => { const d = daysSince(c.lastVisit); return d != null && d >= followupDays }).length

    // ステータス内訳
    const statusCounts = {}
    Object.keys(settings.statuses).forEach((k) => { statusCounts[k] = 0 })
    customers.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1 })

    // 予約経路の内訳（全予約）
    const srcCounts = {}
    Object.keys(RES_SOURCE_META).forEach((k) => { srcCounts[k] = 0 })
    reservations.forEach((r) => { srcCounts[r.source] = (srcCounts[r.source] || 0) + 1 })
    const resTotal = reservations.length || 1
    const lineRate = Math.round(((srcCounts.line || 0) / resTotal) * 100)

    // LINE未活用の優良客（誘導対象）：LINE未連携で来店回数が多い順
    const lineTargets = customers
      .filter((c) => c.integrations?.line !== '連携済')
      .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
      .slice(0, 6)

    // 今日の予約
    const todayRes = reservations.filter((r) => r.date === TODAY_ISO).length

    return { monthSales, monthVisits, todaySales, todayVisits, repeat, followup, statusCounts, srcCounts, resTotal, lineRate, lineTargets, todayRes }
  }, [customers, reservations, settings])

  const today = new Date(TODAY_ISO + 'T00:00:00')
  const maxStatus = Math.max(1, ...Object.values(m.statusCounts))

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>ダッシュボード</h1>
          <p>{TODAY_ISO}（{WD[today.getDay()]}）時点 / お店の今の数字をひと目で</p>
        </div>
        <button className="btn ghost" onClick={() => nav('/lp')}>🌐 デモHPを見る</button>
      </div>

      <div className="kpi-row">
        <div className="card kpi">
          <div className="kpi-label">今月の売上（推定）</div>
          <div className="kpi-val">{yen(m.monthSales)}</div>
          <div className="kpi-sub">今日 {yen(m.todaySales)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">今月の来店数</div>
          <div className="kpi-val">{m.monthVisits}<span className="u">人</span></div>
          <div className="kpi-sub">今日 {m.todayVisits}人</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">リピート率</div>
          <div className="kpi-val">{m.repeat}<span className="u">%</span></div>
          <div className="kpi-sub">2回以上来店の割合</div>
        </div>
        <div className="card kpi alert" onClick={() => nav('/alerts')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label">フォロー漏れ</div>
          <div className="kpi-val">{m.followup}<span className="u">人</span></div>
          <div className="kpi-sub">{settings.thresholds.followupDays}日以上未来店 →</div>
        </div>
      </div>

      <div className="dash-grid">
        {/* LEFT */}
        <div>
          <div className="card section">
            <h3>👥 顧客ステータス内訳</h3>
            {Object.entries(settings.statuses).map(([k, meta]) => (
              <div className="bar-row" key={k}>
                <span className="bar-name">{meta.icon} {meta.label}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(m.statusCounts[k] / maxStatus) * 100}%`, background: meta.color }} /></div>
                <span className="bar-num">{m.statusCounts[k] || 0}</span>
              </div>
            ))}
            <Link className="link-btn" to="/customers" style={{ marginTop: 8, display: 'inline-block' }}>顧客一覧を見る →</Link>
          </div>

          <div className="card section">
            <h3>📅 今日の動き</h3>
            <div className="mini-stats">
              <div><b>{m.todayRes}</b><span>本日の予約</span></div>
              <div><b>{m.todayVisits}</b><span>本日の来店</span></div>
              <div><b>{yen(m.todaySales)}</b><span>本日の売上</span></div>
            </div>
            <Link className="link-btn" to="/timetable" style={{ marginTop: 10, display: 'inline-block' }}>予約タイムテーブルへ →</Link>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          <div className="card section">
            <h3>📲 予約のLINE化率</h3>
            <div className="line-rate">
              <div className="line-rate-num">{m.lineRate}<span>%</span></div>
              <div className="line-rate-cap">全予約のうち公式LINE経由の割合<br />（電話・HPBをLINEに寄せるほどコスト減＆囲い込み）</div>
            </div>
            {Object.entries(RES_SOURCE_META).map(([k, meta]) => (
              <div className="bar-row" key={k}>
                <span className="bar-name"><i className="src-dot" style={{ background: meta.bar }} />{meta.label}</span>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${((m.srcCounts[k] || 0) / m.resTotal) * 100}%`, background: meta.bar }} /></div>
                <span className="bar-num">{m.srcCounts[k] || 0}</span>
              </div>
            ))}
          </div>

          <div className="card section">
            <h3>🎯 LINE未活用の優良客（友だち追加の誘導対象）</h3>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>来店回数が多いのに公式LINE未連携の人。ここを友だち追加に繋げると、次回からLINEで自動リピート化できます。</p>
            {m.lineTargets.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>該当なし（みんなLINE連携済み）🎉</div>
            ) : m.lineTargets.map((c) => (
              <div className="target-row" key={c.id} onClick={() => nav('/customer/' + c.id)}>
                <div>
                  <div className="tname">{c.name} <StatusBadge status={c.status} /></div>
                  <div className="tsub">来店 {c.visitCount}回 / 累計 {yen(c.totalSpent)} / 担当 {c.assignedStaff || '未定'}</div>
                </div>
                <span className="tcta">LINE誘導 →</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
