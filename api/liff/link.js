// POST /api/liff/link  Authorization: Bearer <IDトークン>  { name, phone4 }
// 名前＋電話下4桁で既存顧客1件だけを照合し、本人のLINEを紐付ける。
// 照合はサーバー内で完結し、クライアントへ返すのは一致した1件のidのみ（顧客一覧の流出なし）。
import { admin } from '../_lib/admin.js'
import { userIdFrom } from '../_lib/liff.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { name, phone4 } = req.body || {}
  const nameTrim = (name || '').trim()
  const p4 = (phone4 || '').trim()
  if (!nameTrim || !/^\d{4}$/.test(p4)) return res.status(400).json({ error: 'name and 4-digit phone required' })

  const uid = await userIdFrom(req)
  if (!uid) return res.status(401).json({ error: 'unauthorized' })

  const { data: candidates } = await admin.from('customers').select('id, name, phone, integrations').ilike('name', `%${nameTrim}%`)
  const matched = (candidates || []).find((c) => (c.phone || '').replace(/[-\s]/g, '').endsWith(p4))
  if (!matched) return res.status(200).json({ id: null })

  const integrations = { ...(matched.integrations || {}), lineUserId: uid }
  await admin.from('customers').update({ integrations }).eq('id', matched.id)
  return res.status(200).json({ id: matched.id })
}
