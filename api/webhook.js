// LINE Webhook受信 → Supabaseのnotificationsテーブルに保存
// POST /api/webhook

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function verifySignature(body, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) return true // 未設定時はスキップ（開発用）
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64')
  return hash === signature
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 署名検証
  const sig = req.headers['x-line-signature']
  const rawBody = JSON.stringify(req.body)
  if (!verifySignature(rawBody, sig)) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const events = req.body?.events || []

  for (const event of events) {
    // 友達追加イベント → 即時あいさつメッセージ
    if (event.type === 'follow') {
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
      if (token) {
        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            to: event.source.userId,
            messages: [{
              type: 'text',
              text: 'ご登録ありがとうございます😊\nHair Salon GRACEです✂️\n\nご予約は下のメニュー「ご予約」から24時間いつでもOKです。\nお悩みやなりたいイメージも、このトークからお気軽にご相談くださいね🌿',
            }],
          }),
        }).catch(() => {})
      }
      continue
    }

    // テキストメッセージのみ保存
    if (event.type !== 'message' || event.message?.type !== 'text') continue

    const lineUserId = event.source?.userId
    const text = event.message.text
    const timestamp = new Date(event.timestamp).toISOString()

    // LINE IDから顧客を検索
    let customerId = null
    let customerName = null
    if (lineUserId) {
      const { data } = await supabase
        .from('customers')
        .select('id, name')
        .eq('integrations->>lineUserId', lineUserId)
        .maybeSingle()
      if (data) {
        customerId = data.id
        customerName = data.name
      }
    }

    await supabase.from('notifications').insert({
      type: 'line_message',
      line_user_id: lineUserId,
      customer_id: customerId,
      customer_name: customerName,
      message: text,
      read: false,
      created_at: timestamp,
    })
  }

  res.status(200).json({ ok: true })
}
