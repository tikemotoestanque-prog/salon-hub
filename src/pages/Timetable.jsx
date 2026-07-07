import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { RES_SOURCE_META } from '../data/sampleData.js'
import { TODAY_ISO, shopClosedReason, isStaffOff, IS_DEMO, resProgress } from '../utils.js'

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
const ROW_H = 56 // px per hour
const START = 9 // 営業開始
const END = 20 // 営業終了（最後の枠の終わり）
const STEP = 15 // 予約の最小単位（分）
const WD = ['日', '月', '火', '水', '木', '金', '土']

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
const minToStr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const toY = (min) => ((min - START * 60) / 60) * ROW_H

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shiftDate = (iso, n) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dateLabel = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`
}

// 開始・終了の選択肢（9:00〜20:00を15分刻み）
const TIME_OPTIONS = []
for (let m = START * 60; m <= END * 60; m += STEP) TIME_OPTIONS.push(minToStr(m))

// 新規予約の初期値
const blank = (date, staff, start) => ({
  id: null,
  date,
  customerId: null,
  customer: '',
  staff: staff || '',
  start: start || '10:00',
  end: start ? minToStr(Math.min(toMin(start) + 60, END * 60)) : '11:00',
  menu: '',
  source: 'phone',
})

// 週の月曜日を返す
const weekStart = (iso) => {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const weekDays = (startIso) => Array.from({ length: 7 }, (_, i) => shiftDate(startIso, i))

export default function Timetable() {
  const { reservations, customers, settings, addReservation, updateReservation, deleteReservation, cancelReservation } = useStore()
  const STAFF = settings.staff
  const nav = useNavigate()
  // 表示中の日付を記憶（リロードしても直前に見ていた日のTTを表示）
  const [date, setDate] = useState(() => {
    try { return localStorage.getItem('tt.date') || TODAY_ISO } catch { return TODAY_ISO }
  })
  useEffect(() => { try { localStorage.setItem('tt.date', date) } catch { /* ignore */ } }, [date])
  // 表示モードを記憶（リロードしても直前の月次/日次を維持）
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('tt.view') || 'month' } catch { return 'month' }
  })
  useEffect(() => { try { localStorage.setItem('tt.view', viewMode) } catch { /* ignore */ } }, [viewMode])
  const [editing, setEditing] = useState(null) // 編集中のフォーム or null
  const [drag, setDrag] = useState(null) // { id, deltaMin } ドラッグ中の表示用
  const [now, setNow] = useState(new Date())
  const dragRef = useRef(null)

  // 現在時刻ラインを1分ごとに更新
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const dayList = reservations.filter((r) => r.date === date)
  const isToday = date === TODAY_ISO
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const showNow = isToday && nowMin >= START * 60 && nowMin <= END * 60
  const closedReason = shopClosedReason(settings, date)

  const openEdit = (r) => setEditing({ ...r })
  const openAdd = (staff, start) => {
    if (closedReason && !window.confirm(`${dateLabel(date)} は${closedReason}です。それでも予約を入れますか？`)) return
    if (staff && isStaffOff(settings, staff, date) && !window.confirm(`${staff}さんはこの日お休みです。それでも予約を入れますか？`)) return
    setEditing(blank(date, staff || STAFF[0], start))
  }

  // ---- ドラッグで時間をずらす ----
  function onPointerDown(e, r) {
    if (e.button != null && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { id: r.id, startY: e.clientY, origStart: toMin(r.start), origEnd: toMin(r.end), deltaMin: 0, moved: false }
  }
  function onPointerMove(e) {
    const d = dragRef.current
    if (!d) return
    const dy = e.clientY - d.startY
    if (Math.abs(dy) > 4) d.moved = true
    let deltaMin = Math.round((dy / ROW_H) * 60 / STEP) * STEP
    const minDelta = START * 60 - d.origStart
    const maxDelta = END * 60 - d.origEnd
    deltaMin = Math.max(minDelta, Math.min(maxDelta, deltaMin))
    d.deltaMin = deltaMin
    setDrag({ id: d.id, deltaMin })
  }
  function onPointerUp(e, r) {
    const d = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (!d) return
    if (d.moved && d.deltaMin !== 0) {
      updateReservation(r.id, { start: minToStr(d.origStart + d.deltaMin), end: minToStr(d.origEnd + d.deltaMin) })
    } else if (!d.moved) {
      openEdit(r)
    }
  }
  function onPointerCancel() {
    dragRef.current = null
    setDrag(null)
  }

  const monthYear = date.slice(0, 7) // 'YYYY-MM'

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>予約タイムテーブル</h1>
          <p>{viewMode === 'month' ? '月次ビュー：月全体の予約を俯瞰' : '日次ビュー：縦軸：時間 × 横軸：スタッフ'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={'btn ghost' + (viewMode === 'month' ? ' active' : '')} onClick={() => setViewMode('month')} style={{ fontWeight: viewMode === 'month' ? 700 : 400 }}>月次</button>
          <button className={'btn ghost' + (viewMode === 'day' ? ' active' : '')} onClick={() => setViewMode('day')} style={{ fontWeight: viewMode === 'day' ? 700 : 400 }}>日次</button>
          <button className="btn" onClick={() => openAdd()}>＋ 予約を追加</button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <MonthView
          monthYear={monthYear}
          reservations={reservations}
          settings={settings}
          today={TODAY_ISO}
          onSelectDay={(d) => { setDate(d); setViewMode('day') }}
          onPrevMonth={() => {
            const d = new Date(date + 'T00:00:00'); d.setMonth(d.getMonth() - 1)
            setDate(fmt(d))
          }}
          onNextMonth={() => {
            const d = new Date(date + 'T00:00:00'); d.setMonth(d.getMonth() + 1)
            setDate(fmt(d))
          }}
          onToday={() => { setDate(TODAY_ISO); setViewMode('day') }}
        />
      ) : (
      <>
      <div className="tt-datebar">
        <button className="datenav" onClick={() => setDate(shiftDate(date, -1))}>‹ 前日</button>
        <label className="datecur">
          <span className="d">{dateLabel(date)}</span>
          <span className="c">{closedReason ? closedReason : `${dayList.length} 件`}</span>
          <input className="tt-datepick" type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} title="日付を選んで移動" />
        </label>
        <button className="datenav" onClick={() => setDate(shiftDate(date, 1))}>翌日 ›</button>
        {!isToday && <button className="datenav today" onClick={() => setDate(TODAY_ISO)}>今日へ</button>}
      </div>

      {closedReason && (
        <div className="tt-closed-banner">🌙 {dateLabel(date)} は <strong>{closedReason}</strong> です（お客様の予約画面でも受付されません）</div>
      )}

      <div className="tt-legend">
        {Object.entries(RES_SOURCE_META).map(([k, m]) => (
          <span key={k} className="tt-leg"><i style={{ background: m.bar }} />{m.label}</span>
        ))}
        <span className="tt-hint">💡 ドラッグで時間移動 / タップで編集 / 空き枠タップで追加</span>
      </div>

      <div className="tt-wrap">
        <div className="tt" style={{ '--staff-count': STAFF.length }}>
          <div className="tt-head">
            <div>時間</div>
            {STAFF.map((s) => {
              const off = isStaffOff(settings, s, date)
              return <div key={s} className={off ? 'staff-off-head' : ''}>{s}{off && <span className="off-tag">休</span>}</div>
            })}
          </div>

          <div className="tt-body" style={{ gridTemplateColumns: `64px repeat(${STAFF.length}, 1fr)` }}>
            {/* time column */}
            <div>
              {HOURS.map((h) => (
                <div key={h} className="tt-time" style={{ height: ROW_H }}>{h}:00</div>
              ))}
            </div>
            {/* staff columns */}
            {STAFF.map((staff) => {
              const staffRes = dayList.filter((r) => r.staff === staff)
              // 同じスタッフ内で時間が重なる予約は横に並べる（佐藤＝2枠などを見えるように）
              const layout = computeOverlapLayout(staffRes)
              return (
              <div key={staff} className={(isStaffOff(settings, staff, date) ? 'tt-col-off' : '') + (closedReason ? ' tt-col-closed' : '')} style={{ position: 'relative', borderLeft: '1px solid var(--line)' }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="tt-slot"
                    style={{ height: ROW_H, borderBottom: '1px solid var(--line)' }}
                    onClick={() => openAdd(staff, `${h}:00`)}
                  />
                ))}
                {staffRes.map((r) => {
                  const dragging = drag && drag.id === r.id
                  const delta = dragging ? drag.deltaMin : 0
                  const sMin = toMin(r.start) + delta
                  const eMin = toMin(r.end) + delta
                  const meta = RES_SOURCE_META[r.source] || RES_SOURCE_META.other
                  const lyt = layout[r.id] || { left: 0, width: 1 }
                  const split = lyt.width < 1 // 重なりで横分割中か
                  // デモのみ：現在時刻から済/来店中/予定を動的判定（データは書き換えない）
                  const prog = (IS_DEMO && !r.cancelled) ? resProgress(r, now) : null
                  return (
                    <div
                      key={r.id}
                      className={'tt-appt' + (dragging ? ' dragging' : '') + (r.cancelled ? ' tt-appt-cancelled' : '') + (prog === 'done' ? ' tt-appt-done' : '')}
                      style={{ top: toY(sMin) + 2, height: toY(eMin) - toY(sMin) - 4, left: `calc(${lyt.left * 100}% + 3px)`, width: `calc(${lyt.width * 100}% - 6px)`, right: 'auto', background: r.cancelled ? '#f5f5f5' : meta.bg, borderLeftColor: r.cancelled ? '#ccc' : meta.bar }}
                      onPointerDown={(e) => onPointerDown(e, r)}
                      onPointerMove={onPointerMove}
                      onPointerUp={(e) => onPointerUp(e, r)}
                      onPointerCancel={onPointerCancel}
                    >
                      <b style={{ color: r.cancelled ? '#aaa' : undefined }}>{minToStr(sMin)}–{minToStr(eMin)}</b>
                      <div className="nm" style={{ color: r.cancelled ? '#aaa' : undefined, textDecoration: r.cancelled ? 'line-through' : undefined }}>{r.customer || '（名前未入力）'}{prog === 'done' && <span className="tt-prog done">済</span>}{prog === 'now' && <span className="tt-prog now">来店中</span>}</div>
                      {r.cancelled ? <span style={{ fontSize: 10, color: '#d32f2f' }}>キャンセル</span> : !split && <div className="m">{r.menu}</div>}
                      {!r.cancelled && !split && <span className="tt-src" style={{ color: meta.color }}>{meta.short}</span>}
                    </div>
                  )
                })}
              </div>
            )})}

            {/* 現在時刻ライン */}
            {showNow && (
              <div className="tt-now" style={{ top: toY(nowMin) }}>
                <span className="tt-now-label">{minToStr(nowMin)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      </>
      )}

      {editing && (
        <ResModal
          form={editing}
          customers={customers}
          staff={STAFF}
          menus={settings.menus}
          onClose={() => setEditing(null)}
          onSave={(f) => {
            const { id, ...fields } = f
            if (id) updateReservation(id, fields)
            else addReservation(fields)
            setEditing(null)
          }}
          onDelete={(id) => {
            if (window.confirm('この予約を削除しますか？')) {
              deleteReservation(id)
              setEditing(null)
            }
          }}
          onCancel={(id) => {
            if (window.confirm('この予約をキャンセルにしますか？')) {
              cancelReservation(id)
              setEditing(null)
            }
          }}
          onOpenCard={(cid) => nav('/customer/' + cid)}
          onRegisterNew={(name) => nav('/new?name=' + encodeURIComponent(name))}
        />
      )}
    </div>
  )
}

function ResModal({ form, customers, staff, menus, onClose, onSave, onDelete, onCancel, onOpenCard, onRegisterNew }) {
  const [f, setF] = useState(form)
  const [open, setOpen] = useState(false) // 候補リスト表示中
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  // 入力文字で顧客を絞り込み（名前・カナ・電話の部分一致）
  const q = f.customer.trim()
  const matches = q
    ? customers.filter((c) =>
        (c.name && c.name.includes(q)) ||
        (c.kana && c.kana.includes(q)) ||
        (c.phone && c.phone.replace(/-/g, '').includes(q.replace(/-/g, '')))
      ).slice(0, 6)
    : []
  // 入力中の名前が既存顧客と完全一致しているか
  const exact = customers.find((c) => c.name === q)
  // リンク済み顧客でなく、候補も無い → 新規のお客様
  const isUnknown = q.length > 0 && !f.customerId && !exact && matches.length === 0

  const onNameChange = (v) => {
    // 名前を編集したらリンクを解除（別人になり得るため）
    setF((p) => ({ ...p, customer: v, customerId: null }))
    setOpen(true)
  }
  const pickCustomer = (c) => {
    setF((p) => ({ ...p, customerId: c.id, customer: c.name }))
    setOpen(false)
  }

  const save = () => {
    if (!f.customer.trim()) { alert('お客様名を入力してください'); return }
    if (toMin(f.end) <= toMin(f.start)) { alert('終了時刻は開始時刻より後にしてください'); return }
    onSave(f)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{f.id ? '予約を編集' : '予約を追加'}</h2>
          <button className="x-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>お客様名 <span className="required">*</span></label>
            <div className="cust-ac">
              <input
                value={f.customer}
                onChange={(e) => onNameChange(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder="お名前を入力（例：田村）"
                autoComplete="off"
              />
              {f.customerId && <span className="ac-linked">✓ 登録済</span>}
              {open && matches.length > 0 && (
                <ul className="ac-list">
                  {matches.map((c) => (
                    <li key={c.id} onMouseDown={(e) => { e.preventDefault(); pickCustomer(c) }}>
                      <b>{c.name}</b>
                      <small>{c.kana}{c.phone ? ` ・ ${c.phone}` : ''}・来店{c.visitCount || 0}回</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {isUnknown && (
              <div className="ac-new">
                「{q}」さんの登録はありません。<strong>新規のお客様</strong>として予約します。
                <button className="link-btn" onClick={() => onRegisterNew(q)}>＋ このお客様をカルテ登録する</button>
              </div>
            )}
            {f.customerId && (
              <div className="ac-hit">登録済みのお客様にひも付けました。カルテと予約が連動します。</div>
            )}
          </div>
          <div className="modal-row">
            <div className="field">
              <label>予約経路</label>
              <select value={f.source} onChange={(e) => set('source', e.target.value)}>
                {Object.entries(RES_SOURCE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>担当スタッフ</label>
              <select value={f.staff} onChange={(e) => set('staff', e.target.value)}>
                {staff.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>日付</label>
            <input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div className="modal-row">
            <div className="field">
              <label>開始</label>
              <select value={f.start} onChange={(e) => set('start', e.target.value)}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label>終了</label>
              <select value={f.end} onChange={(e) => set('end', e.target.value)}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>メニュー</label>
            <input list="res-menu-suggest" value={f.menu} onChange={(e) => set('menu', e.target.value)} placeholder="例：カット+カラー" />
            <datalist id="res-menu-suggest">{menus.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          {f.customerId && (
            <button className="link-btn" onClick={() => onOpenCard(f.customerId)}>📋 このお客様のカルテを開く →</button>
          )}
        </div>
        <div className="modal-foot">
          {f.id && <button className="btn ghost danger" onClick={() => onDelete(f.id)}>削除</button>}
          {f.id && !f.cancelled && <button className="btn ghost" style={{ color: '#c25e00', borderColor: '#c25e00' }} onClick={() => onCancel(f.id)}>予約キャンセル</button>}
          {f.cancelled && <span style={{ fontSize: 12, color: '#d32f2f', fontWeight: 600 }}>キャンセル済</span>}
          <span style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>閉じる</button>
          <button className="btn" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  )
}

function MonthView({ monthYear, reservations, settings, today, onSelectDay, onPrevMonth, onNextMonth, onToday }) {
  const [y, m] = monthYear.split('-').map(Number)
  const firstDay = new Date(y, m - 1, 1)
  const lastDay = new Date(y, m, 0)
  // グリッド先頭を月曜に合わせる
  const startOffset = (firstDay.getDay() + 6) % 7 // 0=Mon
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7
  const cells = []
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) { cells.push(null); continue }
    const iso = `${y}-${String(m).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
    const dayRes = reservations.filter(r => r.date === iso && !r.cancelled)
    const closed = shopClosedReason(settings, iso)
    cells.push({ iso, dayNum, count: dayRes.length, closed, isToday: iso === today })
  }

  const prevMonthLabel = (() => { const d = new Date(y, m - 2, 1); return `${d.getFullYear()}/${d.getMonth()+1}` })()
  const nextMonthLabel = (() => { const d = new Date(y, m, 1); return `${d.getFullYear()}/${d.getMonth()+1}` })()

  // 件数の最大値（色の濃さ計算用）
  const maxCount = Math.max(1, ...cells.filter(Boolean).map(c => c.count))

  return (
    <div>
      <div className="tt-datebar" style={{ justifyContent: 'space-between' }}>
        <button className="datenav" onClick={onPrevMonth}>‹ {prevMonthLabel}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{y}年{m}月</span>
          {today.slice(0, 7) !== monthYear && (
            <button className="datenav today" onClick={onToday}>今日へ</button>
          )}
        </div>
        <button className="datenav" onClick={onNextMonth}>{nextMonthLabel} ›</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 560 }}>
          {/* 曜日ヘッダー */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '2px solid var(--line)', marginBottom: 0 }}>
            {['月','火','水','木','金','土','日'].map((wd, i) => (
              <div key={wd} style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: 700, color: i === 6 ? '#e53935' : i === 5 ? '#1565c0' : 'var(--muted)', background: 'var(--bg)' }}>{wd}</div>
            ))}
          </div>
          {/* 日付グリッド */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((cell, i) => {
              const wd = i % 7
              if (!cell) return <div key={i} style={{ minHeight: 80, borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: '#fafafa' }} />
              const { iso, dayNum, count, closed, isToday } = cell
              const intensity = closed ? 0 : Math.round((count / maxCount) * 100)
              const bg = isToday ? '#e8f5e9' : closed ? '#f5f5f5' : count === 0 ? 'var(--surface)' : `rgba(6,199,85,${(intensity / 100) * 0.18})`
              return (
                <div
                  key={iso}
                  onClick={() => !closed && onSelectDay(iso)}
                  style={{ minHeight: 80, borderRight: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '6px 8px', cursor: closed ? 'default' : 'pointer', background: bg, position: 'relative', transition: 'background 0.1s' }}
                >
                  <div style={{ fontWeight: isToday ? 800 : 600, fontSize: 13, color: isToday ? '#2c5e3c' : wd === 6 ? '#e53935' : wd === 5 ? '#1565c0' : '#333', marginBottom: 4 }}>
                    {dayNum}
                    {isToday && <span style={{ marginLeft: 4, fontSize: 10, background: '#2c5e3c', color: '#fff', borderRadius: 4, padding: '1px 4px' }}>今日</span>}
                  </div>
                  {closed ? (
                    <div style={{ fontSize: 11, color: '#bbb' }}>休</div>
                  ) : count > 0 ? (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#2c5e3c', lineHeight: 1 }}>{count}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>件</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: '#ccc' }}>0件</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0' }}>日付をクリックするとその日の日次ビューへ移動します</p>
    </div>
  )
}

// 重なり予約のレイアウト計算（グリーディ列割り当て）。
// 時間が重なる予約を横に並べる（2枠スタッフ＝同時2件などを見えるようにする）。日次・週次で共用。
function computeOverlapLayout(dayRes) {
  const sorted = [...dayRes].sort((a, b) => toMin(a.start) - toMin(b.start))
  const cols = []
  for (const r of sorted) {
    let placed = false
    for (const col of cols) {
      if (toMin(col[col.length - 1].end) <= toMin(r.start)) {
        col.push(r)
        placed = true
        break
      }
    }
    if (!placed) cols.push([r])
  }
  const result = {}
  const n = cols.length
  cols.forEach((col, ci) => col.forEach(r => { result[r.id] = { left: ci / n, width: 1 / n } }))
  return result
}

function WeekView({ days, reservations, settings, today, onSelectDay, onAddRes, onEditRes, srcMeta, onPrevWeek, onNextWeek, onToday }) {
  const WHOURS = [9,10,11,12,13,14,15,16,17,18,19]
  const WROW = 60 // px per hour
  const WSTART = 9
  const WEND = 20
  const wToY = (min) => ((min - WSTART * 60) / 60) * WROW
  const totalH = WHOURS.length * WROW

  return (
    <div>
      <div className="tt-datebar" style={{ justifyContent: 'space-between' }}>
        <button className="datenav" onClick={onPrevWeek}>‹ 前の週</button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          {days[0].slice(5).replace('-','/')} 〜 {days[6].slice(5).replace('-','/')}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {!days.includes(today) && <button className="datenav today" onClick={onToday}>今週へ</button>}
          <button className="datenav" onClick={onNextWeek}>次の週 ›</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ minWidth: 700 }}>
          {/* ヘッダー行 */}
          <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(7, 1fr)`, borderBottom: '2px solid var(--line)' }}>
            <div style={{ background: 'var(--bg)' }} />
            {days.map((d) => {
              const isT = d === today
              const dayRes = reservations.filter((r) => r.date === d && !r.cancelled)
              const closed = shopClosedReason(settings, d)
              const wd = WD[new Date(d + 'T00:00:00').getDay()]
              return (
                <div key={d} onClick={() => onSelectDay(d)} style={{ padding: '6px 4px', textAlign: 'center', borderLeft: '1px solid var(--line)', cursor: 'pointer', background: isT ? '#e8f5e9' : closed ? '#f5f5f5' : 'var(--surface)' }}>
                  <div style={{ fontSize: 11, color: isT ? '#2c5e3c' : 'var(--muted)' }}>{d.slice(5).replace('-','/')}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: isT ? '#2c5e3c' : closed ? '#bbb' : '#333' }}>{wd}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>
                    {closed ? <span style={{ color: '#bbb' }}>休</span> : <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{dayRes.length}件</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 時間グリッド + 予約ブロック */}
          <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(7, 1fr)`, position: 'relative' }}>
            {/* 時間ラベル列 */}
            <div style={{ background: 'var(--bg)' }}>
              {WHOURS.map((h) => (
                <div key={h} style={{ height: WROW, borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 3, fontSize: 11, color: 'var(--muted)' }}>{h}:00</div>
              ))}
            </div>

            {/* 各日の列 */}
            {days.map((d) => {
              const closed = shopClosedReason(settings, d)
              const isT = d === today
              const dayRes = reservations.filter((r) => r.date === d && !r.cancelled)
              const layout = computeOverlapLayout(dayRes)
              return (
                <div key={d} onClick={() => !closed && onAddRes(d)} style={{ position: 'relative', height: totalH, borderLeft: '1px solid var(--line)', cursor: closed ? 'default' : 'crosshair', background: closed ? '#f9f9f9' : isT ? 'rgba(232,245,233,0.35)' : undefined }}>
                  {/* 水平ライン */}
                  {WHOURS.map((h) => (
                    <div key={h} style={{ position: 'absolute', top: (h - WSTART) * WROW, left: 0, right: 0, borderBottom: '1px solid var(--line)', height: WROW, pointerEvents: 'none' }} />
                  ))}
                  {/* 予約ブロック（重なり時は横分割） */}
                  {dayRes.map((r) => {
                    const sMin = toMin(r.start)
                    const eMin = toMin(r.end)
                    if (eMin <= WSTART * 60 || sMin >= WEND * 60) return null
                    const top = wToY(Math.max(sMin, WSTART * 60))
                    const bot = wToY(Math.min(eMin, WEND * 60))
                    const blockH = Math.max(bot - top - 3, 16)
                    const meta = srcMeta[r.source] || srcMeta.other
                    const tall = blockH >= 36
                    const lyt = layout[r.id] || { left: 0, width: 1 }
                    const GAP = 1
                    return (
                      <div
                        key={r.id}
                        onClick={(e) => { e.stopPropagation(); onEditRes(r) }}
                        style={{ position: 'absolute', top: top + 1, left: `calc(${lyt.left * 100}% + ${GAP}px)`, width: `calc(${lyt.width * 100}% - ${GAP * 2}px)`, height: blockH, background: meta.bg, borderLeft: `3px solid ${meta.bar}`, borderRadius: 4, padding: '2px 4px', cursor: 'pointer', overflow: 'hidden', boxSizing: 'border-box', zIndex: 1 }}
                      >
                        <div style={{ fontSize: 10, color: meta.color, fontWeight: 700, lineHeight: 1.2 }}>{r.start}〜{r.end}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.customer || '?'}</div>
                        {tall && <div style={{ fontSize: 10, color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{r.menu}</div>}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
