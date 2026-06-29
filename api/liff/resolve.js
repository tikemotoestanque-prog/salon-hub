// POST /api/liff/resolve  Authorization: Bearer <IDトークン>
// トークンの本人(lineUserId)に紐づく顧客idを返す。未紐付けなら id: null。
import { admin } from '../_lib/admin.js'
import { userIdFrom } from '../_lib/liff.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const uid = await userIdFrom(req)
  if (!uid) return res.status(401).json({ error: 'unauthorized' })

  const { data } = await admin.from('customers').select('id').eq('integrations->>lineUserId', uid).maybeSingle()
  return res.status(200).json({ id: data ? data.id : null })
}
