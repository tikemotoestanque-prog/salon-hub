// LINE アクセストークンをサーバー側で検証し、信頼できる lineUserId を返す。
// LIFFの liff.getAccessToken() は openidスコープに依存せず確実に取れるため、
// IDトークン方式よりハマりにくい。検証は LINE のプロフィールAPIを叩いて行う
// （アクセストークンが無効なら 401 が返る＝なりすまし不可）。
// これにより「URLのidを知っているだけ」では他人になりすませない（本人保証）。

// Authorization: Bearer <accessToken> からトークンを取り出す
export function bearer(req) {
  const h = req.headers['authorization'] || ''
  return h.startsWith('Bearer ') ? h.slice(7) : ''
}

// アクセストークンを LINE プロフィールAPIで検証し、userId を返す。
// 診断用に理由つきで返す { sub, reason, detail }
export async function verifyTokenDetailed(accessToken) {
  if (!accessToken) return { sub: null, reason: 'no_token' }
  try {
    const res = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { sub: null, reason: 'verify_failed', detail: data.message || res.status }
    return { sub: data.userId || null, reason: data.userId ? 'ok' : 'no_user' }
  } catch (e) {
    return { sub: null, reason: 'exception', detail: String(e) }
  }
}

// 正しければ LINEユーザーID を、ダメなら null を返す
export async function verifyToken(accessToken) {
  return (await verifyTokenDetailed(accessToken)).sub
}

// リクエストから本人のLINEユーザーIDを取得（無効なら null）
export async function userIdFrom(req) {
  return verifyToken(bearer(req))
}

// デモ閲覧を許可するか（オカエルデモ環境のみ DEMO_MODE=1）。
// 実サロンのfork版は未設定＝トークン必須で本人のみ。
export const demoAllowed = process.env.DEMO_MODE === '1'
