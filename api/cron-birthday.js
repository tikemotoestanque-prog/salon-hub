// 誕生日メッセージ自動配信 Cron関数
// Vercel Cron: 毎日9:00 JST (= 00:00 UTC) に実行
// vercel.json の crons に設定が必要
//
// customers.birthday の月日が「今日」と一致する顧客へLINEでお祝いメッセージを送る。
// 同じ年に二重送信しないよう、customers.integrations.lastBirthdaySentYear を見て判定・更新する。

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

  const today = new Date()
  const todayMD = today.toISOString().slice(5, 10) // 'MM-DD'
  const thisYear = today.getFullYear()

  const [{ data: customers }, { data: setRow }] = await Promise.all([
    supabase.from('customers').select('id, name, birthday, integrations'),
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
  ])
  const settings = (setRow && setRow.data) || {}
  const salonName = settings.salonName || DEFAULT_SALON_NAME
  const tmpl = getTemplates(settings)

  const targets = (customers || []).filter((c) => {
    if (!c.birthday || c.birthday.length < 10) return false
    if (c.birthday.slice(5, 10) !== todayMD) return false
    const lineUserId = c.integrations?.lineUserId
    if (!lineUserId) return false
    if (c.integrations?.lastBirthdaySentYear === thisYear) return false // 今年は送信済み
    return true
  })

  let sent = 0
  for (const c of targets) {
    const lineUserId = c.integrations.lineUserId
    const text = applyTemplate(tmpl.birthday, { customerName: c.name, salonName })
    await sendLine(lineUserId, text)
    await supabase
      .from('customers')
      .update({ integrations: { ...c.integrations, lastBirthdaySentYear: thisYear } })
      .eq('id', c.id)
    sent++
  }

  return res.status(200).json({ ok: true, sent, date: today.toISOString().slice(0, 10) })
}
