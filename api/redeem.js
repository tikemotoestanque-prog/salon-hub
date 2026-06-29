// POST /api/redeem  Authorization: Bearer <IDトークン>  { tag, action?: 'redeem'|'unredeem' }
// 本人のクーポンだけを使用済み/取消にする。customer_id はトークンから導出するので改ざん不可。
import { admin } from './_lib/admin.js'
import { userIdFrom } from './_lib/liff.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { tag, action = 'redeem' } = req.body || {}
  if (!tag) return res.status(400).json({ error: 'tag required' })

  const uid = await userIdFrom(req)
  if (!uid) return res.status(401).json({ error: 'unauthorized' })
  const { data: cust } = await admin.from('customers').select('id').eq('integrations->>lineUserId', uid).maybeSingle()
  if (!cust) return res.status(404).json({ error: 'not found' })

  if (action === 'unredeem') {
    await admin.from('coupon_redemptions').delete().eq('customer_id', cust.id).eq('coupon_tag', tag)
  } else {
    await admin.from('coupon_redemptions').upsert(
      { customer_id: cust.id, coupon_tag: tag, used_by: 'customer' },
      { onConflict: 'customer_id,coupon_tag' },
    )
  }
  return res.status(200).json({ ok: true })
}
