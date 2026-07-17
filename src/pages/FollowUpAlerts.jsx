import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { StatusBadge, SourceBadge } from '../components/Badges.jsx'
import { daysSince } from '../utils.js'

export default function FollowUpAlerts() {
  const { customers, settings } = useStore()
  const nav = useNavigate()
  const THRESHOLD = settings?.thresholds?.followupDays || 60

  const [selected, setSelected] = useState(() => new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')

  const alerts = customers
    .map((c) => ({ c, days: daysSince(c.lastVisit) }))
    .filter((x) => x.days != null && x.days >= THRESHOLD)
    .sort((a, b) => b.days - a.days)

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const lineReady = alerts.filter(({ c }) => c.integrations?.lineUserId)
  // 全選択：LINE未連携の方も含めて全員選べる（未連携の方はデモ送信扱いになる）
  const selectAll = () => setSelected(new Set(alerts.map(({ c }) => c.id)))
  const clearAll = () => setSelected(new Set())

  const sendToSelected = async () => {
    if (selected.size === 0 || sending) return
    setSending(true)
    setResult('')
    try {
      const res = await fetch('/api/send-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || '送信に失敗しました')
      const demo = data.demoSent || 0
      const real = (data.sent || 0) - demo
      const parts = []
      if (real > 0) parts.push(`${real}名に送信`)
      if (demo > 0) parts.push(`${demo}名はLINE未連携のためデモ送信`)
      setResult((parts.join('・') || `${data.sent}名に送信`) + ' ✓')
      setSelected(new Set())
    } catch (e) {
      setResult('送信エラー：' + (e.message || '不明なエラー'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>フォロー漏れアラート</h1>
          <p>最終来店から {THRESHOLD} 日以上経過した顧客：{alerts.length} 名（設定の「要フォローにする未来店日数」で変更できます）</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card section" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn ghost sm" onClick={selectAll}>全選択（{alerts.length}名）</button>
          <button className="btn ghost sm" onClick={clearAll} disabled={selected.size === 0}>選択解除</button>
          <button className="btn" onClick={sendToSelected} disabled={selected.size === 0 || sending}>
            {sending ? '送信中…' : `選択した${selected.size}名にLINEで再来店のお声がけを送る`}
          </button>
          {result && <span className="save-flash">{result}</span>}
          {lineReady.length < alerts.length && (
            <div style={{ width: '100%', fontSize: 11.5, color: 'var(--muted)' }}>
              ※ LINE未連携の方も選択できます。その場合は実際には送信されず、デモ送信として扱われます。
            </div>
          )}
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="empty">フォロー漏れの顧客はいません 🎉</div>
      ) : (
        alerts.map(({ c, days }) => {
          const hasLine = !!c.integrations?.lineUserId
          return (
            <div
              key={c.id}
              className={'card alert-card ' + (days >= 90 ? 'lv-high' : 'lv-mid')}
              style={{ cursor: 'default' }}
            >
              <label
                style={{ display: 'flex', alignItems: 'center', marginRight: 4 }}
                title={hasLine ? '送信対象に選ぶ' : '送信対象に選ぶ（LINE未連携のためデモ送信）'}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                />
              </label>
              <div className="alert-days" onClick={() => nav('/customer/' + c.id)} style={{ cursor: 'pointer' }}>
                <div className="n" style={{ color: days >= 90 ? '#d64545' : '#e08a1e' }}>{days}</div>
                <div className="l">日経過</div>
              </div>
              <div className="alert-info" onClick={() => nav('/customer/' + c.id)} style={{ cursor: 'pointer' }}>
                <div className="nm">{c.name} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>{c.kana}</span></div>
                <div className="sub">最終来店 {c.lastVisit} / 前回: {c.lastMenu} / 担当 {c.assignedStaff || '未定'}</div>
                <div className="meta" style={{ marginTop: 6 }}>
                  <StatusBadge status={c.status} />
                  <SourceBadge source={c.source} />
                  <span className="pill">{c.phone}</span>
                  {!hasLine && <span className="pill" style={{ color: 'var(--muted)' }}>LINE未連携</span>}
                </div>
              </div>
              <button className="btn ghost" onClick={() => nav('/customer/' + c.id)}>詳細</button>
            </div>
          )
        })
      )}
    </div>
  )
}
