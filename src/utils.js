// アプリ基準日（サンプルデータと整合）
export const TODAY = new Date('2026-06-24T00:00:00')
export const TODAY_ISO = '2026-06-24'

// Googleクチコミの状態を正規化（旧データの値も新3段階に寄せる）
export function gReview(v) {
  if (v === '投稿済' || v === 'クチコミ投稿済') return '投稿済'
  if (v === '依頼送信済' || v === '投稿依頼済') return '依頼送信済'
  return '未送信'
}

export function daysSince(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  return Math.floor((TODAY - d) / 86400000)
}

export function initials(name) {
  if (!name) return '?'
  return name.trim().charAt(0)
}

export function yen(n) {
  return '¥' + (n || 0).toLocaleString('ja-JP')
}
