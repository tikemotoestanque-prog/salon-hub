import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { yen, visitPrice, TODAY_ISO } from '../utils.js'

const PERIODS = [
  { key: 'thisMonth', label: '今月' },
  { key: 'lastMonth', label: '先月' },
  { key: 'all', label: '全期間' },
]

const monthPrefix = (offset = 0) => {
  const d = new Date(TODAY_ISO + 'T00:00:00')
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// n ヶ月前の日付（ISO）。VIPランキングの「直近n ヶ月」集計に使う
const monthsAgoISO = (n) => {
  const d = new Date(TODAY_ISO + 'T00:00:00')
  d.setMonth(d.getMonth() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const RANK_PERIODS = [
  { key: 'all', label: '全期間' },
  { key: '12m', label: '直近1年' },
  { key: '6m', label: '直近半年' },
]

const activeBtnStyle = { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }

export default function SalesLedger() {
  const { customers } = useStore()
  const nav = useNavigate()
  const [period, setPeriod] = useState('thisMonth')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [rankBy, setRankBy] = useState('spent') // 'spent'（累計金額順） | 'visits'（来店回数順）
  const [rankPeriod, setRankPeriod] = useState('all') // 'all' | '12m' | '6m'

  // 全顧客の施術履歴を1件ずつフラット化（売上台帳の元データ。経費・利益は持たない）
  const allEntries = useMemo(() => {
    const rows = []
    customers.forEach((c) => {
      ;(c.history || []).forEach((h) => {
        rows.push({
          date: h.date,
          staff: h.staff || '未設定',
          menu: h.menu || '（メニュー未記入）',
          price: visitPrice(h),
          customerId: c.id,
          customerName: c.name,
        })
      })
    })
    return rows
  }, [customers])

  const usingCustomRange = period === 'custom' && (customFrom || customTo)

  const entries = useMemo(() => {
    if (period === 'thisMonth') { const p = monthPrefix(0); return allEntries.filter((r) => r.date.startsWith(p)) }
    if (period === 'lastMonth') { const p = monthPrefix(-1); return allEntries.filter((r) => r.date.startsWith(p)) }
    if (usingCustomRange) return allEntries.filter((r) => (!customFrom || r.date >= customFrom) && (!customTo || r.date <= customTo))
    return allEntries
  }, [allEntries, period, customFrom, customTo, usingCustomRange])

  const summary = useMemo(() => {
    const total = entries.reduce((s, r) => s + r.price, 0)
    const count = entries.length
    return { total, count, avg: count ? Math.round(total / count) : 0 }
  }, [entries])

  const groupTotals = (list, keyFn) => {
    const map = new Map()
    list.forEach((r) => {
      const k = keyFn(r)
      const cur = map.get(k) || { count: 0, total: 0 }
      cur.count++; cur.total += r.price
      map.set(k, cur)
    })
    return [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.total - a.total)
  }

  const byDate = useMemo(() => groupTotals(entries, (r) => r.date).sort((a, b) => (a.key < b.key ? 1 : -1)), [entries])
  const byStaff = useMemo(() => groupTotals(entries, (r) => r.staff), [entries])
  const byMenu = useMemo(() => groupTotals(entries, (r) => r.menu), [entries])

  // VIPランキング：上部の期間フィルタ（今月/先月/全期間等）とは別に、
  // 「全期間」「直近1年」「直近半年」を切り替えられる。
  // 全期間は顧客レコードのtotalSpent/visitCount（集計済みの値）を使い、
  // 直近n ヶ月はallEntriesをその場で絞り込んで顧客ごとに再集計する。
  const rankedCustomers = useMemo(() => {
    if (rankPeriod === 'all') {
      const list = customers.map((c) => ({ id: c.id, name: c.name, visits: c.visitCount || 0, spent: c.totalSpent || 0 }))
      list.sort((a, b) => (rankBy === 'spent' ? b.spent - a.spent : b.visits - a.visits))
      return list.slice(0, 10)
    }
    const cutoff = monthsAgoISO(rankPeriod === '6m' ? 6 : 12)
    const map = new Map()
    allEntries.forEach((r) => {
      if (r.date < cutoff) return
      const cur = map.get(r.customerId) || { id: r.customerId, name: r.customerName, visits: 0, spent: 0 }
      cur.visits += 1
      cur.spent += r.price
      map.set(r.customerId, cur)
    })
    const list = [...map.values()]
    list.sort((a, b) => (rankBy === 'spent' ? b.spent - a.spent : b.visits - a.visits))
    return list.slice(0, 10)
  }, [customers, allEntries, rankBy, rankPeriod])

  const rankPeriodLabel = RANK_PERIODS.find((p) => p.key === rankPeriod)?.label || '全期間'

  const periodLabel = period === 'thisMonth' ? '今月'
    : period === 'lastMonth' ? '先月'
    : usingCustomRange ? `${customFrom || '〜'}〜${customTo || '〜'}`
    : '全期間'

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>売上台帳</h1>
          <p>施術記録の金額をもとに自動集計します（経費・利益の計算は含みません）</p>
        </div>
      </div>

      <div className="toolbar">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className="btn ghost sm"
            style={period === p.key ? activeBtnStyle : undefined}
            onClick={() => { setPeriod(p.key); setCustomFrom(''); setCustomTo('') }}
          >{p.label}</button>
        ))}
        <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPeriod('custom') }} style={{ flex: 'none', minWidth: 0 }} />
        <span style={{ color: 'var(--muted)', alignSelf: 'center' }}>〜</span>
        <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPeriod('custom') }} style={{ flex: 'none', minWidth: 0 }} />
      </div>

      <div className="kpi-row">
        <div className="card kpi">
          <div className="kpi-label">売上合計</div>
          <div className="kpi-val">{yen(summary.total)}</div>
          <div className="kpi-sub">{periodLabel}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">施術件数</div>
          <div className="kpi-val">{summary.count}<span className="u">件</span></div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">客単価（平均）</div>
          <div className="kpi-val">{yen(summary.avg)}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">対象期間</div>
          <div className="kpi-val" style={{ fontSize: 18 }}>{periodLabel}</div>
        </div>
      </div>

      <div className="dash-grid">
        {/* LEFT */}
        <div>
          <div className="card section">
            <h3>日別売上</h3>
            {byDate.length === 0 ? (
              <div className="empty">この期間の施術記録はありません</div>
            ) : byDate.map((r) => (
              <div className="target-row" key={r.key} style={{ cursor: 'default' }}>
                <div><div className="tname">{r.key}</div><div className="tsub">{r.count}件</div></div>
                <span className="tcta">{yen(r.total)}</span>
              </div>
            ))}
          </div>

          <div className="card section">
            <h3>メニュー別売上</h3>
            {byMenu.length === 0 ? (
              <div className="empty">この期間の施術記録はありません</div>
            ) : byMenu.map((r) => (
              <div className="target-row" key={r.key} style={{ cursor: 'default' }}>
                <div><div className="tname">{r.key}</div><div className="tsub">{r.count}件</div></div>
                <span className="tcta">{yen(r.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div>
          <div className="card section">
            <h3>スタッフ別売上</h3>
            {byStaff.length === 0 ? (
              <div className="empty">この期間の施術記録はありません</div>
            ) : byStaff.map((r) => (
              <div className="target-row" key={r.key} style={{ cursor: 'default' }}>
                <div><div className="tname">{r.key}</div><div className="tsub">{r.count}件</div></div>
                <span className="tcta">{yen(r.total)}</span>
              </div>
            ))}
          </div>

          <div className="card section">
            <h3>よく来る・よく使うお客様 トップ10</h3>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>常連さんへの特別対応の目印に。集計期間は下のボタンで切り替えられます（現在：{rankPeriodLabel}）。</p>
            <div className="toolbar" style={{ marginTop: 0, marginBottom: 6 }}>
              {RANK_PERIODS.map((p) => (
                <button key={p.key} className="btn ghost sm" style={rankPeriod === p.key ? activeBtnStyle : undefined} onClick={() => setRankPeriod(p.key)}>{p.label}</button>
              ))}
            </div>
            <div className="toolbar" style={{ marginTop: 0, marginBottom: 10 }}>
              <button className="btn ghost sm" style={rankBy === 'spent' ? activeBtnStyle : undefined} onClick={() => setRankBy('spent')}>累計金額順</button>
              <button className="btn ghost sm" style={rankBy === 'visits' ? activeBtnStyle : undefined} onClick={() => setRankBy('visits')}>来店回数順</button>
            </div>
            {rankedCustomers.length === 0 ? (
              <div className="empty">この期間の来店データがありません</div>
            ) : rankedCustomers.map((c, i) => (
              <div className="target-row" key={c.id} onClick={() => nav('/customer/' + c.id)}>
                <div>
                  <div className="tname">{i < 3 ? '🏆' : '　'} {i + 1}位　{c.name}</div>
                  <div className="tsub">来店 {c.visits || 0}回 / 累計 {yen(c.spent || 0)}</div>
                </div>
                <span className="tcta">カルテ →</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
