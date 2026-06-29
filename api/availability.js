// GET /api/availability?date=YYYY-MM-DD
// その日の予約を {staff,start,end} だけに絞って返す（氏名等のPIIは出さない）。
// 予約フォームの空き枠計算（slotFree）にだけ使う。トークン不要。
import { admin } from './_lib/admin.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const date = req.query.date
  if (!date) return res.status(400).json({ error: 'date required' })

  const { data, error } = await admin
    .from('reservations')
    .select('staff,start,end,cancelled')
    .eq('date', date)
  if (error) return res.status(500).json({ error: error.message })

  const reservations = (data || [])
    .filter((r) => !r.cancelled)
    .map((r) => ({ date, staff: r.staff, start: r.start, end: r.end }))
  return res.status(200).json({ reservations })
}
