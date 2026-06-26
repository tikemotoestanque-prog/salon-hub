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

// メニュー名から料金を概算（デモ用。実際の金額が記録されていればそちらを優先）
export function priceOf(menu) {
  if (!menu) return 4500
  let p = 4500 // カット基本
  if (/カラー|白髪/.test(menu)) p += 4000
  if (/ブリーチ/.test(menu)) p += 5000
  if (/パーマ|矯正|デジ/.test(menu)) p += 6000
  if (/TR|トリートメント/.test(menu)) p += 2000
  if (/スパ/.test(menu)) p += 2500
  if (/眉/.test(menu)) p += 500
  return p
}
export function visitPrice(v) {
  return v && v.price ? Number(v.price) : priceOf(v && v.menu)
}

// 来店履歴から平均来店周期（日）を算出
export function avgIntervalDays(history) {
  if (!history || history.length < 2) return null
  const ds = history.map((h) => new Date(h.date + 'T00:00:00').getTime()).sort((a, b) => b - a)
  let sum = 0
  for (let i = 0; i < ds.length - 1; i++) sum += (ds[i] - ds[i + 1]) / 86400000
  return Math.round(sum / (ds.length - 1))
}
export function computePattern(history) {
  const a = avgIntervalDays(history)
  if (a == null) return 'まだ来店1回・パターン未確定'
  return `平均${a}日周期（直近${Math.min(history.length, 10)}回）`
}

// 予約の空き判定（スタイリストの同時対応人数 capacity を考慮）
const _toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
export function staffCap(capacity, staff) { return (capacity && capacity[staff]) || 1 }
// 指定スタッフ・日付・時間帯が空いているか（同時対応人数の範囲内か）
export function slotFree(reservations, date, staff, start, dur, capacity) {
  const s = _toMin(start), e = s + dur
  const overlapping = reservations.filter((r) => !r.cancelled && r.date === date && r.staff === staff && _toMin(r.start) < e && _toMin(r.end) > s).length
  return overlapping < staffCap(capacity, staff)
}
// おまかせ時、その時間に空きのあるスタッフを1人返す（なければ null）
export function pickFreeStaff(reservations, date, start, dur, capacity, staffList) {
  return staffList.find((s) => slotFree(reservations, date, s, start, dur, capacity)) || null
}

// ===== 休日判定 =====
const WD_NAMES = ['日', '月', '火', '水', '木', '金', '土']
export function weekdayOf(iso) { return new Date(iso + 'T00:00:00').getDay() }
// その日が店休日か（定休日 or 臨時休業）。理由つきで返す
export function shopClosedReason(settings, iso) {
  if (!settings || !iso) return null
  const wd = weekdayOf(iso)
  if ((settings.closedWeekdays || []).includes(wd)) return `定休日（毎週${WD_NAMES[wd]}曜）`
  if ((settings.closedDates || []).includes(iso)) return '臨時休業日'
  return null
}
export function isShopClosed(settings, iso) { return shopClosedReason(settings, iso) != null }
// スタッフがその日休みか
export function isStaffOff(settings, staff, iso) {
  return !!(settings && settings.staffOff && (settings.staffOff[staff] || []).includes(iso))
}
// その日に出勤しているスタッフ一覧
export function workingStaff(settings, staffList, iso) {
  return staffList.filter((s) => !isStaffOff(settings, s, iso))
}

// 来店回数・累計・最終来店日からステータスを自動判定（設定の閾値を使う）
export function computeStatus(c, th) {
  const days = daysSince(c.lastVisit)
  if (days == null) return 'new'
  if (days >= th.dormantDays) return 'dormant'
  if (days >= th.followupDays) return 'followup'
  if ((c.visitCount || 0) >= th.vipVisits || (c.totalSpent || 0) >= th.vipSpent) return 'vip'
  if ((c.visitCount || 0) <= th.newMaxVisits) return 'new'
  return 'regular'
}
