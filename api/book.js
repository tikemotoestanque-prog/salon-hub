// POST /api/book
//   本人予約: Authorization: Bearer <IDトークン> + { customerId, menu, date, time, staff? }
//   ゲスト予約(/book): トークンなし + { customer(名前), menu, date, time, staff? }
// サーバー側で空き枠を再検証してから予約を作成し、通知＋LINE送信を行う。
import { admin } from './_lib/admin.js'
import { userIdFrom } from './_lib/liff.js'
import { pushText } from './_lib/line.js'
import { slotFree, pickFreeStaff, workingStaff } from '../src/utils.js'

const minPlus = (t, m) => { const [h, mm] = t.split(':').map(Number); const x = h * 60 + mm + m; return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }
const WD = ['日', '月', '火', '水', '木', '金', '土']
const fmtDate = (iso) => { const d = new Date(iso + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}（${WD[d.getDay()]}）` }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { customerId, customer, menu, date, time, staff } = req.body || {}
  if (!menu || !date || !time) return res.status(400).json({ error: 'menu, date, time required' })

  // 本人予約なら、トークンの本人と customerId が一致することを検証（なりすまし防止）
  let cust = null
  if (customerId) {
    const uid = await userIdFrom(req)
    if (!uid) return res.status(401).json({ error: 'unauthorized' })
    const { data } = await admin.from('customers').select('*').eq('id', customerId).maybeSingle()
    if (!data || (data.integrations || {}).lineUserId !== uid) return res.status(403).json({ error: 'forbidden' })
    cust = data
  }
  const name = cust ? cust.name : (customer || '').trim()
  if (!name) return res.status(400).json({ error: 'name required' })

  // 設定とその日の予約を取得して空き枠を再検証
  const [{ data: setRow }, { data: dayRows }] = await Promise.all([
    admin.from('settings').select('data').eq('id', 1).maybeSingle(),
    admin.from('reservations').select('staff,start,end,date,cancelled').eq('date', date),
  ])
  const settings = (setRow && setRow.data) || {}
  const staffList = settings.staff || []
  const capacity = settings.capacity || {}
  const dur = (settings.menuDurations && settings.menuDurations[menu]) || 60
  const dayRes = (dayRows || []).filter((r) => !r.cancelled)

  const assigned = staff || pickFreeStaff(dayRes, date, time, dur, capacity, workingStaff(settings, staffList, date))
  if (!assigned || !slotFree(dayRes, date, assigned, time, dur, capacity)) {
    return res.status(409).json({ ok: false, error: 'full' })
  }

  const id = 'r' + String(Date.now()).slice(-6)
  const newRes = { id, date, customer_id: customerId || null, customer: name, staff: assigned, start: time, end: minPlus(time, dur), menu, source: 'line' }
  const { error } = await admin.from('reservations').insert(newRes)
  if (error) return res.status(500).json({ error: error.message })

  // ダッシュボード通知
  await admin.from('notifications').insert({
    type: 'reservation', customer_id: customerId || null, customer_name: name,
    message: `${date} ${time}〜 ${menu} / 担当：${assigned}`,
    read: false, created_at: new Date().toISOString(),
  })

  // 本人のLINEへ自動送信
  const lineUserId = cust && (cust.integrations || {}).lineUserId
  if (lineUserId) {
    await pushText(lineUserId, `${name}様、ご予約ありがとうございます！✂️\n\n📅 ${fmtDate(date)} ${time}〜\n💇 ${menu}\n👤 担当：${assigned}\n\nご来店をお待ちしております🌿`)
  }

  return res.status(200).json({ ok: true, reservation: { id, date, time, staff: assigned, menu, end: minPlus(time, dur) } })
}
