// LIFF（LINEミニアプリ）初期化とIDトークン取得の共通モジュール。
// お客様向けAPI呼び出しに本人のIDトークンを付けるために使う。
const LIFF_ID = import.meta.env.VITE_LIFF_ID
let initPromise

// liff.init を1度だけ実行し、liffインスタンス（失敗時はnull）を返す
export async function ensureLiff() {
  if (!LIFF_ID) return null
  if (!initPromise) {
    initPromise = import('@line/liff')
      .then(({ default: liff }) => liff.init({ liffId: LIFF_ID }).then(() => liff).catch(() => null))
      .catch(() => null)
  }
  return initPromise
}

// 本人のIDトークン（未ログイン・未設定なら null）
export async function getIdToken() {
  const liff = await ensureLiff()
  if (!liff || !liff.isLoggedIn()) return null
  try { return liff.getIDToken() } catch { return null }
}

// 未ログインならLINEログインへ誘導
export async function liffLogin() {
  const liff = await ensureLiff()
  if (liff && !liff.isLoggedIn()) liff.login()
  return liff
}

// IDトークンを Authorization に付けて fetch（JSON前提）
export async function apiFetch(url, opts = {}) {
  const token = await getIdToken()
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { ...opts, headers })
  return res
}
