// アプリ基準日（サンプルデータと整合）
export const TODAY = new Date('2026-06-24T00:00:00')

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
