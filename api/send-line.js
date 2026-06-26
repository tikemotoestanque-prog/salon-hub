// LINE Messaging API でメッセージを送るサーバーレス関数
// POST /api/send-line
// body: { userId, messages: [{ type: 'text', text: '...' }] }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' })

  const { userId, messages } = req.body
  if (!userId || !messages?.length) return res.status(400).json({ error: 'userId and messages required' })

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  })

  const data = await response.json()
  if (!response.ok) return res.status(response.status).json({ error: data })
  return res.status(200).json({ ok: true })
}
