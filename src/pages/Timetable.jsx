import { useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { STAFF } from '../data/sampleData.js'

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
const ROW_H = 56 // px per hour
const START = 9

function toY(t) {
  const [h, m] = t.split(':').map(Number)
  return (h - START) * ROW_H + (m / 60) * ROW_H
}

export default function Timetable() {
  const { reservations } = useStore()
  const nav = useNavigate()

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>予約タイムテーブル</h1>
          <p>2026-06-24（水） / 縦軸：時間 × 横軸：スタッフ</p>
        </div>
      </div>

      <div className="tt-wrap">
        <div className="tt" style={{ '--staff-count': STAFF.length }}>
          <div className="tt-head">
            <div>時間</div>
            {STAFF.map((s) => <div key={s}>{s}</div>)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: `64px repeat(${STAFF.length}, 1fr)` }}>
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
                  <div key={h} style={{ height: ROW_H, borderBottom: '1px solid var(--line)' }} />
                ))}
                {reservations.filter((r) => r.staff === staff).map((r) => (
                  <div
                    key={r.id}
                    className="tt-appt"
                    style={{ top: toY(r.start) + 2, height: toY(r.end) - toY(r.start) - 4 }}
                    onClick={() => r.customerId && nav('/customer/' + r.customerId)}
                  >
                    <b>{r.start}–{r.end}</b>
                    <div>{r.customer}</div>
                    <div className="m">{r.menu}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
