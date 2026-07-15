// LINE Messaging API でメッセージを送るサーバーレス関数
// POST /api/send-line
// 3つのモードを1関数にまとめている（Vercel Hobbyプランのサーバーレス関数数12個の上限対策。
// 以前は api/broadcast-line.js が別ファイルだったが、ここに統合した）。
//
// モード1（単発push）  body: { userId, messages: [{ type: 'text', text: '...' }] }
// モード2（一斉push・customerIds指定）
//   body: { customerIds: string[] }
//   フォロー漏れ画面で選んだ顧客へ、名前を差し込んだ「再来店のお声がけ」を一人ずつ送る。
//   LINEのmulticast APIは全員へ同一文面しか送れないため、{customerName}等を差し込んで
//   内容を変えられるよう、個別push（cron-remind.js / cron-birthday.jsと同じ方式）をループする。
// モード3（トーク画面からの返信）  body: { customerId, text }
//   顧客詳細のトーク画面から、スタッフが自由文でLINE返信する。送信後にmessagesテーブルへも記録する。

import { createClient } from '@supabase/supabase-js'
import { getTemplates, applyTemplate } from './_lib/templates.js'
import { DEFAULT_SALON_NAME } from '../src/config/defaults.js'

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

async function pushLine(userId, messages) {
  if (!LINE_TOKEN || !userId) return { ok: false }
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: userId, messages }),
  })
  return { ok: response.ok, status: response.status, data: await response.json().catch(() => null) }
}

async function handleBroadcast(req, res) {
  const { customerIds } = req.body || {}
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    return res.status(400).json({ error: 'customerIds required' })
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
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
    const result = await pushLine(lineUserId, [{ type: 'text', text }])
    if (result.ok) sent++
    else skipped++
  }

  return res.status(200).json({ ok: true, sent, skipped, total: customerIds.length })
}

async function handleSingle(req, res) {
  if (!LINE_TOKEN) return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' })
  const { userId, messages } = req.body || {}
  if (!userId || !messages?.length) return res.status(400).json({ error: 'userId and messages required' })

  const result = await pushLine(userId, messages)
  if (!result.ok) return res.status(result.status || 500).json({ error: result.data })
  return res.status(200).json({ ok: true })
}

async function handleReply(req, res) {
  if (!LINE_TOKEN) return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' })
  const { customerId, text } = req.body || {}
  if (!customerId || !text) return res.status(400).json({ error: 'customerId and text required' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: customer, error } = await supabase
    .from('customers').select('id, integrations').eq('id', customerId).maybeSingle()
  if (error) return res.status(500).json({ error })
  const lineUserId = customer?.integrations?.lineUserId
  if (!lineUserId) return res.status(400).json({ error: 'この顧客はLINE未連携です' })

  const result = await pushLine(lineUserId, [{ type: 'text', text }])
  if (!result.ok) return res.status(result.status || 500).json({ error: result.data })

  const { data: inserted, error: insErr } = await supabase.from('messages').insert({
    customer_id: customerId,
    line_user_id: lineUserId,
    direction: 'out',
    text,
    sender: 'スタッフ',
    read: true,
  }).select().maybeSingle()
  if (insErr) console.error('message insert', insErr)

  return res.status(200).json({ ok: true, message: inserted })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (Array.isArray(req.body?.customerIds)) return handleBroadcast(req, res)
  if (req.body?.customerId && typeof req.body?.text === 'string') return handleReply(req, res)
  return handleSingle(req, res)
}
