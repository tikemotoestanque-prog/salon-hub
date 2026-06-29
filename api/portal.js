// GET /api/portal
//   Authorization: Bearer <LINE IDトークン> → 本人の顧客データを返す（本人保証）
//   ?demo=<id>（DEMO_MODE=1のときのみ） → デモ用にその顧客を返す
// お客様マイページ（/u/:id）が全顧客をロードせず本人1件だけ取得するためのAPI。
import { admin } from './_lib/admin.js'
import { userIdFrom, demoAllowed } from './_lib/liff.js'
import { fromCustomerRow, fromResRow, fromRedemptionRow } from './_lib/rows.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const uid = await userIdFrom(req)
  let row = null
  if (uid) {
    const { data } = await admin.from('customers').select('*').eq('integrations->>lineUserId', uid).maybeSingle()
    row = data
  } else if (demoAllowed && req.query.demo) {
    const { data } = await admin.from('customers').select('*').eq('id', req.query.demo).maybeSingle()
    row = data
  } else {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (!row) return res.status(404).json({ error: 'not found' })

  const [{ data: resv }, { data: red }] = await Promise.all([
    admin.from('reservations').select('*').eq('customer_id', row.id),
    admin.from('coupon_redemptions').select('*').eq('customer_id', row.id),
  ])

  return res.status(200).json({
    customer: fromCustomerRow(row),
    reservations: (resv || []).map(fromResRow),
    redemptions: (red || []).map(fromRedemptionRow),
  })
}
