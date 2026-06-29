// POST /api/liff/register  Authorization: Bearer <IDトークン>
//   { name, kana, phone, birthday, gender }
// 新規のお客様がLINEから自分を登録。lineUserId はトークンから導出（本人保証）。
import { admin } from '../_lib/admin.js'
import { userIdFrom } from '../_lib/liff.js'
import { toCustomerRow } from '../_lib/rows.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { name, kana, phone, birthday, gender } = req.body || {}
  const nm = (name || '').trim()
  const phoneDigits = (phone || '').replace(/[-\s]/g, '')
  if (!nm) return res.status(400).json({ error: 'name required' })
  if (!/^\d{10,11}$/.test(phoneDigits)) return res.status(400).json({ error: 'invalid phone' })

  const uid = await userIdFrom(req)
  if (!uid) return res.status(401).json({ error: 'unauthorized' })

  // 既に紐付け済みなら二重登録せずそのidを返す
  const { data: existing } = await admin.from('customers').select('id').eq('integrations->>lineUserId', uid).maybeSingle()
  if (existing) return res.status(200).json({ id: existing.id })

  const id = 'c' + String(Date.now()).slice(-6)
  const customer = {
    id, name: nm, kana: (kana || '').trim(), gender: gender || '', birthday: birthday || '',
    phone: (phone || '').trim(), email: '', status: 'new', source: 'line',
    lastVisit: '', lastMenu: '', assignedStaff: '', visitCount: 0, totalSpent: 0,
    hair: {}, allergies: [], reservationPattern: 'パターン未確定',
    integrations: { line: '連携済', instagram: '未連携', google: '未送信', lineUserId: uid },
    stepDelivery: [{ step: 1, title: '初回来店お礼', status: '予約', date: '-' }],
    history: [],
  }
  const { error } = await admin.from('customers').insert(toCustomerRow(customer))
  if (error) return res.status(500).json({ error: error.message })

  await admin.from('notifications').insert({
    type: 'new_customer', customer_id: id, customer_name: nm,
    message: `${nm}様がLINEから新規登録しました`,
    read: false, created_at: new Date().toISOString(),
  })
  return res.status(200).json({ id })
}
