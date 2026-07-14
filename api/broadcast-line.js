// フォロー漏れ画面から選んだ顧客へ、LINEで「再来店のお声がけ」をまとめて送る
// POST /api/broadcast-line
// body: { customerIds: string[] }
//
// LINEのmulticast APIは全員へ同一文面しか送れないため、{customerName}等を差し込んで
// 一人ずつ内容を変えられるよう、送信自体は個別push（cron-remind.js / cron-birthday.js と同じ方式）
// をループで呼び出す。認証は既存の api/send-line.js / api/notifications.js と同様、
// 管理画面からのみ呼ばれる前提で追加のトークンチェックは行わない。

import { createClient } from '@supabase/supabase-js'
import { getTemplates, applyTemplate } from './_lib/templates.js'
import { DEFAULT_SALON_NAME } from '../src/config/defaults.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

async function sendLine(userId, text) {
  if (!LINE_TOKEN || !userId) return { ok: false, reason: 'no-token-or-user' }
  const r = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  })
  return { ok: r.ok }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { customerIds } = req.body || {}
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return res.status(400).json({ error: 'customerIds required' })
  }

  const [{ data: customers, error }, { data: setRow }] = await Promise.all([
    supabase.from('customers').select('id, name, integrations').in('id', customerIds),
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
  ])
  if (error) return res.status(500).json({ error })

  const settings = (setRow && setRow.data) || {}
  const salonName = settings.salonName || DEFAULT_SALON_NAME
  const tmpl = getTemplates(settings)

  let sent = 0
  let skipped = 0
  for (const c of customers || []) {
    const lineUserId = c.integrations?.lineUserId
    if (!lineUserId) { skipped++; continue }
    const text = applyTemplate(tmpl.reengage, { customerName: c.name, salonName })
    const result = await sendLine(lineUserId, text)
    if (result.ok) sent++
    else skipped++
  }

  return res.status(200).json({ ok: true, sent, skipped, total: customerIds.length })
}
