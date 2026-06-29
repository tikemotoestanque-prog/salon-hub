// LINE Messaging API でテキストをpush送信（失敗は握りつぶす＝デモでも落とさない）
const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

export async function pushText(userId, text) {
  if (!TOKEN || !userId) return
  try {
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ to: userId, messages: [{ type: 'text', text }] }),
    })
  } catch { /* ignore */ }
}
