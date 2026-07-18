// LINE公式アカウントの状態管理（チャンネルアクセストークンの失効・利用制限＝いわゆる
// 「BAN」の簡易検知）。新規テーブルは作らず、既存のsettingsテーブル(id=1)のJSON列
// （settings.lineHealth）に状態を保存する。
//
// 仕組み：
// ・LINE Messaging APIの GET /v2/bot/info を叩く。トークンが有効・チャンネルが生きて
//   いれば200でbot情報が返り、失効・利用制限されていれば401/403等のエラーになる。
// ・cron-birthday.js（毎日9:00 JST実行）の冒頭で自動チェックし、送信の有無に関わらず
//   毎日1回は必ず状態が更新されるようにする。
// ・設定画面から「今すぐ確認」でも同じチェックを手動実行できる（notifications.js）。

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

// LINEチャンネルが生きているか実際にAPIを叩いて確認する
export async function checkLineChannel() {
  if (!LINE_TOKEN) return { ok: false, error: 'LINE_CHANNEL_ACCESS_TOKENが未設定です' }
  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${LINE_TOKEN}` },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, status: res.status, error: `LINE APIがエラーを返しました（status ${res.status}）: ${body.slice(0, 200)}` }
    }
    const data = await res.json().catch(() => ({}))
    return { ok: true, displayName: data.displayName, basicId: data.basicId }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

// チェック結果を settings.lineHealth に保存する（他の設定は壊さないよう読み直してマージ）
export async function saveLineHealth(supabase, result) {
  try {
    const { data: setRow, error: selErr } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle()
    if (selErr) { console.error('lineHealth: settings select failed', selErr); return }
    const current = (setRow && setRow.data) || {}
    const prev = current.lineHealth || {}
    const now = new Date().toISOString()
    const nextHealth = result.ok
      ? {
          ok: true,
          lastCheckedAt: now,
          lastOkAt: now,
          consecutiveFailures: 0,
          lastError: null,
          displayName: result.displayName || prev.displayName || null,
        }
      : {
          ok: false,
          lastCheckedAt: now,
          lastOkAt: prev.lastOkAt || null,
          consecutiveFailures: (prev.consecutiveFailures || 0) + 1,
          lastError: result.error || `status ${result.status}`,
          displayName: prev.displayName || null,
        }
    const { error: upErr } = await supabase
      .from('settings')
      .upsert({ id: 1, data: { ...current, lineHealth: nextHealth }, updated_at: now })
    if (upErr) console.error('lineHealth: settings upsert failed', upErr)
    return nextHealth
  } catch (e) {
    console.error('saveLineHealth failed', e)
  }
}
