// POST /api/book
//   本人予約: Authorization: Bearer <IDトークン> + { customerId, menu, date, time, staff? }
//   ゲスト予約(/book): トークンなし + { customer(名前), menu, date, time, staff? }
// サーバー側で空き枠を再検証してから予約を作成し、通知＋LINE送信を行う。
import { admin } from './_lib/admin.js'
import { userIdFrom } from './_lib/liff.js'
import { pushText } from './_lib/line.js'
import { getTemplates, applyTemplate } from './_lib/templates.js'
import { staffFreeForMenu, pickBalancedStaffForMenu, workingStaffByRule, shopClosedReason } from '../src/utils.js'

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const minToStr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
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

  // 設定とその日の予約を取得（メニューも取得＝拘束/放置の判定に使う）
  const [{ data: setRow }, { data: dayRows }] = await Promise.all([
    admin.from('settings').select('data').eq('id', 1).maybeSingle(),
    admin.from('reservations').select('staff,start,end,date,menu,cancelled').eq('date', date),
  ])
  const settings = (setRow && setRow.data) || {}
  const staffList = settings.staff || []
  const dur = (settings.menuDurations && settings.menuDurations[menu]) || 60
  const dayRes = (dayRows || []).filter((r) => !r.cancelled)
  const closeMin = toMin(settings.closeTime || '19:00')

  // 定休日（火曜など）は受け付けない
  if (shopClosedReason(settings, date)) return res.status(409).json({ ok: false, error: 'closed' })
  // 出勤スタッフは曜日ルールで判定（DBの設定に休み情報が無いため、クライアントと同じ規則で再現）
  const working = workingStaffByRule(staffList, date)

  // 希望時間から30分ずつ後ろにずらして、メニューを受けられる枠を探す。
  // ・指名：そのスタッフの拘束が空く時間を探す（放置中なら2人目OK）
  // ・おまかせ：受けられる出勤スタッフのうち担当件数が最少の人へ（負荷分散）
  let assigned = null, startMin = null
  for (let t = toMin(time); t + dur <= closeMin; t += 30) {
    if (staff) {
      if (working.includes(staff) && staffFreeForMenu(dayRes, date, staff, t, menu, dur)) { assigned = staff; startMin = t; break }
    } else {
      const pick = pickBalancedStaffForMenu(dayRes, date, t, menu, dur, working)
      if (pick) { assigned = pick; startMin = t; break }
    }
  }
  if (assigned == null) return res.status(409).json({ ok: false, error: 'full' })
  const startStr = minToStr(startMin)
  const endStr = minToStr(startMin + dur)

  const id = 'r' + String(Date.now()).slice(-6)
  const newRes = { id, date, customer_id: customerId || null, customer: name, staff: assigned, start: startStr, end: endStr, menu, source: 'line' }
  const { error } = await admin.from('reservations').insert(newRes)
  if (error) return res.status(500).json({ error: error.message })

  // ダッシュボード通知
  await admin.from('notifications').insert({
    type: 'reservation', customer_id: customerId || null, customer_name: name,
    message: `${date} ${startStr}〜 ${menu} / 担当：${assigned}`,
    read: false, created_at: new Date().toISOString(),
  })

  // 本人のLINEへ自動送信
  const lineUserId = cust && (cust.integrations || {}).lineUserId
  if (lineUserId) {
    const salonName = settings.salonName || 'Hair Salon GRACE'
    const text = applyTemplate(getTemplates(settings).bookingConfirm, {
      customerName: name, salonName, date: fmtDate(date), time: startStr, menu, staff: assigned,
    })
    await pushText(lineUserId, text)
  }

  return res.status(200).json({ ok: true, reservation: { id, date, time: startStr, staff: assigned, menu, end: endStr } })
}
