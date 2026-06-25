import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { RES_SOURCE_META } from '../data/sampleData.js'
import { TODAY_ISO } from '../utils.js'

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

export default function Timetable() {
  const { reservations, customers, settings, addReservation, updateReservation, deleteReservation } = useStore()
  const STAFF = settings.staff
  const nav = useNavigate()
  const [date, setDate] = useState(TODAY_ISO)
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

  const openEdit = (r) => setEditing({ ...r })
  const openAdd = (staff, start) => setEditing(blank(date, staff || STAFF[0], start))

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

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>予約タイムテーブル</h1>
          <p>縦軸：時間 × 横軸：スタッフ / 日付を切り替えて先・前の予約も確認できます</p>
        </div>
        <button className="btn" onClick={() => openAdd()}>＋ 予約を追加</button>
      </div>

      <div className="tt-datebar">
        <button className="datenav" onClick={() => setDate(shiftDate(date, -1))}>‹ 前日</button>
        <div className="datecur">
          <span className="d">{dateLabel(date)}</span>
          <span className="c">{dayList.length} 件</span>
        </div>
        <button className="datenav" onClick={() => setDate(shiftDate(date, 1))}>翌日 ›</button>
        {!isToday && <button className="datenav today" onClick={() => setDate(TODAY_ISO)}>今日へ</button>}
      </div>

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
            {STAFF.map((s) => <div key={s}>{s}</div>)}
          </div>

          <div className="tt-body" style={{ gridTemplateColumns: `64px repeat(${STAFF.length}, 1fr)` }}>
            {/* time column */}
            <div>
              {HOURS.map((h) => (
                <div key={h} className="tt-time" style={{ height: ROW_H }}>{h}:00</div>
              ))}
            </div>
            {/* staff columns */}
            {STAFF.map((staff) => (
              <div key={staff} style={{ position: 'relative', borderLeft: '1px solid var(--line)' }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="tt-slot"
                    style={{ height: ROW_H, borderBottom: '1px solid var(--line)' }}
                    onClick={() => openAdd(staff, `${h}:00`)}
                  />
                ))}
                {dayList.filter((r) => r.staff === staff).map((r) => {
                  const dragging = drag && drag.id === r.id
                  const delta = dragging ? drag.deltaMin : 0
                  const sMin = toMin(r.start) + delta
                  const eMin = toMin(r.end) + delta
                  const meta = RES_SOURCE_META[r.source] || RES_SOURCE_META.other
                  return (
                    <div
                      key={r.id}
                      className={'tt-appt' + (dragging ? ' dragging' : '')}
                      style={{ top: toY(sMin) + 2, height: toY(eMin) - toY(sMin) - 4, background: meta.bg, borderLeftColor: meta.bar }}
                      onPointerDown={(e) => onPointerDown(e, r)}
                      onPointerMove={onPointerMove}
                      onPointerUp={(e) => onPointerUp(e, r)}
                      onPointerCancel={onPointerCancel}
                    >
                      <b>{minToStr(sMin)}–{minToStr(eMin)}</b>
                      <div className="nm">{r.customer || '（名前未入力）'}</div>
                      <div className="m">{r.menu}</div>
                      <span className="tt-src" style={{ color: meta.color }}>{meta.short}</span>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* 現在時刻ライン */}
            {showNow && (
              <div className="tt-now" style={{ top: toY(nowMin) }}>
                <span className="tt-now-label">{minToStr(nowMin)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

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
          onOpenCard={(cid) => nav('/customer/' + cid)}
        />
      )}
    </div>
  )
}

function ResModal({ form, customers, staff, menus, onClose, onSave, onDelete, onOpenCard }) {
  const [f, setF] = useState(form)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  const pickCustomer = (cid) => {
    if (!cid) { setF((p) => ({ ...p, customerId: null })); return }
    const c = customers.find((x) => x.id === cid)
    if (c) setF((p) => ({ ...p, customerId: c.id, customer: c.name }))
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
            <label>登録顧客から選ぶ（任意）</label>
            <select value={f.customerId || ''} onChange={(e) => pickCustomer(e.target.value)}>
              <option value="">未登録 / 手入力する</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>お客様名 <span className="required">*</span></label>
            <input value={f.customer} onChange={(e) => set('customer', e.target.value)} placeholder="例：田村 さん（電話）" />
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
          <span style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>キャンセル</button>
          <button className="btn" onClick={save}>保存</button>
        </div>
      </div>
    </div>
  )
}
