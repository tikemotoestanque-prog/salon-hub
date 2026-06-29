// LINE IDトークンをサーバー側で検証し、信頼できる lineUserId(sub) を返す。
// これにより「URLのidを知っているだけ」では他人になりすませない（本人保証）。
const CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID
export const hasChannelId = Boolean(CHANNEL_ID)

// Authorization: Bearer <idToken> からトークンを取り出す
export function bearer(req) {
  const h = req.headers['authorization'] || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

// IDトークンを検証 → 正しければ LINEユーザーID(sub) を、ダメなら null を返す
export async function verifyIdToken(idToken) {
  const r = await verifyIdTokenDetailed(idToken)
  return r.sub
}

// 診断用：検証結果を理由つきで返す { sub, reason, detail }
export async function verifyIdTokenDetailed(idToken) {
  if (!CHANNEL_ID) return { sub: null, reason: 'no_channel_id' }
  if (!idToken) return { sub: null, reason: 'no_token' }
  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: CHANNEL_ID }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { sub: null, reason: 'verify_failed', detail: data.error_description || data.error || res.status }
    return { sub: data.sub || null, reason: data.sub ? 'ok' : 'no_sub' }
  } catch (e) {
    return { sub: null, reason: 'exception', detail: String(e) }
  }
}

// リクエストから本人のLINEユーザーIDを取得（無効なら null）
export async function userIdFrom(req) {
  return verifyIdToken(bearer(req))
}

// デモ閲覧を許可するか（salopiデモ環境のみ DEMO_MODE=1）。
// 実サロンのfork版は未設定＝トークン必須で本人のみ。
export const demoAllowed = process.env.DEMO_MODE === '1'
