// 前日リマインド送信 Cron関数
// Vercel Cron: 毎日17:00 JST (= 08:00 UTC) に実行
// vercel.json の crons に設定が必要

import { createClient } from '@supabase/supabase-js'
import { getTemplates, applyTemplate } from './_lib/templates.js'
import { DEFAULT_SALON_NAME } from '../src/config/defaults.js'

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

  const [{ data: reservations }, { data: setRow }] = await Promise.all([
    supabase
      .from('reservations')
      .select('*, customers(name, integrations)')
      .eq('date', tomorrowISO)
      .eq('cancelled', false),
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
  ])
  const settings = (setRow && setRow.data) || {}
  const salonName = settings.salonName || DEFAULT_SALON_NAME
  const tmpl = getTemplates(settings)

  let sent = 0
  for (const r of reservations || []) {
    const lineUserId = r.customers?.integrations?.lineUserId
    if (!lineUserId) continue
    const text = applyTemplate(tmpl.reminder, {
      customerName: r.customers.name, salonName, date: tomorrowISO, time: r.start, menu: r.menu, staff: r.staff,
    })
    await sendLine(lineUserId, text)
    sent++
  }

  return res.status(200).json({ ok: true, sent, date: tomorrowISO })
}
