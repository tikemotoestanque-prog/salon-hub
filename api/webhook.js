// LINE Webhook受信 → Supabaseのnotificationsテーブルに保存
// POST /api/webhook

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getTemplates, applyTemplate } from './_lib/templates.js'
import { DEFAULT_SALON_NAME } from '../src/config/defaults.js'

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
        const { data: setRow } = await supabase
          .from('settings').select('data').eq('id', 1).maybeSingle()
        const settings = (setRow && setRow.data) || {}
        const salonName = settings.salonName || DEFAULT_SALON_NAME
        const text = applyTemplate(getTemplates(settings).greeting, { salonName })
        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            to: event.source.userId,
            messages: [{ type: 'text', text }],
          }),
        }).catch(() => {})
      }
      continue
    }

    // ブロックイベント → 通知として記録
    if (event.type === 'unfollow') {
      const lineUserId = event.source?.userId
      let customerId = null
      let customerName = null
      if (lineUserId) {
        const { data } = await supabase
          .from('customers')
          .select('id, name')
          .eq('integrations->>lineUserId', lineUserId)
          .maybeSingle()
        if (data) { customerId = data.id; customerName = data.name }
      }
      await supabase.from('notifications').insert({
        type: 'line_block',
        line_user_id: lineUserId,
        customer_id: customerId,
        customer_name: customerName,
        message: 'LINEをブロックしました',
        read: false,
        created_at: new Date(event.timestamp).toISOString(),
      })
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

    // トーク画面用：会話履歴として保存（テーブル未作成でも通知側は壊れないよう失敗許容）
    await supabase.from('messages').insert({
      customer_id: customerId,
      line_user_id: lineUserId,
      direction: 'in',
      text,
      read: false,
      created_at: timestamp,
    }).then(({ error }) => error && console.error('message insert', error))

    // キーワード自動返信：設定済みのキーワードを含んでいたら即返信（設定 > キーワード自動返信）
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (token && event.replyToken) {
      const { data: setRow } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle()
      const settings = (setRow && setRow.data) || {}
      const rules = Array.isArray(settings.keywordReplies) ? settings.keywordReplies : []
      const matched = rules.find((r) => r.keyword && text.includes(r.keyword))
      if (matched && matched.reply) {
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ replyToken: event.replyToken, messages: [{ type: 'text', text: matched.reply }] }),
        }).catch(() => {})

        // 自動返信した内容もトークの会話履歴に残す（顧客が見ても不自然にならないように）
        await supabase.from('messages').insert({
          customer_id: customerId,
          line_user_id: lineUserId,
          direction: 'out',
          text: matched.reply,
          sender: '自動返信',
          read: true,
          created_at: new Date().toISOString(),
        }).then(({ error }) => error && console.error('auto-reply message insert', error))
      }
    }
  }

  res.status(200).json({ ok: true })
}
