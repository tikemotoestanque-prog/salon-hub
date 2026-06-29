// POST /api/liff/resolve  Authorization: Bearer <IDトークン>
// トークンの本人(lineUserId)に紐づく顧客idを返す。未紐付けなら id: null。
import { admin } from '../_lib/admin.js'
import { bearer, verifyIdTokenDetailed } from '../_lib/liff.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const token = bearer(req)
  const v = await verifyIdTokenDetailed(token)
  // 失敗時は理由を返す（診断用）。tokenLen はトークンが届いているかの確認用
  if (!v.sub) return res.status(401).json({ error: v.reason, detail: v.detail, tokenLen: token.length })

  const { data } = await admin.from('customers').select('id').eq('integrations->>lineUserId', v.sub).maybeSingle()
  return res.status(200).json({ id: data ? data.id : null })
}
