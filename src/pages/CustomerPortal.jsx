import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import BookingForm from '../components/BookingForm.jsx'
import { daysSince, TODAY, TODAY_ISO } from '../utils.js'

export default function CustomerPortal() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { customers, reservations, settings } = useStore()
  const c = customers.find((x) => x.id === id)
  const [tab, setTab] = useState(['karte', 'book', 'card'].includes(params.get('tab')) ? params.get('tab') : 'karte')

  if (!c) {
    return <div className="empty">お客様が見つかりません。<br /><Link className="back-link" to="/">← 戻る</Link></div>
  }

  const rank = settings.statuses[c.status]?.label || '会員'

  return (
    <div className="cp">
      <div className="cp-frame">
        <div className="cp-bar">
          <span className="cp-salon">{settings.salonName || 'Hair Salon GRACE'}</span>
          <span className="cp-user">{c.name} 様</span>
        </div>

        <div className="cp-body">
          {tab === 'karte' && <Karte c={c} rank={rank} />}
          {tab === 'book' && <BookTab c={c} reservations={reservations} />}
          {tab === 'card' && <Card c={c} rank={rank} />}
        </div>

        <div className="cp-tabs">
          <button className={'cp-tab' + (tab === 'karte' ? ' on' : '')} onClick={() => setTab('karte')}><span>📋</span>マイカルテ</button>
          <button className={'cp-tab' + (tab === 'book' ? ' on' : '')} onClick={() => setTab('book')}><span>📅</span>ご予約</button>
          <button className={'cp-tab' + (tab === 'card' ? ' on' : '')} onClick={() => setTab('card')}><span>🪪</span>会員証</button>
        </div>
      </div>
      <div className="cp-note">※ デモ用のお客様マイページです。実際はLINEから開くと自動でご本人の画面が表示されます（ログイン入力は不要）。</div>
    </div>
  )
}

function Karte({ c, rank }) {
  const d = daysSince(c.lastVisit)
  const hist = (c.history || []).slice(0, 5)
  return (
    <div className="cp-sec">
      <div className="cp-card">
        <div className="cp-rank">{rank}</div>
        <div className="cp-name">{c.name}<small>{c.kana}</small></div>
        <div className="cp-stats">
          <div><b>{c.visitCount || 0}</b><span>来店</span></div>
          <div><b>{d == null ? '-' : d + '日前'}</b><span>前回</span></div>
        </div>
      </div>

      <div className="cp-kv">
        <div className="r"><span>前回メニュー</span><b>{c.lastMenu || '-'}</b></div>
        <div className="r"><span>前回ご来店</span><b>{c.lastVisit || '-'}</b></div>
        <div className="r"><span>次回おすすめ</span><b>{c.lastMenu || 'カット'}</b></div>
      </div>

      <div className="cp-h">これまでの来店</div>
      <div className="cp-hist">
        {hist.length === 0 && <div className="cp-muted">来店履歴はまだありません。</div>}
        {hist.map((h, i) => (
          <div className="cp-hi" key={i}>
            <div className="dt">{h.date}</div>
            <div className="mn">{h.menu}{h.staff ? ` ・ ${h.staff}` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookTab({ c, reservations }) {
  const upcoming = reservations
    .filter((r) => r.customerId === c.id && r.date >= TODAY_ISO && !r.cancelled)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="cp-sec">
      {upcoming.length > 0 && (
        <>
          <div className="cp-h">予約済みのご来店</div>
          {upcoming.map((r) => (
            <div key={r.id} style={{ background: '#f9f9f9', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.75rem', border: '1px solid #eee' }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{r.date}（{r.start}〜{r.end}）</div>
              <div style={{ fontSize: 13, color: '#555' }}>{r.menu} ／ 担当：{r.staff}</div>
            </div>
          ))}
          <div style={{ height: '1rem' }} />
        </>
      )}
      <div className="cp-h">新しいご予約</div>
      <BookingForm customer={c} />
    </div>
  )
}

// 顧客の状態に合わせてクーポンを出し分け
function couponsFor(c) {
  const out = []
  const bm = c.birthday ? Number(c.birthday.slice(5, 7)) : 0
  if (bm === TODAY.getMonth() + 1) out.push({ tag: '誕生月', t: '🎂 バースデー特典', s: '今月のご来店で使えます' })
  if (c.status === 'vip') out.push({ tag: 'VIP', t: 'VIP限定 トリートメント無料', s: 'いつものメニューにプラス' })
  if (c.status === 'dormant' || c.status === 'followup') out.push({ tag: 'お帰りなさい', t: 'カムバック ¥1,500OFF', s: 'お久しぶりのご来店に' })
  if ((c.visitCount || 0) > 0 && ((c.visitCount || 0) + 1) % 10 === 0) out.push({ tag: 'あと1回', t: '10回達成 特典クーポン', s: '次回ご来店でプレゼント' })
  out.push({ tag: '会員限定', t: '次回ご来店 10%OFF', s: 'いつでも使える会員特典' })
  out.push({ tag: '紹介', t: 'お友達紹介 ¥1,000OFF', s: 'ご紹介でお互いにお得' })
  return out
}

function Card({ c, rank }) {
  const memberNo = (c.id || '').toUpperCase().padStart(6, '0')
  const stamps = Math.min((c.visitCount || 0) % 10, 10)
  const coupons = couponsFor(c)
  const storageKey = `used_coupons_${c.id}`

  const [usedKeys, setUsedKeys] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })
  const [presenting, setPresenting] = useState(null) // 提示中クーポンのkey

  const handleUse = (key) => setPresenting(key)

  const handleConfirm = (key) => {
    const next = [...usedKeys, key]
    setUsedKeys(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
    setPresenting(null)
  }

  const activeCoupons = coupons.filter((cp) => !usedKeys.includes(cp.tag))

  if (presenting) {
    const cp = coupons.find((x) => x.tag === presenting)
    return (
      <div className="cp-sec">
        <div style={{ background: '#f0f6f1', border: '2px solid #2c5e3c', borderRadius: 12, padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎟️</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{cp.t}</div>
          <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1.25rem' }}>{cp.s}</div>
          <div style={{ fontSize: '0.8rem', color: '#2c5e3c', fontWeight: 600, marginBottom: '1.25rem' }}>この画面をスタッフへご提示ください</div>
          <button onClick={() => handleConfirm(presenting)} style={{ width: '100%', padding: '0.75rem', background: '#2c5e3c', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.75rem' }}>
            使用済みにする
          </button>
          <button onClick={() => setPresenting(null)} style={{ width: '100%', padding: '0.6rem', background: 'transparent', color: '#888', border: '1px solid #ddd', borderRadius: 8, fontSize: '0.875rem', cursor: 'pointer' }}>
            キャンセル
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cp-sec">
      <div className="cp-member">
        <div className="cp-member-top"><span>MEMBER'S CARD</span><span>{rank}</span></div>
        <div className="cp-member-name">{c.name} 様</div>
        <div className="cp-member-no">No. GRACE-{memberNo}</div>
        <div className="cp-member-foot">ご来店時にこの画面をスタッフへご提示ください</div>
      </div>

      <div className="cp-h">ポイント（あと{10 - stamps}回で特典）</div>
      <div className="cp-stamps">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={'cp-stamp' + (i < stamps ? ' on' : '')}>{i < stamps ? '★' : i + 1}</span>
        ))}
      </div>

      <div className="cp-h">保有クーポン</div>
      {activeCoupons.length === 0 && <div className="cp-muted" style={{ textAlign: 'center', padding: '1rem' }}>利用可能なクーポンはありません</div>}
      {activeCoupons.map((cp) => (
        <div className="cp-coupon" key={cp.tag}>
          <div className="cp-coupon-tag">{cp.tag}</div>
          <div className="cp-coupon-main">
            <div className="t">{cp.t}</div>
            <div className="s">{cp.s}</div>
          </div>
          <button className="cp-coupon-use" onClick={() => handleUse(cp.tag)}>使う</button>
        </div>
      ))}
    </div>
  )
}
