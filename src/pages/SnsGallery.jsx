import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { daysSince } from '../utils.js'

// 施術記録の「SNS掲載に同意（任意）」チェックが付いた写真だけを集めて一覧表示する。
// TreatmentRecord.jsx で撮影のたびにsnsConsentが写真のメタデータとして保存されるので、
// ここでは全顧客のhistoryを横断的に見て、同意済みの写真だけを抽出するだけでよい
// （新規APIは不要・ストアに読み込み済みのデータだけで完結する）。

const PERIODS = [
  { key: 'all', label: '全期間' },
  { key: '30', label: '直近30日' },
  { key: '90', label: '直近90日' },
]

export default function SnsGallery() {
  const { customers } = useStore()
  const [period, setPeriod] = useState('all')
  const [menuFilter, setMenuFilter] = useState('all')

  const entries = useMemo(() => {
    const list = []
    customers.forEach((c) => {
      ;(c.history || []).forEach((h, idx) => {
        const consented = (h.photos || []).filter((p) => p.snsConsent)
        if (consented.length === 0) return
        list.push({
          key: c.id + '-' + h.date + '-' + idx,
          customerId: c.id,
          customerName: c.name,
          date: h.date,
          staff: h.staff,
          menu: h.menu,
          photos: consented,
        })
      })
    })
    return list.sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [customers])

  const menus = useMemo(() => [...new Set(entries.map((e) => e.menu).filter(Boolean))], [entries])

  const filtered = entries.filter((e) => {
    if (period !== 'all') {
      const days = daysSince(e.date)
      if (days == null || days > Number(period)) return false
    }
    if (menuFilter !== 'all' && e.menu !== menuFilter) return false
    return true
  })

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>📸 SNS素材ギャラリー</h1>
          <p>お客様の同意を得たBefore/After写真だけを一覧できます。まとめリール等の素材探しにご利用ください（同意済み {entries.length} 件）。</p>
        </div>
      </div>

      <div className="toolbar">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        {menus.length > 0 && (
          <select value={menuFilter} onChange={(e) => setMenuFilter(e.target.value)}>
            <option value="all">すべてのメニュー</option>
            {menus.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          SNS掲載に同意した写真はまだありません。<br />
          施術記録の入力時に「SNS掲載に同意」にチェックを入れると、ここに表示されます。
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((entry) => (
            <div className="card section" key={entry.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {entry.customerName}
                    <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{entry.date} / 担当 {entry.staff || '未定'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{entry.menu}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {entry.photos.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={p.url}
                      alt={p.tag}
                      title={p.tag === 'before' ? '施術前（クリックで原寸表示）' : '施術後（クリックで原寸表示）'}
                      style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                    />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
