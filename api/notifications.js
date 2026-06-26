// GET /api/notifications → 未読通知一覧
// POST /api/notifications { id } → 既読にする

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return res.status(500).json({ error })
    return res.status(200).json({ notifications: data })
  }

  if (req.method === 'POST') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
