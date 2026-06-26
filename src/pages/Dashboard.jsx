import { useMemo, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { StatusBadge } from '../components/Badges.jsx'
import { RES_SOURCE_META } from '../data/sampleData.js'
import { yen, visitPrice, daysSince, TODAY, TODAY_ISO } from '../utils.js'

const WD = ['日', '月', '火', '水', '木', '金', '土']

export default function Dashboard() {
  const { customers, reservations, settings } = useStore()
  const nav = useNavigate()
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {})
  }, [])

  const markRead = async (id) => {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

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

    // 今日の予約一覧（キャンセル除く・時間順）
    const todayResList = reservations
      .filter((r) => r.date === TODAY_ISO && !r.cancelled)
      .sort((a, b) => a.start.localeCompare(b.start))
    const todayRes = todayResList.length

    // 今月誕生日のお客様
    const thisMonth = String(TODAY.getMonth() + 1).padStart(2, '0')
    const birthdayCustomers = customers
      .filter((c) => c.birthday && c.birthday.slice(5, 7) === thisMonth)
      .sort((a, b) => (a.birthday || '').slice(8).localeCompare((b.birthday || '').slice(8)))

    return { monthSales, monthVisits, todaySales, todayVisits, repeat, followup, statusCounts, srcCounts, resTotal, lineRate, lineTargets, todayRes, todayResList, birthdayCustomers }
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
            <h3>📅 本日の予約（{m.todayRes}件）</h3>
            {m.todayResList.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>本日の予約はありません</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {m.todayResList.map((r) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', background: 'var(--bg)', borderRadius: 6, cursor: 'pointer' }} onClick={() => nav('/timetable')}>
                    <span style={{ fontWeight: 700, fontSize: 13, minWidth: 48 }}>{r.start}</span>
                    <span style={{ flex: 1, fontSize: 13 }}>{r.customer}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.menu}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.staff}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mini-stats" style={{ marginTop: 12 }}>
              <div><b>{m.todayVisits}</b><span>来店済み</span></div>
              <div><b>{yen(m.todaySales)}</b><span>本日売上</span></div>
            </div>
            <Link className="link-btn" to="/timetable" style={{ marginTop: 10, display: 'inline-block' }}>予約タイムテーブルへ →</Link>
          </div>

          {m.birthdayCustomers.length > 0 && (
            <div className="card section">
              <h3>🎂 今月お誕生日のお客様（{m.birthdayCustomers.length}名）</h3>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>バースデークーポンやメッセージを送るチャンスです！</p>
              {m.birthdayCustomers.map((c) => (
                <div key={c.id} className="target-row" onClick={() => nav('/customer/' + c.id)}>
                  <div>
                    <div className="tname">{c.name}</div>
                    <div className="tsub">{c.birthday?.slice(5).replace('-', '/')} 生まれ / 来店 {c.visitCount}回</div>
                  </div>
                  <span className="tcta">カルテ →</span>
                </div>
              ))}
            </div>
          )}
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
            <h3>
              💬 LINEメッセージ通知
              {unreadCount > 0 && <span style={{ marginLeft: 8, background: '#d32f2f', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 12 }}>{unreadCount}件未読</span>}
            </h3>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>お客様からのLINEメッセージが届くとここに表示されます。</p>
            {notifications.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>まだメッセージはありません</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.slice(0, 10).map((n) => (
                  <div key={n.id} style={{ padding: '8px 10px', borderRadius: 8, background: n.read ? 'var(--bg)' : '#f0f9ff', border: `1px solid ${n.read ? '#eee' : '#90caf9'}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: n.read ? 400 : 700, fontSize: 13 }}>
                        {n.customer_name ? (
                          <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => nav('/customer/' + n.customer_id)}>{n.customer_name}</span>
                        ) : '未登録のお客様'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{n.created_at?.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#333' }}>{n.message}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #aaa', borderRadius: 4, background: 'none', cursor: 'pointer', color: '#555' }}>既読にする</button>
                      )}
                      <a href="https://chat.line.biz/account/@280vvwct" target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '2px 8px', border: '1px solid #06C755', borderRadius: 4, background: 'none', cursor: 'pointer', color: '#06C755', textDecoration: 'none' }}>LINEで返信 →</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
