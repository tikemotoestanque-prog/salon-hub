// GET /api/notifications → 未読通知一覧
// POST /api/notifications { id } → 既読にする
// POST /api/notifications { action: 'listStaff' | 'createStaff' | 'deleteStaff', ... }
//   → スタッフのログインアカウント管理（オーナー権限のみ・自己サービス化）
//   Vercel Hobbyプランのサーバーレス関数数12個の上限のため、この既存ファイルに同居させている
//   （send-line.js・cron-birthday.jsと同じ対策パターン）。

import { createClient } from '@supabase/supabase-js'
import { admin } from './_lib/admin.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// リクエストのAuthorizationヘッダーからログイン中の本人を特定し、
// オーナー権限（user_metadata.role !== 'staff'）であることを確認する
async function requireOwner(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  const role = data.user.user_metadata?.role === 'staff' ? 'staff' : 'owner'
  if (role !== 'owner') return null
  return data.user
}

async function handleStaffAction(req, res) {
  const { action } = req.body || {}
  const caller = await requireOwner(req)
  if (!caller) return res.status(403).json({ error: 'オーナー権限が必要です' })

  if (action === 'listStaff') {
    const { data, error } = await admin.auth.admin.listUsers()
    if (error) return res.status(500).json({ error: error.message })
    const staff = data.users
      .map((u) => ({ id: u.id, email: u.email, role: u.user_metadata?.role === 'staff' ? 'staff' : 'owner', createdAt: u.created_at }))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    return res.status(200).json({ staff })
  }

  if (action === 'createStaff') {
    const { email, password, role } = req.body
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'メールアドレスと6文字以上のパスワードが必要です' })
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password,
      email_confirm: true,
      user_metadata: { role: role === 'owner' ? 'owner' : 'staff' },
    })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true, id: data.user.id })
  }

  if (action === 'deleteStaff') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    if (id === caller.id) return res.status(400).json({ error: '自分自身のアカウントは削除できません' })
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ error: 'unknown action' })
}

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
    if (req.body?.action) return handleStaffAction(req, res)
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
