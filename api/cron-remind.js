// 前日リマインド送信 Cron関数
// Vercel Cron: 毎日17:00 JST (= 08:00 UTC) に実行
// vercel.json の crons に設定が必要

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // サービスロールキー（RLS bypass）
)

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

async function sendLine(userId, text) {
  if (!LINE_TOKEN || !userId) return
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
  })
}

export default async function handler(req, res) {
  // Vercel Cronからのみ受け付ける
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // 明日の予約を取得
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = tomorrow.toISOString().slice(0, 10)

  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, customers(name, integrations)')
    .eq('date', tomorrowISO)
    .eq('cancelled', false)

  let sent = 0
  for (const r of reservations || []) {
    const lineUserId = r.customers?.integrations?.lineUserId
    if (!lineUserId) continue
    const text = `${r.customers.name}様、明日のご来店リマインドです✂️\n\n📅 ${tomorrowISO} ${r.start}〜\n💇 ${r.menu}\n👤 担当：${r.staff}\n\nお気をつけてお越しください🌿`
    await sendLine(lineUserId, text)
    sent++
  }

  return res.status(200).json({ ok: true, sent, date: tomorrowISO })
}
