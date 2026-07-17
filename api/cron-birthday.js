// 誕生日メッセージ ＋ 来店タイミング個別リマインド 自動配信 Cron関数
// Vercel Cron: 毎日9:00 JST (= 00:00 UTC) に実行
// vercel.json の crons に設定が必要
//
// ファイル名は cron-birthday のままだが、Vercel Hobbyプランのサーバーレス関数数
// 12個の上限（send-line.jsの統合と同じ理由）のため、2種類の自動送信をこの1関数に
// まとめている。
//
// ①誕生日：customers.birthday の月日が「今日」と一致する顧客へLINEでお祝いメッセージ。
//   同じ年に二重送信しないよう、customers.integrations.lastBirthdaySentYear で判定・更新。
// ②来店タイミング個別リマインド：customers.history から算出した「その人の平均来店周期」を
//   もとに、最終来店日＋平均周期が「今日以降」に到達した顧客へLINEでお声がけ。
//   来店履歴が2件未満（平均周期が計算できない）の人は対象外＝従来通り
//   FollowUpAlerts.jsx の固定60日ルールでカバーする（二重の仕組みとして併存）。
//   同じ来店サイクルで二重送信しないよう、customers.integrations.lastRevisitNudgeSentDate
//   （最終来店日と比較し、まだ今回のサイクルで送っていなければ送信）で判定・更新。

import { createClient } from '@supabase/supabase-js'
import { getTemplates, applyTemplate } from './_lib/templates.js'
import { DEFAULT_SALON_NAME } from '../src/config/defaults.js'
import { avgIntervalDays } from '../src/utils.js'

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
  const todayISO = today.toISOString().slice(0, 10)
  const todayMD = today.toISOString().slice(5, 10) // 'MM-DD'
  const thisYear = today.getFullYear()

  const [{ data: customers }, { data: setRow }] = await Promise.all([
    supabase.from('customers').select('id, name, birthday, integrations, history, last_visit'),
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
  ])
  const settings = (setRow && setRow.data) || {}
  const salonName = settings.salonName || DEFAULT_SALON_NAME
  const tmpl = getTemplates(settings)

  const birthdayTargets = (customers || []).filter((c) => {
    if (!c.birthday || c.birthday.length < 10) return false
    if (c.birthday.slice(5, 10) !== todayMD) return false
    const lineUserId = c.integrations?.lineUserId
    if (!lineUserId) return false
    if (c.integrations?.lastBirthdaySentYear === thisYear) return false // 今年は送信済み
    return true
  })

  let sent = 0
  for (const c of birthdayTargets) {
    const lineUserId = c.integrations.lineUserId
    const text = applyTemplate(tmpl.birthday, { customerName: c.name, salonName })
    await sendLine(lineUserId, text)
    await supabase
      .from('customers')
      .update({ integrations: { ...c.integrations, lastBirthdaySentYear: thisYear } })
      .eq('id', c.id)
    sent++
  }

  // ②来店タイミング個別リマインド
  let revisitSent = 0
  const revisitTargets = (customers || []).filter((c) => {
    const lineUserId = c.integrations?.lineUserId
    if (!lineUserId) return false
    if (!c.last_visit) return false
    const avg = avgIntervalDays(c.history || [])
    if (avg == null) return false // 来店1回のみ・平均周期が計算できない人は対象外
    const expected = new Date(c.last_visit + 'T00:00:00')
    expected.setDate(expected.getDate() + avg)
    if (expected.toISOString().slice(0, 10) > todayISO) return false // まだ頃合い前
    // 今回のサイクル（前回来店以降）ですでに送っていればスキップ
    if (c.integrations?.lastRevisitNudgeSentDate && c.integrations.lastRevisitNudgeSentDate >= c.last_visit) return false
    return true
  })
  for (const c of revisitTargets) {
    const lineUserId = c.integrations.lineUserId
    const lastMenu = (c.history && c.history[0] && c.history[0].menu) || ''
    const text = applyTemplate(tmpl.revisitNudge, { customerName: c.name, salonName, menu: lastMenu })
    await sendLine(lineUserId, text)
    await supabase
      .from('customers')
      .update({ integrations: { ...c.integrations, lastRevisitNudgeSentDate: todayISO } })
      .eq('id', c.id)
    revisitSent++
  }

  return res.status(200).json({ ok: true, sent, revisitSent, date: todayISO })
}
