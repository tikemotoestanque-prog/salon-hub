// アプリ基準日（実行時の今日）
export const TODAY = (() => { const d = new Date(); d.setHours(0,0,0,0); return d })()
export const TODAY_ISO = `${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}-${String(TODAY.getDate()).padStart(2,'0')}`

// デモ環境判定：okaeru-demo.vercel.app または VITE_DEMO=1 のときだけ true。
// 実サロンのfork版（別URL・VITE_DEMO未設定）では false ＝勝手な自動ステータスは付かない。
export const IS_DEMO = (() => {
  try {
    if (import.meta.env && import.meta.env.VITE_DEMO === '1') return true
    if (typeof window !== 'undefined' && /(^|\.)okaeru-demo\.vercel\.app$/i.test(window.location.hostname || '')) return true
  } catch (e) {}
  return false
})()

// 予約の進行状況を現在時刻から算出（デモ表示専用・データは書き換えない）
// 戻り値: 'done'（来店済み）/ 'now'（来店中）/ 'upcoming'（来店予定）
export function resProgress(r, now = new Date()) {
  if (!r || !r.date) return 'upcoming'
  const startAt = new Date(`${r.date}T${r.start || '00:00'}:00`)
  const endAt = new Date(`${r.date}T${r.end || r.start || '00:00'}:00`)
  if (now >= endAt) return 'done'
  if (now >= startAt) return 'now'
  return 'upcoming'
}

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

// ===== メニュー連動の「拘束/放置」モデル =====
// カラー・パーマ等の化学系メニューは、塗布→放置(薬剤待ち)→流し/仕上げ の流れで、
// 放置中はスタイリストの手が空く。その間に別のお客様（短いカット等）を2人目として受けられる。
const CHEMICAL = /カラー|白髪|ブリーチ|パーマ|矯正|デジ/
const _overlap = (a, b, c, d) => a < d && c < b // 区間[a,b)と[c,d)が重なるか

// メニューの「拘束(hands-on)」時間帯を返す。化学系は中央に放置（空き）ができる。
export function menuBusyIntervals(menu, startMin, dur) {
  const end = startMin + dur
  const APPLY = 15, FINISH = 10 // 塗布(前半拘束) / 流し・ブロー(後半拘束)
  if (!CHEMICAL.test(menu || '') || dur < APPLY + FINISH + 15) return [[startMin, end]]
  // 前半[start, start+APPLY] と 後半[end-FINISH, end] が拘束。間は放置（空き）。
  return [[startMin, startMin + APPLY], [end - FINISH, end]]
}

// そのスタッフが、指定メニューを startMin から受けられるか。
// ①同時に居るお客様は最大2人 ②拘束(hands-on)時間が既存予約と重ならない（放置中なら2人目OK）。
export function staffFreeForMenu(reservations, date, staff, startMin, menu, dur) {
  const end = startMin + dur
  const mine = reservations.filter((r) => !r.cancelled && r.date === date && r.staff === staff)
  // ① 同時客数（時間帯が重なる予約）は最大2人まで
  const concurrent = mine.filter((r) => _overlap(startMin, end, _toMin(r.start), _toMin(r.end))).length
  if (concurrent >= 2) return false
  // ② 拘束時間の衝突がないこと
  const newBusy = menuBusyIntervals(menu, startMin, dur)
  for (const r of mine) {
    const rBusy = menuBusyIntervals(r.menu, _toMin(r.start), _toMin(r.end) - _toMin(r.start))
    for (const [a, b] of newBusy) for (const [c, d] of rBusy) if (_overlap(a, b, c, d)) return false
  }
  return true
}

// おまかせ：そのメニューを受けられる出勤スタッフのうち、その日の担当件数が最少の人（負荷分散）。
// 同数なら担当合計時間が短い人 → それも同じならリスト順。受けられる人がいなければ null。
export function pickBalancedStaffForMenu(reservations, date, startMin, menu, dur, staffList) {
  const free = staffList.filter((s) => staffFreeForMenu(reservations, date, s, startMin, menu, dur))
  if (free.length === 0) return null
  const dayRes = reservations.filter((r) => !r.cancelled && r.date === date)
  const load = (s) => {
    const mine = dayRes.filter((r) => r.staff === s)
    return { count: mine.length, minutes: mine.reduce((t, r) => t + (_toMin(r.end) - _toMin(r.start)), 0) }
  }
  return free.map((s) => ({ s, ...load(s) })).sort((a, b) => a.count - b.count || a.minutes - b.minutes)[0].s
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

// スタッフの週1固定休み（曜日ルール）。sampleData.computeStaffOff と同じ規則。
// staffList の並び順インデックスで割り当て：0→月, 1→水, 2→木, 3→金 …（火曜は定休なので除く）。
// DBに休み情報を持たない場面（サーバーのAPI）でも、クライアントと同じ休みを再現するために使う。
export const OFF_WEEKDAYS = [1, 3, 4, 5]
export function isStaffOffByRule(staffList, staff, iso) {
  const i = staffList.indexOf(staff)
  if (i < 0) return false
  return weekdayOf(iso) === OFF_WEEKDAYS[i % OFF_WEEKDAYS.length]
}
export function workingStaffByRule(staffList, iso) {
  return staffList.filter((s) => !isStaffOffByRule(staffList, s, iso))
}

// 10回ごとのマイルストーンクーポン定義（お客様画面とスタッフ画面で共用）
export const MILESTONE_COUPONS = [
  { t: 'カット 10%OFF', s: '10回来店達成おめでとうございます！', emoji: '🎉' },
  { t: 'トリートメント 無料', s: '20回来店達成！いつもありがとうございます✨', emoji: '✨' },
  { t: 'カット＋カラー 15%OFF', s: '30回来店達成！本当にありがとうございます💎', emoji: '💎' },
  { t: 'カット 10%OFF', s: '40回来店達成！ありがとうございます🎉', emoji: '🎉' },
  { t: 'VIP限定メニュー 無料', s: '50回来店達成！あなたは特別なお客様です👑', emoji: '👑' },
]

// 顧客の来店回数からスタンプ・マイルストーン状況を算出
// usedKeys: お客様画面で「使用済み」にしたクーポンのtag配列（同一ブラウザのlocalStorageから取得可能）
export function stampStatus(c, usedKeys = []) {
  const visitCount = c.visitCount || 0
  const currentStamps = visitCount % 10
  const completedCycles = Math.floor(visitCount / 10)
  const nextMilestone = (completedCycles + 1) * 10
  const earned = []
  for (let i = 0; i < completedCycles; i++) {
    const def = MILESTONE_COUPONS[Math.min(i, MILESTONE_COUPONS.length - 1)]
    earned.push({ tag: `cycle_${i + 1}`, cycleNum: i + 1, used: usedKeys.includes(`cycle_${i + 1}`), ...def })
  }
  const nextCoupon = MILESTONE_COUPONS[Math.min(completedCycles, MILESTONE_COUPONS.length - 1)]
  return { visitCount, currentStamps, completedCycles, nextMilestone, earned, nextCoupon }
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
