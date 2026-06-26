import { useState, useMemo } from 'react'
import { useStore } from '../store.jsx'
import { slotFree, pickFreeStaff, TODAY_ISO, shopClosedReason, isStaffOff, workingStaff } from '../utils.js'

const ALL_TIMES = ['09:00','09:30','10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00']
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const minPlus = (t, m) => { const [h, mm] = t.split(':').map(Number); const x = h * 60 + mm + m; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }
const fmtDate = (iso) => { const d = new Date(iso + 'T00:00:00'); const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]; return `${d.getMonth() + 1}/${d.getDate()}（${w}）` }

// customer を渡せば既存顧客の予約、無ければゲスト（LP）予約として名前入力欄を出す
export default function BookingForm({ customer }) {
  const { reservations, settings, addReservation } = useStore()
  const salonName = settings.salonName || 'Hair Salon GRACE'
  const staffList = settings.staff
  const capacity = settings.capacity || {}

  const [name, setName] = useState(customer ? customer.name : '')
  const [menu, setMenu] = useState(customer?.lastMenu || settings.menus[0] || 'カット')
  const [date, setDate] = useState(addDays(TODAY_ISO, 3))
  const [staff, setStaff] = useState('')
  const [time, setTime] = useState(null)
  const [result, setResult] = useState(null) // {ok, date, time, staff, menu}

  const dur = (settings.menuDurations?.[menu]) || 60
  const designationFee = staff ? (settings.designationFees?.[staff] || 0) : 0

  // 営業時間内のスロットだけに絞る
  const openMin = toMin(settings.openTime || '10:00')
  const closeMin = toMin(settings.closeTime || '19:00')
  const TIMES = ALL_TIMES.filter((t) => { const m = toMin(t); return m >= openMin && m + dur <= closeMin })

  // 休日（店休 or 指名スタッフの休み）
  const closedReason = shopClosedReason(settings, date)
  const staffOffToday = staff && isStaffOff(settings, staff, date)

  // 選択中の日付・スタッフでの空き時間
  const slots = useMemo(() => {
    if (closedReason || staffOffToday) return TIMES.map((t) => ({ time: t, ok: false }))
    const candidates = staff ? [staff] : workingStaff(settings, staffList, date)
    return TIMES.map((t) => ({ time: t, ok: candidates.some((s) => slotFree(reservations, date, s, t, dur, capacity)) }))
  }, [reservations, date, staff, capacity, staffList, settings, closedReason, staffOffToday, dur, TIMES])

  const anyOpen = slots.some((s) => s.ok)

  const submit = async () => {
    if (!name.trim() || !time) return
    const assigned = staff || pickFreeStaff(reservations, date, time, dur, capacity, workingStaff(settings, staffList, date))
    if (!assigned || !slotFree(reservations, date, assigned, time, dur, capacity)) {
      setResult({ ok: false, date, time, menu })
      return
    }
    addReservation({
      date, customerId: customer?.id || null, customer: name.trim(),
      staff: assigned, start: time, end: minPlus(time, dur), menu, source: 'line',
    })
    setResult({ ok: true, date, time, staff: assigned, menu })

    // LINE自動送信（お客様のlineUserId があれば本物のLINEに送る）
    const lineUserId = customer?.integrations?.lineUserId
    if (lineUserId) {
      const text = `${name.trim()}様、ご予約ありがとうございます！✂️\n\n📅 ${fmtDate(date)} ${time}〜\n💇 ${menu}\n👤 担当：${assigned}\n\nご来店をお待ちしております🌿`
      fetch('/api/send-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: lineUserId, messages: [{ type: 'text', text }] }),
      }).catch(() => {}) // エラーは握りつぶす（デモでも動くように）
    }
  }

  if (result) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        {result.ok ? (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>ご予約が完了しました</div>
            <div style={{ fontSize: '0.875rem', color: '#555', lineHeight: 1.7 }}>
              {fmtDate(result.date)} {result.time}〜<br />
              {result.menu} ／ 担当：{result.staff}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>😔</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>ご希望の時間は満席です</div>
            <div style={{ fontSize: '0.875rem', color: '#555' }}>別のお時間をお選びください</div>
          </>
        )}
        <button className="cp-btn ghost" style={{ marginTop: '1.5rem' }} onClick={() => { setResult(null); setTime(null) }}>
          {result.ok ? '続けて予約する' : '時間を選び直す'}
        </button>
      </div>
    )
  }

  return (
    <div className="bk">
      {!customer && (
        <label className="cp-field"><span>お名前</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 花子" />
        </label>
      )}
      <label className="cp-field"><span>メニュー <small style={{ color: 'var(--muted)', fontWeight: 400 }}>（約{dur}分）</small></span>
        <select value={menu} onChange={(e) => { setMenu(e.target.value); setTime(null) }}>{settings.menus.map((m) => <option key={m} value={m}>{m}</option>)}</select>
      </label>
      <label className="cp-field"><span>ご希望日</span>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(null) }} />
      </label>
      <label className="cp-field"><span>ご指名</span>
        <select value={staff} onChange={(e) => { setStaff(e.target.value); setTime(null) }}>
          <option value="">おまかせ</option>
          {staffList.map((s) => <option key={s} value={s}>{s}{(settings.designationFees?.[s] || 0) > 0 ? ` (+¥${(settings.designationFees[s]).toLocaleString()})` : ''}</option>)}
        </select>
      </label>
      {designationFee > 0 && (
        <div style={{ fontSize: 12, color: '#c25e00', marginTop: -8, marginBottom: 8 }}>指名料 +¥{designationFee.toLocaleString()} が加算されます</div>
      )}

      <div className="cp-field"><span>空いているお時間（{fmtDate(date)}）</span></div>
      {closedReason ? (
        <div className="bk-empty">🌙 {fmtDate(date)} は{closedReason}です。別の日をお選びください🙏</div>
      ) : staffOffToday ? (
        <div className="bk-empty">{staff}はこの日お休みです。別の日、または「おまかせ」をお試しください🙏</div>
      ) : anyOpen ? (
        <div className="bk-slots">
          {slots.map((s) => (
            <button key={s.time} disabled={!s.ok} className={'bk-slot' + (time === s.time ? ' on' : '') + (s.ok ? '' : ' full')} onClick={() => setTime(s.time)}>
              {s.time}{!s.ok && <small>満</small>}
            </button>
          ))}
        </div>
      ) : (
        <div className="bk-empty">この日は満席です。別の日をお試しください🙏</div>
      )}

      <button className="cp-btn" disabled={!time || !name.trim()} onClick={submit}>
        {time ? `${fmtDate(date)} ${time}〜 で予約する` : 'お時間を選んでください'}
      </button>
    </div>
  )
}
