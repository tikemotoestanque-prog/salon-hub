import { useState, useMemo } from 'react'
import { useStore } from '../store.jsx'
import { slotFree, pickFreeStaff, TODAY_ISO, shopClosedReason, isStaffOff, workingStaff } from '../utils.js'

const TIMES = ['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30']
const DUR = 60
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const minPlus = (t, m) => { const [h, mm] = t.split(':').map(Number); const x = h * 60 + mm + m; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }
const fmtDate = (iso) => { const d = new Date(iso + 'T00:00:00'); const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]; return `${d.getMonth() + 1}/${d.getDate()}（${w}）` }

// customer を渡せば既存顧客の予約、無ければゲスト（LP）予約として名前入力欄を出す
export default function BookingForm({ customer }) {
  const { reservations, settings, addReservation } = useStore()
  const staffList = settings.staff
  const capacity = settings.capacity || {}

  const [name, setName] = useState(customer ? customer.name : '')
  const [menu, setMenu] = useState(customer?.lastMenu || settings.menus[0] || 'カット')
  const [date, setDate] = useState(addDays(TODAY_ISO, 3))
  const [staff, setStaff] = useState('')
  const [time, setTime] = useState(null)
  const [result, setResult] = useState(null) // {ok, date, time, staff, menu}

  // 休日（店休 or 指名スタッフの休み）
  const closedReason = shopClosedReason(settings, date)
  const staffOffToday = staff && isStaffOff(settings, staff, date)

  // 選択中の日付・スタッフでの空き時間
  const slots = useMemo(() => {
    if (closedReason || staffOffToday) return TIMES.map((t) => ({ time: t, ok: false }))
    // おまかせ時は出勤しているスタッフだけで空きを見る
    const candidates = staff ? [staff] : workingStaff(settings, staffList, date)
    return TIMES.map((t) => ({ time: t, ok: candidates.some((s) => slotFree(reservations, date, s, t, DUR, capacity)) }))
  }, [reservations, date, staff, capacity, staffList, settings, closedReason, staffOffToday])

  const anyOpen = slots.some((s) => s.ok)

  const submit = () => {
    if (!name.trim() || !time) return
    const assigned = staff || pickFreeStaff(reservations, date, time, DUR, capacity, workingStaff(settings, staffList, date))
    // 念のため確定直前にも空き確認（満席なら「無理」メッセージ）
    if (!assigned || !slotFree(reservations, date, assigned, time, DUR, capacity)) {
      setResult({ ok: false, date, time, menu })
      return
    }
    addReservation({
      date, customerId: customer?.id || null, customer: name.trim(),
      staff: assigned, start: time, end: minPlus(time, DUR), menu, source: 'line',
    })
    setResult({ ok: true, date, time, staff: assigned, menu })
  }

  if (result) {
    return (
      <div className="bk-result">
        <div className={'bk-line ' + (result.ok ? 'ok' : 'ng')}>
          <div className="bk-line-head"><span className="av">✂️</span>Hair Salon GRACE</div>
          {result.ok ? (
            <>
            <div className="bk-bubble">
              {name.trim()}様、ご予約ありがとうございます！🌿{'\n'}
              下記の内容で承りました。{'\n\n'}
              📅 {fmtDate(result.date)} {result.time}〜{'\n'}
              ✂️ {result.menu}{'\n'}
              💁 担当：{result.staff}{'\n\n'}
              ご来店を心よりお待ちしております✨
            </div>
            <div className="bk-bubble sched">
              🔔 自動配信を予約しました{'\n'}
              ・前日 17:00 … ご来店リマインド{'\n'}
              ・来店翌日 … ご来店のお礼＆次回ご提案{'\n'}
              <span className="bk-sched-tag">サロピが自動でお送りします</span>
            </div>
            </>
          ) : (
            <div className="bk-bubble">
              {name.trim()}様、申し訳ございません🙏{'\n'}
              ご希望の {fmtDate(result.date)} {result.time} は、ただいま満席となってしまいました。{'\n\n'}
              恐れ入りますが、別のお時間でのご予約をお願いいたします。{'\n'}
              下のボタンからもう一度お選びいただけます。
            </div>
          )}
        </div>
        <div className="bk-line-note">📲 実際はこの内容が公式LINEに自動で届きます（デモ表示）</div>
        <button className="cp-btn ghost" onClick={() => { setResult(null); setTime(null) }}>
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
      <label className="cp-field"><span>メニュー</span>
        <select value={menu} onChange={(e) => setMenu(e.target.value)}>{settings.menus.map((m) => <option key={m} value={m}>{m}</option>)}</select>
      </label>
      <label className="cp-field"><span>ご希望日</span>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(null) }} />
      </label>
      <label className="cp-field"><span>ご指名</span>
        <select value={staff} onChange={(e) => { setStaff(e.target.value); setTime(null) }}>
          <option value="">おまかせ</option>
          {staffList.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

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
