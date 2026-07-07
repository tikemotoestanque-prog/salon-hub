// Instagram Messaging Webhook 受信（動作検証用）
// GET  /api/ig-webhook … Metaのwebhook検証（hub.challengeを返す）
// POST /api/ig-webhook … DM受信イベントをログ出力（まずは受信確認が目的）
//
// Meta側のWebhook登録で使う値：
//   コールバックURL … https://okaeru-demo.vercel.app/api/ig-webhook
//   トークンを検証   … 下の VERIFY_TOKEN と同じ文字列を入力

const VERIFY_TOKEN = process.env.IG_VERIFY_TOKEN || 'okaeru_ig_verify'

export default async function handler(req, res) {
  // --- Webhookの検証（Metaにコールバックを登録する時に1度だけ呼ばれる） ---
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // 検証成功 → challengeをそのまま返すとMetaが登録を完了する
      return res.status(200).send(challenge)
    }
    return res.status(403).send('Forbidden')
  }

  // --- DM受信 ---
  if (req.method === 'POST') {
    try {
      const body = req.body || {}
      // まずは丸ごとログに出して、届いていることを確認する
      console.log('[IG webhook] received:', JSON.stringify(body))
      for (const entry of body.entry || []) {
        for (const ev of entry.messaging || []) {
          const senderId = ev.sender?.id
          const text = ev.message?.text
          console.log(`[IG DM] from=${senderId} text=${text}`)
        }
      }
    } catch (e) {
      console.error('[IG webhook] error', e)
    }
    // Metaには常に200を返す（返さないと再送が続く）
    return res.status(200).send('EVENT_RECEIVED')
  }

  return res.status(405).end()
}
