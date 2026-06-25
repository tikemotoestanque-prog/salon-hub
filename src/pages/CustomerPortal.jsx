import { useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { yen, daysSince, TODAY, TODAY_ISO } from '../utils.js'

const TIMES = ['10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30']
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const minPlus = (t, m) => { const [h, mm] = t.split(':').map(Number); const x = h * 60 + mm + m; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }

export default function CustomerPortal() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { customers, settings, addReservation } = useStore()
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
          <span className="cp-salon">Hair Salon GRACE</span>
          <span className="cp-user">{c.name} 様</span>
        </div>

        <div className="cp-body">
          {tab === 'karte' && <Karte c={c} rank={rank} />}
          {tab === 'book' && <Book c={c} settings={settings} addReservation={addReservation} />}
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
          <div><b>{yen(c.totalSpent)}</b><span>累計</span></div>
          <div><b>{d == null ? '-' : d + '日前'}</b><span>前回</span></div>
        </div>
      </div>

      <div className="cp-kv">
        <div className="r"><span>前回メニュー</span><b>{c.lastMenu || '-'}</b></div>
        <div className="r"><span>前回ご来店</span><b>{c.lastVisit || '-'}</b></div>
        <div className="r"><span>次回おすすめ</span><b>{c.lastMenu || 'カット'}</b></div>
        <div className="r"><span>髪質・状態</span><b>{c.hair?.type || '-'} / {c.hair?.condition || '-'}</b></div>
        {c.allergies?.length > 0 && <div className="r"><span>アレルギー</span><b style={{ color: '#b4502f' }}>{c.allergies.join('、')}</b></div>}
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

function Book({ c, settings, addReservation }) {
  const [f, setF] = useState({ menu: c.lastMenu || settings.menus[0] || 'カット', date: addDays(TODAY_ISO, 3), time: '11:00', staff: '' })
  const [done, setDone] = useState(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = () => {
    const id = addReservation({
      date: f.date, customerId: c.id, customer: c.name,
      staff: f.staff || c.assignedStaff || settings.staff[0],
      start: f.time, end: minPlus(f.time, 60), menu: f.menu, source: 'line',
    })
    setDone({ ...f, staff: f.staff || 'おまかせ' })
  }

  if (done) {
    return (
      <div className="cp-sec">
        <div className="cp-done">
          <div className="ic">✓</div>
          <h3>ご予約を受け付けました</h3>
          <div className="cp-kv" style={{ marginTop: 14 }}>
            <div className="r"><span>メニュー</span><b>{done.menu}</b></div>
            <div className="r"><span>日時</span><b>{done.date} {done.time}〜</b></div>
            <div className="r"><span>担当</span><b>{done.staff}</b></div>
          </div>
          <p className="cp-muted" style={{ marginTop: 14 }}>確定のご連絡をLINEでお送りします（デモ）。</p>
          <button className="cp-btn ghost" onClick={() => setDone(null)}>続けて予約する</button>
        </div>
      </div>
    )
  }

  return (
    <div className="cp-sec">
      <div className="cp-h">ご予約</div>
      <p className="cp-muted" style={{ margin: '0 0 16px' }}>かんたん3ステップ。お好きなメニュー・日時を選ぶだけ。</p>
      <label className="cp-field"><span>メニュー</span>
        <select value={f.menu} onChange={set('menu')}>{settings.menus.map((m) => <option key={m} value={m}>{m}</option>)}</select>
      </label>
      <label className="cp-field"><span>ご希望日</span>
        <input type="date" value={f.date} onChange={set('date')} />
      </label>
      <label className="cp-field"><span>ご希望時間</span>
        <select value={f.time} onChange={set('time')}>{TIMES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
      </label>
      <label className="cp-field"><span>ご指名</span>
        <select value={f.staff} onChange={set('staff')}>
          <option value="">おまかせ</option>
          {settings.staff.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <button className="cp-btn" onClick={submit}>この内容で予約する</button>
    </div>
  )
}

function Card({ c, rank }) {
  const memberNo = (c.id || '').toUpperCase().padStart(6, '0')
  const stamps = Math.min((c.visitCount || 0) % 10, 10)
  const bm = c.birthday ? Number(c.birthday.slice(5, 7)) : 0
  const coupons = [
    { t: '次回ご来店 10%OFF', s: 'いつでも使える会員特典', tag: '会員限定' },
    { t: 'お友達紹介 ¥1,000OFF', s: 'ご紹介でお互いにお得', tag: '紹介' },
  ]
  if (bm === TODAY.getMonth() + 1) coupons.unshift({ t: '🎂 バースデークーポン', s: '今月のご来店で使えます', tag: '誕生月' })

  return (
    <div className="cp-sec">
      <div className="cp-member">
        <div className="cp-member-top">
          <span>MEMBER'S CARD</span><span>{rank}</span>
        </div>
        <div className="cp-member-name">{c.name} 様</div>
        <div className="cp-member-no">No. {memberNo}</div>
        <div className="cp-barcode">{Array.from({ length: 34 }).map((_, i) => <i key={i} style={{ width: (i % 3) + 1 + 'px' }} />)}</div>
        <div className="cp-member-foot">ご来店時にこの画面をスタッフへご提示ください</div>
      </div>

      <div className="cp-h">ポイント（あと{10 - stamps}回で特典）</div>
      <div className="cp-stamps">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={'cp-stamp' + (i < stamps ? ' on' : '')}>{i < stamps ? '★' : i + 1}</span>
        ))}
      </div>

      <div className="cp-h">保有クーポン</div>
      {coupons.map((cp, i) => (
        <div className="cp-coupon" key={i}>
          <div className="cp-coupon-tag">{cp.tag}</div>
          <div className="cp-coupon-main">
            <div className="t">{cp.t}</div>
            <div className="s">{cp.s}</div>
          </div>
          <button className="cp-coupon-use">使う</button>
        </div>
      ))}
    </div>
  )
}
