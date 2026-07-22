// GET /api/notifications → 未読通知一覧
// POST /api/notifications { id } → 既読にする
// POST /api/notifications { action: 'listStaff' | 'createStaff' | 'deleteStaff', ... }
//   → スタッフのログインアカウント管理（オーナー権限のみ・自己サービス化）
// POST /api/notifications { action: 'syncRichMenus', richMenu } → LINEリッチメニューの
//   自動切替設定（Settings.jsx）をLINE側に反映（オーナー権限のみ）
// POST /api/notifications { action: 'linkRichMenu', customerId } → 顧客のステータスに応じた
//   リッチメニューをそのLINEユーザーに紐付け（ログイン中なら誰でも呼べる。ステータス変更の
//   たびにstore.jsxから自動で呼ばれる）
// POST /api/notifications { action: 'checkLineHealth' } → LINE連携（トークンの失効・
//   利用制限＝いわゆるBAN）を今すぐ手動チェック（オーナー権限のみ）
// GET /api/notifications?health=1 → LINE連携の状態を返す軽量ステータスAPI（無認証・
//   店名とLINE連携状態のみ。複数店舗を横断監視する別ツールから使う想定）
//   Vercel Hobbyプランのサーバーレス関数数12個の上限のため、この既存ファイルに同居させている
//   （send-line.js・cron-birthday.jsと同じ対策パターン）。
// GET /api/notifications?stats=1 → Socialsmiler側の「全店舗管理ダッシュボード」用の
//   利用状況サマリーAPI（顧客数・アクティブ顧客数・直近施術日・LINE連携数・スタッフ数のみ。
//   顧客の氏名・電話番号などの個人情報は一切含まない）。
//   Authorizationヘッダー（Bearer トークン）が環境変数ADMIN_STATS_TOKENと一致しないと
//   401を返す（health=1と違いこちらは認証必須。店舗ごとに異なるトークンをVercelの環境変数に
//   登録し、同じ値を池本さん側の店舗マスター「運用APIキー」列にも入れておくことで対応する）

import { createClient } from '@supabase/supabase-js'
import { admin } from './_lib/admin.js'
import { checkLineChannel, saveLineHealth } from './_lib/lineHealth.js'
import { DEFAULT_SALON_NAME } from '../src/config/defaults.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

// リクエストのAuthorizationヘッダーからログイン中の本人を特定し、
// オーナー権限（user_metadata.role !== 'staff'）であることを確認する
async function requireOwner(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  const role = data.user.user_metadata?.role === 'staff' ? 'staff' : 'owner'
  if (role !== 'owner') return null
  return data.user
}

// ログイン中の本人確認のみ（オーナー／スタッフどちらでも可）。
// 施術記録・チェックインはスタッフも行う操作のため、リッチメニューの紐付けはスタッフも呼べる。
async function requireAnyUser(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

// ===== LINEリッチメニュー連携 =====
// 「新規/常連/VIP/要フォロー/休眠」の5ステータス固定（Settings.jsxの自動判定と同じ区分）。
// 1メニューにつきタップ領域は左右2分割の簡易レイアウト（compactサイズ 2500×843）。
const RICHMENU_STATUSES = ['new', 'regular', 'vip', 'followup', 'dormant']
const RICHMENU_SIZE = { width: 2500, height: 843 }

async function lineApi(path, opts = {}) {
  const res = await fetch(`https://api.line.me/v2/bot${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${LINE_TOKEN}`, ...(opts.headers || {}) },
  })
  const text = await res.text().catch(() => '')
  let data = null
  try { data = text ? JSON.parse(text) : null } catch (e) { data = text }
  return { ok: res.ok, status: res.status, data }
}

async function createRichMenu(statusKey, area1, area2) {
  const areas = [
    { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: area1.url } },
    { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri', uri: area2.url } },
  ]
  return lineApi('/richmenu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      size: RICHMENU_SIZE,
      selected: false,
      name: `okaeru-${statusKey}`.slice(0, 300),
      chatBarText: 'メニュー',
      areas,
    }),
  })
}

async function uploadRichMenuContent(richMenuId, imageUrl) {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) return { ok: false, status: imgRes.status, data: { error: '画像の取得に失敗しました' } }
  const buf = Buffer.from(await imgRes.arrayBuffer())
  const contentType = imgRes.headers.get('content-type') || 'image/png'
  const res = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${LINE_TOKEN}`, 'Content-Type': contentType },
    body: buf,
  })
  const text = await res.text().catch(() => '')
  return { ok: res.ok, status: res.status, data: text }
}

async function deleteRichMenu(richMenuId) {
  return lineApi(`/richmenu/${richMenuId}`, { method: 'DELETE' })
}

async function setDefaultRichMenu(richMenuId) {
  return lineApi(`/user/all/richmenu/${richMenuId}`, { method: 'POST' })
}

async function linkRichMenuToUser(userId, richMenuId) {
  return lineApi(`/user/${userId}/richmenu/${richMenuId}`, { method: 'POST' })
}

// 設定画面のリッチメニュー構成（画像URL・タップ領域のリンク）をLINE側に反映する。
// クライアントから送られた richMenu（{enabled, statuses}）をそのまま使う設計にすることで、
// 「保存」と「LINEに反映」の間で設定がDBへの書き込み待ちになる競合を避けている。
async function handleRichMenuSync(req, res) {
  const caller = await requireOwner(req)
  if (!caller) return res.status(403).json({ error: 'オーナー権限が必要です' })
  if (!LINE_TOKEN) return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKENが未設定です' })

  const richMenu = req.body?.richMenu || {}
  const statuses = richMenu.statuses || {}
  const results = {}
  const updatedStatuses = { ...statuses }
  let defaultId = null

  for (const key of RICHMENU_STATUSES) {
    const conf = statuses[key]
    if (!conf || !conf.imageUrl) { results[key] = { ok: false, message: '画像未設定のためスキップしました' }; continue }
    const area1 = conf.areas?.[0] || {}
    const area2 = conf.areas?.[1] || {}
    if (!/^https?:\/\//.test(area1.url || '') || !/^https?:\/\//.test(area2.url || '')) {
      results[key] = { ok: false, message: 'リンク先URL（https://から始まるもの）を左右とも入力してください' }
      continue
    }
    const created = await createRichMenu(key, area1, area2)
    if (!created.ok || !created.data?.richMenuId) {
      results[key] = { ok: false, message: `作成に失敗しました（status ${created.status}）` }
      continue
    }
    const richMenuId = created.data.richMenuId
    const uploaded = await uploadRichMenuContent(richMenuId, conf.imageUrl)
    if (!uploaded.ok) {
      await deleteRichMenu(richMenuId).catch((e) => console.error('richmenu cleanup failed', e))
      results[key] = { ok: false, message: `画像アップロードに失敗しました（status ${uploaded.status}）` }
      continue
    }
    // 既存のメニューを差し替える場合、古いものは削除（ベストエフォート・失敗してもログのみ）
    if (conf.lineRichMenuId && conf.lineRichMenuId !== richMenuId) {
      const del = await deleteRichMenu(conf.lineRichMenuId)
      if (!del.ok) console.error('richmenu old delete failed', conf.lineRichMenuId, del.data)
    }
    updatedStatuses[key] = { ...conf, lineRichMenuId: richMenuId }
    results[key] = { ok: true, message: '反映しました' }
    if (key === 'new') defaultId = richMenuId
  }

  // 「新規」のメニューを、まだどの顧客とも紐付いていないLINE友だち（新規登録直後等）の既定メニューにする
  if (defaultId) {
    const def = await setDefaultRichMenu(defaultId)
    if (!def.ok) console.error('richmenu setDefault failed', def.data)
  }

  const nextRichMenu = { enabled: !!richMenu.enabled, statuses: updatedStatuses }

  // DB側にも反映（他の設定項目は壊さないよう読み直してマージ）
  const { data: setRow, error: setErr } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle()
  if (setErr) console.error('settings select (richmenu sync)', setErr)
  const currentData = (setRow && setRow.data) || {}
  const { error: upErr } = await supabase
    .from('settings')
    .upsert({ id: 1, data: { ...currentData, richMenu: nextRichMenu }, updated_at: new Date().toISOString() })
  if (upErr) console.error('settings upsert (richmenu sync)', upErr)

  return res.status(200).json({ ok: true, results, richMenu: nextRichMenu })
}

// 顧客のステータスに応じたリッチメニューを、そのLINEユーザーに紐付ける。
// リッチメニュー機能が無効・未反映（lineRichMenuId未設定）・LINE未連携の場合は、
// エラーにせず「何もしない」で成功扱いにする（通常の施術記録保存等を妨げないため）。
async function handleRichMenuLink(req, res) {
  const caller = await requireAnyUser(req)
  if (!caller) return res.status(403).json({ error: '認証が必要です' })
  const { customerId } = req.body || {}
  if (!customerId) return res.status(400).json({ error: 'customerId required' })
  if (!LINE_TOKEN) return res.status(200).json({ ok: true, skipped: 'no-line-token' })

  const [{ data: customer }, { data: setRow }] = await Promise.all([
    supabase.from('customers').select('id, status, integrations').eq('id', customerId).maybeSingle(),
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
  ])
  if (!customer) return res.status(404).json({ error: 'customer not found' })
  const settings = (setRow && setRow.data) || {}
  const rm = settings.richMenu || {}
  if (!rm.enabled) return res.status(200).json({ ok: true, skipped: 'disabled' })
  const lineUserId = customer.integrations?.lineUserId
  if (!lineUserId) return res.status(200).json({ ok: true, skipped: 'no-line-user' })
  const conf = rm.statuses?.[customer.status]
  const richMenuId = conf?.lineRichMenuId
  if (!richMenuId) return res.status(200).json({ ok: true, skipped: 'not-synced' })

  const linked = await linkRichMenuToUser(lineUserId, richMenuId)
  if (!linked.ok) return res.status(500).json({ error: linked.data })
  return res.status(200).json({ ok: true })
}

// LINE連携の健全性を今すぐ手動チェック（設定画面の「🔍 今すぐ確認」ボタンから）
async function handleCheckLineHealth(req, res) {
  const caller = await requireOwner(req)
  if (!caller) return res.status(403).json({ error: 'オーナー権限が必要です' })
  const result = await checkLineChannel()
  const saved = await saveLineHealth(supabase, result)
  return res.status(200).json({ ok: true, lineHealth: saved || result })
}

async function handleStaffAction(req, res) {
  const { action } = req.body || {}
  const caller = await requireOwner(req)
  if (!caller) return res.status(403).json({ error: 'オーナー権限が必要です' })

  if (action === 'listStaff') {
    const { data, error } = await admin.auth.admin.listUsers()
    if (error) return res.status(500).json({ error: error.message })
    const staff = data.users
      .map((u) => ({ id: u.id, email: u.email, role: u.user_metadata?.role === 'staff' ? 'staff' : 'owner', createdAt: u.created_at }))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    return res.status(200).json({ staff })
  }

  if (action === 'createStaff') {
    const { email, password, role } = req.body
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'メールアドレスと6文字以上のパスワードが必要です' })
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password,
      email_confirm: true,
      user_metadata: { role: role === 'owner' ? 'owner' : 'staff' },
    })
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true, id: data.user.id })
  }

  if (action === 'deleteStaff') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    if (id === caller.id) return res.status(400).json({ error: '自分自身のアカウントは削除できません' })
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ error: 'unknown action' })
}

// 全店舗管理ダッシュボード（Socialsmiler側GAS）向けの利用状況サマリー。
// 顧客個人情報（氏名・電話番号・LINEユーザーID本体など）は含めず、件数・日付のみ返す。
const ADMIN_STATS_ACTIVE_WINDOW_DAYS = 180 // この日数以内に来店実績があれば「アクティブ」とみなす

async function handleAdminStats(req, res) {
  const expected = process.env.ADMIN_STATS_TOKEN
  const given = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!expected || given !== expected) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const sinceIso = new Date(Date.now() - ADMIN_STATS_ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  const [
    { data: customers, error: custErr },
    { data: setRow },
    authList,
  ] = await Promise.all([
    supabase.from('customers').select('last_visit, integrations'),
    supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
    admin.auth.admin.listUsers().catch(() => null),
  ])
  if (custErr) return res.status(500).json({ error: custErr.message })

  const settings = (setRow && setRow.data) || {}
  const list = customers || []
  const customerCount = list.length
  const activeCustomerCount = list.filter((c) => c.last_visit && c.last_visit >= sinceIso).length
  const lastTreatmentDate = list.reduce((max, c) => (c.last_visit && c.last_visit > max ? c.last_visit : max), '') || null
  const lineLinkedCount = list.filter((c) => c.integrations?.lineUserId).length
  const staffCount = authList?.data?.users ? authList.data.users.length : null

  return res.status(200).json({
    ok: true,
    salonName: settings.salonName || DEFAULT_SALON_NAME,
    customerCount,
    activeCustomerCount,
    lastTreatmentDate,
    lineLinkedCount,
    staffCount,
  })
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 軽量ステータスAPI（無認証）。複数店舗を横断監視する別ツールから使う想定で、
    // 店名とLINE連携状態のみを返す（顧客データ等の機微な情報は含めない）。
    if (req.query?.health === '1') {
      const { data: setRow, error } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle()
      if (error) return res.status(500).json({ error: error.message })
      const settings = (setRow && setRow.data) || {}
      return res.status(200).json({
        ok: true,
        salonName: settings.salonName || DEFAULT_SALON_NAME,
        lineHealth: settings.lineHealth || null,
      })
    }

    // 全店舗管理ダッシュボード用の利用状況サマリー（要トークン認証、上記コメント参照）
    if (req.query?.stats === '1') return handleAdminStats(req, res)

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return res.status(500).json({ error })
    return res.status(200).json({ notifications: data })
  }

  if (req.method === 'POST') {
    if (req.body?.action === 'syncRichMenus') return handleRichMenuSync(req, res)
    if (req.body?.action === 'linkRichMenu') return handleRichMenuLink(req, res)
    if (req.body?.action === 'checkLineHealth') return handleCheckLineHealth(req, res)
    if (req.body?.action) return handleStaffAction(req, res)
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    return res.status(200).json({ ok: true })
  }

  res.status(405).end()
}
