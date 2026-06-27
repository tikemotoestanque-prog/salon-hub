// 初期サンプルデータ（5名分）。基準日: 2026-06-24
// status: vip / regular / new / followup / dormant

export const STAFF = ['田中', '佐藤', '鈴木', '高橋']

export const STATUS_META = {
  vip: { label: 'VIP', icon: '⭐', color: '#b8860b', bg: '#fff7e0' },
  regular: { label: '常連', icon: '💎', color: '#1f7a8c', bg: '#e3f4f7' },
  new: { label: '新規', icon: '🌱', color: '#2e7d32', bg: '#e6f4ea' },
  followup: { label: '要フォロー', icon: '⚠️', color: '#c25e00', bg: '#fff1e3' },
  dormant: { label: '休眠', icon: '💤', color: '#6b6b6b', bg: '#eeeeee' },
}

export const SOURCE_META = {
  hotpepper: { label: 'ホットペッパー', color: '#e8400f', bg: '#fde7e0' },
  instagram: { label: 'Instagram', color: '#c13584', bg: '#fbe6f1' },
  google: { label: 'Google', color: '#4285f4', bg: '#e6effd' },
  referral: { label: '紹介', color: '#2e7d32', bg: '#e6f4ea' },
  line: { label: '公式LINE', color: '#06c755', bg: '#e2f7ea' },
}

// 予約の経路（どこから入った予約か）。LINE以外も色で見分けられるように
export const RES_SOURCE_META = {
  line: { label: '公式LINE', short: 'LINE', color: '#06c755', bg: '#e2f7ea', bar: '#06c755' },
  phone: { label: '電話', short: '電話', color: '#c25e00', bg: '#fff1e3', bar: '#e08a1e' },
  hotpepper: { label: 'ホットペッパー', short: 'HPB', color: '#e8400f', bg: '#fde7e0', bar: '#e8400f' },
  walkin: { label: '来店・店頭', short: '来店', color: '#1f7a8c', bg: '#e3f4f7', bar: '#1f7a8c' },
  other: { label: 'その他', short: '他', color: '#6b6b6b', bg: '#eef0f2', bar: '#9b8e85' },
}

// 店ごとに編集できる設定の初期値（store経由でlocalStorageに保存）
export const DEFAULT_MENUS = ['カット', 'カット+カラー', 'カット+カラー+TR', 'カット+パーマ', 'カット+ブリーチ+カラー', '白髪染め', 'カット+白髪染め', 'カット+縮毛矯正', 'トリートメント', 'ヘッドスパ', 'メンズカット', '眉カット']
// ステータス自動判定のしきい値
export const DEFAULT_THRESHOLDS = { newMaxVisits: 2, vipVisits: 20, vipSpent: 250000, followupDays: 60, dormantDays: 90 }
// メニューごとのデフォルト所要時間（分）。未設定のメニューは60分扱い
export const DEFAULT_MENU_DURATIONS = {
  'カット': 60, 'カット+カラー': 120, 'カット+カラー+TR': 150,
  'カット+パーマ': 120, 'カット+ブリーチ+カラー': 180, '白髪染め': 90,
  'カット+白髪染め': 120, 'カット+縮毛矯正': 180, 'トリートメント': 60,
  'ヘッドスパ': 60, 'メンズカット': 45, '眉カット': 30,
}

export const DEFAULT_SETTINGS = {
  staff: [...STAFF],
  // スタイリストごとの同時対応人数（2なら同じ時間に2件まで予約可）
  capacity: STAFF.reduce((a, s) => { a[s] = s === '佐藤' ? 2 : 1; return a }, {}),
  menus: [...DEFAULT_MENUS],
  menuDurations: { ...DEFAULT_MENU_DURATIONS },
  statuses: STATUS_META,
  thresholds: { ...DEFAULT_THRESHOLDS },
  // 休日設定
  closedWeekdays: [2], // 定休日（0=日 … 6=土）。既定は火曜
  closedDates: [],     // 臨時休業日（ISO日付の配列）
  staffOff: {},        // スタッフ個別の休み { 'スタッフ名': ['2026-06-25', ...] }
  designationFees: {}, // 指名料 { 'スタッフ名': 金額 }
  openTime: '10:00',   // 営業開始時間
  closeTime: '19:00',  // 営業終了時間
  salonName: 'Hair Salon GRACE', // サロン名（顧客向け画面に表示）
}

// Googleクチコミ依頼の状態（未送信 → 依頼送信済 → 投稿済）
export const G_REVIEW_META = {
  未送信: { label: '未送信', cls: 's-none' },
  依頼送信済: { label: '依頼送信済', cls: 's-sched' },
  投稿済: { label: '投稿済', cls: 's-done' },
}

const visit = (date, staff, menu, note, recipe) => ({ date, staff, menu, note, recipe })

// 手書きの主要5名（リッチなデータ）。この後ろに自動生成95名を足して計100名にする。
const handCustomers = [
  {
    id: 'c001',
    name: '山田 花子',
    kana: 'ヤマダ ハナコ',
    gender: '女性',
    birthday: '1988-03-12',
    phone: '090-1234-5678',
    email: 'hanako.y@example.com',
    status: 'vip',
    source: 'hotpepper',
    lastVisit: '2026-06-10',
    lastMenu: 'カット + フルカラー + トリートメント',
    assignedStaff: '田中',
    visitCount: 28,
    totalSpent: 386000,
    hair: { type: '硬毛・多毛', condition: 'ダメージ中', scalp: '乾燥気味', notes: 'うねりが出やすい。梅雨時は特に広がる。' },
    allergies: ['ジアミン（弱）', 'ラテックス'],
    reservationPattern: '約5週間ごと・土曜午前を好む',
    integrations: { line: '連携済', instagram: '@hanako_y', google: '投稿済', googleDate: '2026-06-12' },
    stepDelivery: [
      { step: 1, title: '来店翌日サンクスメッセージ', status: '配信済', date: '2026-06-11' },
      { step: 2, title: '2週間後ホームケア案内', status: '配信済', date: '2026-06-24' },
      { step: 3, title: '4週間後次回予約リマインド', status: '予約', date: '2026-07-08' },
    ],
    history: [
      visit('2026-06-10', '田中', 'カット+フルカラー+TR', '根元リタッチ、毛先明るめ希望', { color: 'オラ8-5 + 6-66 = 1:1', oxy: 'OX 4.5% 60g', time: '35分' }),
      visit('2026-05-02', '田中', 'カット+カラー', '前回より暗めトーンに', { color: 'オラ7-1 + 6-7 = 2:1', oxy: 'OX 6% 50g', time: '30分' }),
      visit('2026-03-28', '田中', 'カット+カラー+TR', '', { color: 'オラ8-5', oxy: 'OX 4.5% 55g', time: '35分' }),
      visit('2026-02-21', '佐藤', 'カット', '', null),
      visit('2026-01-17', '田中', 'カット+カラー', '成人式前ケア', { color: 'オラ7-5', oxy: 'OX 6% 50g', time: '30分' }),
      visit('2025-12-06', '田中', 'カット+カラー+TR', '年末', { color: 'オラ8-5', oxy: 'OX 4.5% 60g', time: '40分' }),
      visit('2025-11-01', '田中', 'カット', '', null),
      visit('2025-09-27', '田中', 'カット+カラー', '', { color: 'オラ7-1', oxy: 'OX 6% 50g', time: '30分' }),
      visit('2025-08-23', '鈴木', 'カット+TR', '', null),
      visit('2025-07-19', '田中', 'カット+カラー', '', { color: 'オラ8-5', oxy: 'OX 6% 50g', time: '30分' }),
    ],
  },
  {
    id: 'c002',
    name: '佐々木 健一',
    kana: 'ササキ ケンイチ',
    gender: '男性',
    birthday: '1979-07-30',
    phone: '080-9876-5432',
    email: 'ken.sasaki@example.com',
    status: 'followup',
    source: 'referral',
    lastVisit: '2026-04-01',
    lastMenu: 'カット + メンズパーマ',
    assignedStaff: '佐藤',
    visitCount: 11,
    totalSpent: 92000,
    hair: { type: '軟毛・普通量', condition: '良好', scalp: '脂性', notes: 'クセが弱く、パーマがとれやすい。' },
    allergies: [],
    reservationPattern: '約2ヶ月ごと・平日夜を好む',
    integrations: { line: '連携済', instagram: '未連携', google: '依頼送信済', googleDate: '2026-04-02' },
    stepDelivery: [
      { step: 1, title: '来店翌日サンクスメッセージ', status: '配信済', date: '2026-04-02' },
      { step: 2, title: '60日経過フォローDM', status: '配信済', date: '2026-05-31' },
      { step: 3, title: '再来店クーポン', status: '未配信', date: '-' },
    ],
    history: [
      visit('2026-04-01', '佐藤', 'カット+メンズパーマ', 'ツイストスパイラル', { perm: 'ロッド中×ピンパーマ併用', agent: '1液 N 8分 / 2液 5分', time: '50分' }),
      visit('2026-02-03', '佐藤', 'カット', '', null),
      visit('2025-12-08', '佐藤', 'カット+パーマ', '', { perm: 'ロッド中', agent: '1液 N 8分', time: '45分' }),
      visit('2025-10-05', '佐藤', 'カット', '', null),
      visit('2025-08-10', '佐藤', 'カット', '', null),
      visit('2025-06-15', '高橋', 'カット+パーマ', '', { perm: 'ロッド大', agent: '1液 S 10分', time: '50分' }),
      visit('2025-04-20', '佐藤', 'カット', '', null),
      visit('2025-02-22', '佐藤', 'カット', '', null),
      visit('2024-12-14', '佐藤', 'カット+パーマ', '', { perm: 'ロッド中', agent: '1液 N 8分', time: '45分' }),
      visit('2024-10-19', '佐藤', 'カット', '', null),
    ],
  },
  {
    id: 'c003',
    name: '鈴木 美咲',
    kana: 'スズキ ミサキ',
    gender: '女性',
    birthday: '2001-11-05',
    phone: '070-2222-3333',
    email: 'misaki.s@example.com',
    status: 'new',
    source: 'instagram',
    lastVisit: '2026-06-20',
    lastMenu: 'カット + ブリーチ + ケアカラー',
    assignedStaff: '鈴木',
    visitCount: 2,
    totalSpent: 31000,
    hair: { type: '普通毛・普通量', condition: 'ブリーチ毛・ダメージ大', scalp: '敏感', notes: 'ブリーチ履歴あり。頭皮がしみやすいので保護必須。' },
    allergies: ['ジアミン（強）'],
    reservationPattern: 'まだ来店2回・パターン未確定',
    integrations: { line: '連携済', instagram: '@misaki_0105', google: '未送信' },
    stepDelivery: [
      { step: 1, title: '初回来店お礼+next案内', status: '配信済', date: '2026-06-21' },
      { step: 2, title: '1週間後カラー褪色ケア', status: '予約', date: '2026-06-27' },
      { step: 3, title: '新規→常連化クーポン', status: '未配信', date: '-' },
    ],
    history: [
      visit('2026-06-20', '鈴木', 'カット+ブリーチ+ケアカラー', '頭皮保護剤使用。ミルクティーベージュ', { bleach: 'ブリーチ1回 OX6%', color: 'ケアカラー 9-Bv + クリア', time: '120分' }),
      visit('2026-05-18', '鈴木', 'カット+カラー', '初回カウンセリング込み', { color: 'N7 + 8-Bv', oxy: 'OX 6%', time: '70分' }),
    ],
  },
  {
    id: 'c004',
    name: '高橋 由美',
    kana: 'タカハシ ユミ',
    gender: '女性',
    birthday: '1965-01-22',
    phone: '090-4444-5555',
    email: 'yumi.t@example.com',
    status: 'dormant',
    source: 'google',
    lastVisit: '2026-02-15',
    lastMenu: 'カット + 白髪染め + ヘッドスパ',
    assignedStaff: '高橋',
    visitCount: 19,
    totalSpent: 241000,
    hair: { type: '硬毛・少なめ', condition: '白髪40%', scalp: '乾燥・敏感', notes: '白髪が気になり始め周期が短め。低刺激剤を希望。' },
    allergies: ['ジアミン（弱）', '香料'],
    reservationPattern: '約4週間ごとだったが直近離脱',
    integrations: { line: '未連携', instagram: '未連携', google: '投稿済', googleDate: '2026-02-16' },
    stepDelivery: [
      { step: 1, title: '来店翌日サンクスメッセージ', status: '配信済', date: '2026-02-16' },
      { step: 2, title: '60日未来店アラート→架電', status: '未対応', date: '-' },
      { step: 3, title: '復帰特典DM', status: '未配信', date: '-' },
    ],
    history: [
      visit('2026-02-15', '高橋', 'カット+白髪染め+ヘッドスパ', '低刺激剤希望', { color: 'ノンジアミン 5NB', oxy: 'OX 3% 60g', time: '40分' }),
      visit('2026-01-18', '高橋', 'カット+白髪染め', '', { color: '5NB + 6N', oxy: 'OX 3% 55g', time: '35分' }),
      visit('2025-12-21', '高橋', 'カット+白髪染め+TR', '年末', { color: '5NB', oxy: 'OX 3% 60g', time: '40分' }),
      visit('2025-11-23', '高橋', 'カット+白髪染め', '', { color: '5NB + 6N', oxy: 'OX 3% 55g', time: '35分' }),
      visit('2025-10-26', '高橋', 'カット+白髪染め', '', { color: '5NB', oxy: 'OX 3% 60g', time: '35分' }),
      visit('2025-09-28', '高橋', 'カット+白髪染め+スパ', '', { color: '5NB', oxy: 'OX 3% 60g', time: '45分' }),
      visit('2025-08-31', '高橋', 'カット+白髪染め', '', { color: '5NB + 6N', oxy: 'OX 3% 55g', time: '35分' }),
      visit('2025-08-03', '高橋', 'カット+白髪染め', '', { color: '5NB', oxy: 'OX 3% 60g', time: '35分' }),
      visit('2025-07-06', '高橋', 'カット+白髪染め+TR', '', { color: '5NB', oxy: 'OX 3% 60g', time: '40分' }),
      visit('2025-06-08', '高橋', 'カット+白髪染め', '', { color: '5NB + 6N', oxy: 'OX 3% 55g', time: '35分' }),
    ],
  },
  {
    id: 'c005',
    name: '伊藤 大輔',
    kana: 'イトウ ダイスケ',
    gender: '男性',
    birthday: '1992-09-18',
    phone: '080-6666-7777',
    email: 'daisuke.i@example.com',
    status: 'regular',
    source: 'line',
    lastVisit: '2026-05-30',
    lastMenu: 'カット + 眉カット',
    assignedStaff: '田中',
    visitCount: 16,
    totalSpent: 78000,
    hair: { type: '普通毛・多毛', condition: '良好', scalp: '普通', notes: '襟足が伸びやすい。短めキープを好む。' },
    allergies: [],
    reservationPattern: '約4週間ごと・日曜午前固定',
    integrations: { line: '連携済', instagram: '未連携', google: '投稿済', googleDate: '2026-05-31' },
    stepDelivery: [
      { step: 1, title: '来店翌日サンクスメッセージ', status: '配信済', date: '2026-05-31' },
      { step: 2, title: '4週間後リマインド', status: '予約', date: '2026-06-27' },
      { step: 3, title: '誕生月クーポン(9月)', status: '未配信', date: '-' },
    ],
    history: [
      visit('2026-05-30', '田中', 'カット+眉カット', '短め', null),
      visit('2026-05-02', '田中', 'カット', '', null),
      visit('2026-04-04', '田中', 'カット+眉カット', '', null),
      visit('2026-03-07', '田中', 'カット', '', null),
      visit('2026-02-08', '田中', 'カット+眉カット', '', null),
      visit('2026-01-11', '田中', 'カット', '', null),
      visit('2025-12-13', '田中', 'カット+眉カット', '', null),
      visit('2025-11-15', '田中', 'カット', '', null),
      visit('2025-10-18', '田中', 'カット+眉カット', '', null),
      visit('2025-09-20', '田中', 'カット', '', null),
    ],
  },
]

// 基準日はTODAYから計算（常にリアルな日付になる）
const TODAY_BASE = new Date()
TODAY_BASE.setHours(0,0,0,0)
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayOffset = (n) => { const d = new Date(TODAY_BASE); d.setDate(d.getDate() + n); return fmt(d) }
const TODAY_STR = dayOffset(0)

const handReservations = [
  { id: 'r1', date: TODAY_STR, customerId: 'c001', customer: '山田 花子', staff: '田中', start: '10:00', end: '11:30', menu: 'カット+カラー', source: 'line' },
  { id: 'r2', date: TODAY_STR, customerId: 'c005', customer: '伊藤 大輔', staff: '田中', start: '12:00', end: '12:45', menu: 'カット', source: 'line' },
  { id: 'r3', date: TODAY_STR, customerId: 'c003', customer: '鈴木 美咲', staff: '鈴木', start: '10:30', end: '12:30', menu: 'ブリーチ+カラー', source: 'line' },
  { id: 'r4', date: TODAY_STR, customerId: 'c002', customer: '佐々木 健一', staff: '佐藤', start: '18:00', end: '19:00', menu: 'カット+パーマ', source: 'phone' },
  { id: 'r5', date: TODAY_STR, customerId: 'c004', customer: '高橋 由美', staff: '高橋', start: '13:00', end: '14:00', menu: '白髪染め+スパ', source: 'phone' },
  { id: 'r6', date: TODAY_STR, customerId: null, customer: '田村 さん（電話）', staff: '佐藤', start: '11:00', end: '12:00', menu: 'カット', source: 'phone' },
  { id: 'r7', date: TODAY_STR, customerId: null, customer: '飛び込み', staff: '鈴木', start: '15:00', end: '15:30', menu: '前髪カット', source: 'walkin' },
]

// ============================================================
// ここから下：デモを”100名規模・複数日”に見せるための自動生成データ
// 乱数は固定シードなので、誰が見ても毎回同じ内容になる（再現性あり）
// ============================================================
const minToStr = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const strToMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m }

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260624)
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))

// スタッフ休み用の独立したシード（予約・顧客の乱数に影響しない）
const rndStaff = mulberry32(99887766)
const pickStaff = (a) => a[Math.floor(rndStaff() * a.length)]

// スタッフの週1休みを「曜日固定」で生成する。
// 火曜は定休、土日は繁忙で休まない。残る 月・水・木・金 にスタッフを1人ずつ割り当てる
// → どの平日も必ず1人だけ休み（＝常に3人稼働）。同日に2人休む偏りを防ぎ、日々の件数を安定させる。
const OFF_WEEKDAYS = [1, 3, 4, 5] // 月・水・木・金
function computeStaffOff() {
  const result = {}
  STAFF.forEach(s => { result[s] = [] })
  for (let i = -21; i <= 45; i++) {
    const d = new Date(TODAY_BASE); d.setDate(d.getDate() + i)
    const wd = d.getDay()
    STAFF.forEach((s, si) => {
      if (OFF_WEEKDAYS[si % OFF_WEEKDAYS.length] === wd) result[s].push(dayOffset(i))
    })
  }
  return result
}
export const SAMPLE_STAFF_OFF = computeStaffOff()

const SEI = [['佐藤', 'サトウ'], ['鈴木', 'スズキ'], ['高橋', 'タカハシ'], ['田中', 'タナカ'], ['伊藤', 'イトウ'], ['渡辺', 'ワタナベ'], ['山本', 'ヤマモト'], ['中村', 'ナカムラ'], ['小林', 'コバヤシ'], ['加藤', 'カトウ'], ['吉田', 'ヨシダ'], ['山田', 'ヤマダ'], ['佐々木', 'ササキ'], ['山口', 'ヤマグチ'], ['松本', 'マツモト'], ['井上', 'イノウエ'], ['木村', 'キムラ'], ['林', 'ハヤシ'], ['斎藤', 'サイトウ'], ['清水', 'シミズ'], ['山崎', 'ヤマザキ'], ['森', 'モリ'], ['池田', 'イケダ'], ['橋本', 'ハシモト'], ['阿部', 'アベ'], ['石川', 'イシカワ'], ['中島', 'ナカジマ'], ['前田', 'マエダ'], ['藤田', 'フジタ'], ['岡田', 'オカダ']]
const MEI_F = [['花子', 'ハナコ'], ['美咲', 'ミサキ'], ['由美', 'ユミ'], ['彩', 'アヤ'], ['恵', 'メグミ'], ['さくら', 'サクラ'], ['陽子', 'ヨウコ'], ['里奈', 'リナ'], ['真央', 'マオ'], ['美穂', 'ミホ'], ['七海', 'ナナミ'], ['結衣', 'ユイ'], ['遥', 'ハルカ'], ['楓', 'カエデ'], ['麻衣', 'マイ'], ['奈々', 'ナナ'], ['千尋', 'チヒロ'], ['茜', 'アカネ'], ['瞳', 'ヒトミ'], ['咲', 'サキ']]
const MEI_M = [['大輔', 'ダイスケ'], ['健一', 'ケンイチ'], ['翔', 'ショウ'], ['拓也', 'タクヤ'], ['誠', 'マコト'], ['亮', 'リョウ'], ['和也', 'カズヤ'], ['直樹', 'ナオキ'], ['駿', 'シュン'], ['健太', 'ケンタ'], ['雄大', 'ユウダイ'], ['翔太', 'ショウタ'], ['大樹', 'ダイキ'], ['涼介', 'リョウスケ'], ['悠斗', 'ユウト'], ['颯太', 'ソウタ'], ['陽介', 'ヨウスケ'], ['修平', 'シュウヘイ'], ['竜也', 'タツヤ'], ['智也', 'トモヤ']]
const F_MENUS = ['カット', 'カット+カラー', 'カット+カラー+TR', 'カット+パーマ', 'カット+ブリーチ+カラー', 'カット+白髪染め', '白髪染め', 'カット+縮毛矯正', 'カット+デジタルパーマ', 'トリートメント', 'カット+ヘッドスパ']
const M_MENUS = ['カット', 'カット+眉カット', 'カット+メンズカラー', 'カット+メンズパーマ', 'カット+パーマ', 'ビジネスカット']
const HAIR_TYPE = ['硬毛・多毛', '軟毛・普通量', '普通毛・普通量', '硬毛・少なめ', 'くせ毛・多毛', '猫っ毛・少なめ']
const HAIR_COND = ['良好', 'ダメージ中', 'ダメージ大', '白髪20%', '白髪40%', 'カラー褪色', '乾燥']
const SCALP = ['普通', '乾燥気味', '脂性', '敏感']
const ALLERGY_POOL = ['ジアミン（弱）', 'ジアミン（強）', 'ラテックス', '香料', '金属']
const NOTES = ['梅雨時に広がりやすい。', '根元のうねりが気になる。', '毛先のダメージを気にされている。', '短めキープを好む。', '低刺激剤を希望。', 'カラーの褪色が早め。', '']
const PATTERNS = ['約4週間ごと', '約5週間ごと', '約6週間ごと', '約2ヶ月ごと', '約3ヶ月ごと・不定期']
const SOURCES = ['hotpepper', 'instagram', 'google', 'referral', 'line']
const RECIPES = ['オラ8-5 + OX4.5% 35分', '5NB + OX3% 40分', 'ケアブリーチ1回→9-Bv', 'ロッド中 1液N8分 / 2液5分', 'ノンジアミン 5NB OX3%', 'オラ7-1 + 6-7 = 2:1']

function makeHistory(count, lastVisit, staff, gender) {
  const menus = gender === '女性' ? F_MENUS : M_MENUS
  const out = []
  const d = new Date(lastVisit + 'T00:00:00')
  for (let i = 0; i < count; i++) {
    const menu = pick(menus)
    const hasRecipe = /カラー|白髪|ブリーチ|パーマ|矯正/.test(menu) && rnd() < 0.8
    out.push({
      date: fmt(d),
      staff,
      menu,
      note: rnd() < 0.3 ? pick(['少し明るめ希望', '暗めトーンに', '前回と同じで', '毛先を整える程度']) : '',
      recipe: hasRecipe ? { note: pick(RECIPES) } : null,
    })
    d.setDate(d.getDate() - int(26, 45))
  }
  return out
}

function genCustomers(n) {
  const statusPool = ['vip', 'regular', 'regular', 'regular', 'new', 'new', 'followup', 'dormant']
  const gStates = ['未送信', '未送信', '依頼送信済', '投稿済']
  const out = []
  for (let i = 0; i < n; i++) {
    const gender = rnd() < 0.62 ? '女性' : '男性'
    const sei = pick(SEI)
    const mei = pick(gender === '女性' ? MEI_F : MEI_M)
    const status = pick(statusPool)
    const staff = pick(STAFF)
    let daysBack
    if (status === 'dormant') daysBack = int(120, 320)
    else if (status === 'followup') daysBack = int(60, 110)
    else if (status === 'new') daysBack = int(3, 35)
    else if (status === 'vip') daysBack = int(7, 45)
    else daysBack = int(10, 55)
    const lastVisit = dayOffset(-daysBack)
    let visitCount
    if (status === 'vip') visitCount = int(20, 40)
    else if (status === 'regular') visitCount = int(8, 20)
    else if (status === 'new') visitCount = int(1, 3)
    else if (status === 'dormant') visitCount = int(6, 22)
    else visitCount = int(5, 14)
    const history = makeHistory(Math.min(visitCount, 10), lastVisit, staff, gender)
    const id = 'g' + String(100 + i)
    out.push({
      id,
      name: `${sei[0]} ${mei[0]}`,
      kana: `${sei[1]} ${mei[1]}`,
      gender,
      birthday: `${int(1962, 2005)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      phone: `0${pick(['90', '80', '70'])}-${int(1000, 9999)}-${int(1000, 9999)}`,
      email: `member${100 + i}@example.com`,
      status,
      source: pick(SOURCES),
      lastVisit,
      lastMenu: history[0].menu,
      assignedStaff: staff,
      visitCount,
      totalSpent: visitCount * int(4500, 12000),
      hair: { type: pick(HAIR_TYPE), condition: pick(HAIR_COND), scalp: pick(SCALP), notes: pick(NOTES) },
      allergies: rnd() < 0.25 ? [pick(ALLERGY_POOL)] : [],
      reservationPattern: pick(PATTERNS),
      integrations: {
        line: rnd() < 0.75 ? '連携済' : '未連携',
        instagram: rnd() < 0.3 ? '@' + id : '未連携',
        google: pick(gStates),
      },
      stepDelivery: [
        { step: 1, title: '来店翌日サンクスメッセージ', status: '配信済', date: lastVisit },
        { step: 2, title: '2週間後ホームケア案内', status: rnd() < 0.5 ? '配信済' : '予約', date: '-' },
        { step: 3, title: '次回予約リマインド', status: '未配信', date: '-' },
      ],
      history,
    })
  }
  return out
}

export const sampleCustomers = [...handCustomers, ...genCustomers(95)]

// メニューの所要時間（分）を求める。設定マップ優先＋未知メニューはキーワードで概算。
// 複合メニュー（例: カット+ブリーチ+カラー）にも対応し、30分間隔のような非現実的な枠を防ぐ。
function menuDuration(menu) {
  if (!menu) return 60
  if (DEFAULT_MENU_DURATIONS[menu]) return DEFAULT_MENU_DURATIONS[menu]
  let d = 0
  if (/ブリーチ/.test(menu)) d += 90
  if (/縮毛矯正/.test(menu)) d += 120
  if (/デジタルパーマ|デジパ/.test(menu)) d += 120
  else if (/パーマ/.test(menu)) d += 60
  if (/カラー|白髪染め/.test(menu)) d += 60
  if (/ヘッドスパ|スパ/.test(menu)) d += 30
  if (/トリートメント|TR/.test(menu)) d += 20
  if (/眉/.test(menu)) d += 15
  if (/カット/.test(menu)) d += 45
  if (d === 0) d = 60
  return Math.min(180, Math.max(45, Math.round(d / 15) * 15)) // 15分単位・45〜180分に収める
}

const NEW_MENUS = ['カット', 'カット+カラー', '白髪染め', 'カット+カラー+TR'] // 新規客が選びやすいメニュー
const OPEN_MIN = 10 * 60   // 営業10:00
const CLOSE_MIN = 19 * 60  // 営業19:00（この時刻までに施術が終わる枠のみ生成）
// 予約に占める「新規客」の割合。新規はHPB/来店から、リピーターはLINE/電話から。
// ≒ 1日あたり約1名の新規（月30名前後想定）。HPBは新規以外には付けない（脱HPB＝LINE誘導）。
const NEW_CUSTOMER_RATIO = 0.09

// リピーター（既存客）の予約経路：LINE連携済はLINE中心、未連携は電話。HPBは使わない。
function repeatSource(c) {
  if (c.integrations?.line === '連携済') return rnd() < 0.85 ? 'line' : 'phone'
  return 'phone'
}

function genReservations(registered, presets = []) {
  const out = []
  // 当日（手書き予約）の埋まり枠と顧客を事前に把握して、重複なく追加生成する
  const presetSlots = {}   // `${date}_${staff}` -> [{s,e}]
  const presetCusts = {}   // date -> Set(customerId)
  for (const r of presets) {
    if (r.staff && r.start && r.end) (presetSlots[`${r.date}_${r.staff}`] = presetSlots[`${r.date}_${r.staff}`] || []).push({ s: strToMin(r.start), e: strToMin(r.end) })
    if (r.customerId) (presetCusts[r.date] = presetCusts[r.date] || new Set()).add(r.customerId)
  }

  for (let off = -3; off <= 35; off++) {
    const date = dayOffset(off)
    const d = new Date(date + 'T00:00:00')
    const wd = d.getDay() // 0=日, 1=月, 2=火, 6=土
    if (wd === 2) continue // 火曜定休
    const isWeekend = wd === 0 || wd === 6

    // 各スタッフの1枠ごとに予約が入る確率（枠ベース）。土日は混雑、平日は控えめ。
    const prob = isWeekend ? 0.82 : 0.36
    const usedCustomerIds = new Set(presetCusts[date] || []) // 同日に同じ顧客を重複させない

    for (const staff of STAFF) {
      if ((SAMPLE_STAFF_OFF[staff] || []).includes(date)) continue

      const occupied = [...(presetSlots[`${date}_${staff}`] || [])] // 当日の手書き予約を占有枠に
      let startMin = OPEN_MIN
      let slotIdx = 0
      while (startMin <= CLOSE_MIN - 45) {
        // 既存予約に重なる時間帯ならその後ろ（30分刻み）へ
        const within = occupied.find((o) => startMin >= o.s && startMin < o.e)
        if (within) { startMin = Math.ceil(within.e / 30) * 30; continue }

        if (rnd() < prob) {
          // 予約主とメニュー・経路を決める
          let customerId = null, customer = '', menu = '', source = ''
          const isNew = rnd() < NEW_CUSTOMER_RATIO
          if (!isNew) {
            // リピーター（登録済み顧客）
            let c = null
            for (let t = 0; t < 10; t++) {
              const cand = pick(registered)
              if (!usedCustomerIds.has(cand.id)) { c = cand; break }
            }
            if (c) {
              customerId = c.id; customer = c.name; menu = c.lastMenu || 'カット'
              source = repeatSource(c)
              usedCustomerIds.add(c.id)
            } else {
              customer = `${pick(SEI)[0]} さん（電話）`; menu = pick(NEW_MENUS); source = 'phone'
            }
          } else {
            // 新規客：HPB（中心）または来店から
            source = rnd() < 0.7 ? 'hotpepper' : 'walkin'
            customer = `${pick(SEI)[0]} さん（新規）`
            menu = pick(NEW_MENUS)
          }
          // メニューに応じた所要時間で枠を確保。閉店までに終わらなければ後ろの枠を試す。
          const dur = menuDuration(menu)
          const endMin = startMin + dur
          if (endMin > CLOSE_MIN || occupied.some((o) => startMin < o.e && endMin > o.s)) { startMin += 30; continue }
          out.push({ id: `gr${off}_${staff}_${slotIdx++}`, date, customerId, customer, staff, start: minToStr(startMin), end: minToStr(endMin), menu, source })
          occupied.push({ s: startMin, e: endMin })
          // 次の枠：施術終了後、30分刻みに丸める（たまに小休憩を挟む）
          const gap = rnd() < 0.3 ? 30 : 0
          startMin = Math.ceil((endMin + gap) / 30) * 30
        } else {
          startMin += 30
        }
      }
    }
  }
  return out
}

// 顧客の来店周期から将来予約を自動生成（2〜5週間先）
const PATTERN_DAYS = {
  '約4週間ごと': 28, '約5週間ごと': 35, '約6週間ごと': 42,
  '約2ヶ月ごと': 60, '約3ヶ月ごと・不定期': 85,
}

function genCycleReservations(registered, existingReservations) {
  const out = []
  // 日×スタッフ別の使用済み時間帯
  const usedSlots = {}
  const addSlot = (date, staff, s, e) => {
    const k = `${date}_${staff}`
    ;(usedSlots[k] = usedSlots[k] || []).push({ s, e })
  }
  // 既存（通常）予約の枠を先に埋めて、周期予約が重ならないようにする
  // あわせて「日付×顧客」を記録し、同じ客を同日に二重で入れない
  const usedCustomerDays = new Set()
  for (const r of existingReservations) {
    if (r.staff && r.start && r.end) addSlot(r.date, r.staff, strToMin(r.start), strToMin(r.end))
    if (r.customerId) usedCustomerDays.add(`${r.date}_${r.customerId}`)
  }
  const findSlot = (date, staff, menu) => {
    const k = `${date}_${staff}`
    const used = usedSlots[k] || []
    const dur = menuDuration(menu)
    // 営業時間内の :00 / :30 開始候補（早い順）から空き枠を探す
    const starts = []
    for (let m = OPEN_MIN; m + dur <= CLOSE_MIN; m += 30) starts.push(m)
    for (const startMin of starts) {
      const endMin = startMin + dur
      if (!used.some(u => startMin < u.e && endMin > u.s)) {
        addSlot(date, staff, startMin, endMin)
        return { start: minToStr(startMin), end: minToStr(endMin) }
      }
    }
    return null
  }

  const usedCycleIds = new Set(existingReservations.map((r) => r.id))

  for (const c of registered) {
    if (!c.lastVisit || c.status === 'dormant') continue
    const days = PATTERN_DAYS[c.reservationPattern]
    if (!days) continue

    const nextDate = new Date(c.lastVisit + 'T00:00:00')
    nextDate.setDate(nextDate.getDate() + days + Math.floor(rndStaff() * 5) - 2) // ±2日ゆらぎ

    // 定休日（火曜）なら翌日へ
    if (nextDate.getDay() === 2) nextDate.setDate(nextDate.getDate() + 1)
    // 日曜なら月曜へ（好みが分かれるので一部はそのまま）
    if (nextDate.getDay() === 0 && rndStaff() < 0.5) nextDate.setDate(nextDate.getDate() + 1)

    const iso = fmt(nextDate)
    const daysAhead = Math.round((nextDate - TODAY_BASE) / 86400000)
    if (daysAhead <= 0 || daysAhead > 35) continue
    // 同じ客が同日に通常予約済みなら入れない
    if (usedCustomerDays.has(`${iso}_${c.id}`)) continue
    usedCustomerDays.add(`${iso}_${c.id}`)

    // スタッフ休みならスキップ
    const staff = c.assignedStaff || pick(STAFF)
    if ((SAMPLE_STAFF_OFF[staff] || []).includes(iso)) continue

    const id = `cyc_${c.id}`
    if (usedCycleIds.has(id)) continue
    usedCycleIds.add(id)

    const menu = c.lastMenu || 'カット'
    const slot = findSlot(iso, staff, menu)
    if (!slot) continue

    // 周期予約はすべてリピーター。HPBは使わず LINE/電話 に誘導。
    const source = c.integrations?.line === '連携済' ? (rndStaff() < 0.85 ? 'line' : 'phone') : 'phone'
    out.push({ id, date: iso, customerId: c.id, customer: c.name, staff, start: slot.start, end: slot.end, menu, source })
  }
  return out
}

const baseReservations = [...handReservations, ...genReservations(sampleCustomers, handReservations)]
const cycleReservations = genCycleReservations(sampleCustomers, baseReservations)
export const sampleReservations = [...baseReservations, ...cycleReservations]
