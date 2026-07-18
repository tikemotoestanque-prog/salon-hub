import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { sampleCustomers, sampleReservations, sampleMessages, DEFAULT_SETTINGS, SAMPLE_STAFF_OFF } from './data/sampleData.js'
import { computeStatus, computePattern, priceOf, TODAY_ISO } from './utils.js'
import { supabase, hasSupabase } from './supabaseClient.js'
import { useAuth } from './AuthContext.jsx'
import { useToast } from './components/Toast.jsx'

const StoreContext = createContext(null)
const LS_KEY = 'salonhub.v1'

const freshSettings = () => {
  const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
  // スタッフの週1休みをサンプルデータから適用（localStorageに保存済みの場合は上書きしない）
  if (!s.staffOff || Object.values(s.staffOff).every(v => v.length === 0)) {
    s.staffOff = JSON.parse(JSON.stringify(SAMPLE_STAFF_OFF))
  }
  return s
}
const freshState = () => ({ customers: sampleCustomers, reservations: sampleReservations, settings: freshSettings(), couponRedemptions: [], messages: sampleMessages })

// ===== localStorage（Supabase未設定時のフォールバック） =====
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        customers: p.customers || sampleCustomers,
        reservations: p.reservations || sampleReservations,
        // 旧データ（settings無し）でも既定値で動くようにマージ。staffOffは実行時生成を優先
        settings: { ...freshSettings(), ...(p.settings || {}), staffOff: SAMPLE_STAFF_OFF },
        couponRedemptions: p.couponRedemptions || [],
        messages: p.messages || sampleMessages,
      }
    }
  } catch (e) { /* ignore */ }
  return freshState()
}

// ===== DB(snake_case) ⇔ アプリ(camelCase) 変換 =====
const fromCustomerRow = (r) => ({
  id: r.id, name: r.name, kana: r.kana, gender: r.gender, birthday: r.birthday || '',
  phone: r.phone, email: r.email, status: r.status, source: r.source,
  lastVisit: r.last_visit || '', lastMenu: r.last_menu || '', assignedStaff: r.assigned_staff || '',
  visitCount: r.visit_count || 0, totalSpent: r.total_spent || 0,
  hair: r.hair || {}, allergies: r.allergies || [],
  reservationPattern: r.reservation_pattern || '',
  integrations: r.integrations || {}, stepDelivery: r.step_delivery || [],
  history: r.history || [], tags: r.tags || [],
})
const toCustomerRow = (c) => ({
  id: c.id, name: c.name, kana: c.kana, gender: c.gender, birthday: c.birthday || null,
  phone: c.phone, email: c.email, status: c.status, source: c.source,
  last_visit: c.lastVisit || null, last_menu: c.lastMenu || null, assigned_staff: c.assignedStaff || null,
  visit_count: c.visitCount || 0, total_spent: c.totalSpent || 0,
  hair: c.hair || {}, allergies: c.allergies || [],
  reservation_pattern: c.reservationPattern || null,
  integrations: c.integrations || {}, step_delivery: c.stepDelivery || [],
  history: c.history || [], tags: c.tags || [],
})
const fromResRow = (r) => ({
  id: r.id, date: r.date, customerId: r.customer_id || null, customer: r.customer,
  staff: r.staff, start: r.start, end: r.end, menu: r.menu, source: r.source,
})
const toResRow = (r) => ({
  id: r.id, date: r.date, customer_id: r.customerId || null, customer: r.customer,
  staff: r.staff, start: r.start, end: r.end, menu: r.menu, source: r.source,
})
const fromRedemptionRow = (r) => ({ customerId: r.customer_id, tag: r.coupon_tag, usedAt: r.used_at, usedBy: r.used_by || '' })
const toRedemptionRow = (x) => ({ customer_id: x.customerId, coupon_tag: x.tag, used_by: x.usedBy || null })
const fromMessageRow = (r) => ({
  id: r.id, customerId: r.customer_id, lineUserId: r.line_user_id, direction: r.direction,
  text: r.text, sender: r.sender || '', read: !!r.read, createdAt: r.created_at,
})

export function StoreProvider({ children }) {
  const { session } = useAuth()
  const toast = useToast()
  const [state, setState] = useState(hasSupabase
    ? { customers: [], reservations: [], settings: freshSettings(), couponRedemptions: [], messages: [] }
    : loadLocal)
  const [loading, setLoading] = useState(hasSupabase)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // ----- 初期ロード（Supabase）。認証状態でロード範囲を変える -----
  // ・スタッフ(authenticated)：全顧客・予約をロード（空なら初回シード）。
  // ・お客様/未ログイン(anon)：設定だけロード。顧客データは各お客様ページがAPIで本人分のみ取得。
  //   → anonキーで全顧客が端末に流れるのを防ぐ（施錠後はRLSでも遮断される）。
  useEffect(() => {
    if (!hasSupabase) return
    if (session === undefined) return // 認証初期化待ち
    let alive = true
    ;(async () => {
      try {
        // 設定はPIIなし＝anonでもSELECT可。お客様画面の営業時間・メニュー表示に使う。
        const { data: setRow } = await supabase.from('settings').select('data').eq('id', 1).maybeSingle()
        const baseSettings = { ...freshSettings(), ...((setRow && setRow.data) || {}), staffOff: SAMPLE_STAFF_OFF }

        if (!session) {
          // 未ログイン（お客様ページ）：顧客・予約はロードしない
          if (alive) setState({ customers: [], reservations: [], settings: baseSettings, couponRedemptions: [], messages: [] })
          return
        }

        // スタッフ：全件ロード＋初回シード
        let [{ data: cust }, { data: res }] = await Promise.all([
          supabase.from('customers').select('*').order('created_at', { ascending: false }).order('id', { ascending: true }),
          supabase.from('reservations').select('*'),
        ])
        if (!cust || cust.length === 0) {
          await supabase.from('customers').upsert(sampleCustomers.map(toCustomerRow))
          await supabase.from('settings').upsert({ id: 1, data: freshSettings() })
          cust = sampleCustomers.map(toCustomerRow)
        }
        if (!res || res.length === 0) {
          await supabase.from('reservations').upsert(sampleReservations.map(toResRow))
          res = sampleReservations.map(toResRow)
        }
        // クーポン使用済み（テーブル未作成でも壊れないよう失敗許容）
        let redemptions = []
        try {
          const { data: red } = await supabase.from('coupon_redemptions').select('*')
          redemptions = (red || []).map(fromRedemptionRow)
        } catch (e) { /* テーブル未作成 = 空でOK */ }
        // トーク画面のメッセージ履歴（テーブル未作成でも壊れないよう失敗許容）
        let messages = []
        try {
          const { data: msgs } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
          messages = (msgs || []).map(fromMessageRow)
        } catch (e) { /* テーブル未作成 = 空でOK */ }
        if (!alive) return
        setState({
          customers: (cust || []).map(fromCustomerRow),
          reservations: (res || []).map(fromResRow),
          settings: baseSettings,
          couponRedemptions: redemptions,
          messages,
        })
      } catch (e) {
        console.error('Supabase load failed, falling back to local:', e)
        if (alive) setState(loadLocal())
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [session])

  // ----- localStorage保存（Supabase未設定時のみ） -----
  useEffect(() => {
    if (hasSupabase) return
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch (e) { /* ignore */ }
  }, [state])

  // ----- トーク画面用：お客様からの新着メッセージを定期的に取り込む（15秒間隔） -----
  useEffect(() => {
    if (!hasSupabase || !session) return
    let alive = true
    const timer = setInterval(async () => {
      try {
        const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
        if (alive && data) setState((s) => ({ ...s, messages: data.map(fromMessageRow) }))
      } catch (e) { /* テーブル未作成等は無視 */ }
    }, 15000)
    return () => { alive = false; clearInterval(timer) }
  }, [session])

  // ----- DB書き込みヘルパー（Supabase時のみ実行） -----
  // 画面上は保存できた体で進む（楽観的更新）が、実際の書き込みが失敗したらトーストで知らせる。
  const dbCustomer = (c) => { if (hasSupabase) supabase.from('customers').upsert(toCustomerRow(c)).then(({ error }) => { if (error) { console.error('customer upsert', error); toast('顧客情報の保存に失敗しました。もう一度お試しください', 'error') } }) }
  const dbCustomers = (list) => { if (hasSupabase) supabase.from('customers').upsert(list.map(toCustomerRow)).then(({ error }) => { if (error) { console.error('customers upsert', error); toast('一括更新に失敗しました', 'error') } }) }
  const dbReservation = (r) => { if (hasSupabase) supabase.from('reservations').upsert(toResRow(r)).then(({ error }) => { if (error) { console.error('reservation upsert', error); toast('予約の保存に失敗しました', 'error') } }) }
  const dbDeleteReservation = (id) => { if (hasSupabase) supabase.from('reservations').delete().eq('id', id).then(({ error }) => { if (error) { console.error('reservation delete', error); toast('予約の削除に失敗しました', 'error') } }) }
  const dbSettings = (s) => { if (hasSupabase) supabase.from('settings').upsert({ id: 1, data: s, updated_at: new Date().toISOString() }).then(({ error }) => { if (error) { console.error('settings upsert', error); toast('設定の保存に失敗しました', 'error') } }) }
  const dbRedeem = (x) => { if (hasSupabase) supabase.from('coupon_redemptions').upsert(toRedemptionRow(x), { onConflict: 'customer_id,coupon_tag' }).then(({ error }) => { if (error) { console.error('redeem upsert', error); toast('クーポンの処理に失敗しました', 'error') } }) }
  const dbUnredeem = (customerId, tag) => { if (hasSupabase) supabase.from('coupon_redemptions').delete().eq('customer_id', customerId).eq('coupon_tag', tag).then(({ error }) => { if (error) { console.error('redeem delete', error); toast('クーポンの処理に失敗しました', 'error') } }) }

  // ステータスが変わったら、そのお客様のLINEリッチメニューを新ステータス用に切り替える。
  // リッチメニュー機能が未設定・LINE未連携の場合はAPI側が何もせず成功を返すので、ここでは
  // 気にせず呼ぶだけでよい。失敗しても業務（施術記録・チェックイン）自体は止めない
  // （fire-and-forget）が、握りつぶさずconsole.errorには残す
  // （キーワード自動返信の記録もれ不具合と同じ轍を踏まないため）。
  const syncRichMenu = (customer, prevStatus) => {
    if (!hasSupabase || !session?.access_token) return
    if (!customer?.integrations?.lineUserId) return
    if (customer.status === prevStatus) return
    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'linkRichMenu', customerId: customer.id }),
    }).catch((e) => console.error('richmenu link failed', e))
  }

  // ----- ミューテーション（state更新＋DB書き込み） -----
  const addCustomer = (c) => {
    const id = 'c' + String(Date.now()).slice(-6)
    const newCustomer = {
      id,
      visitCount: 0,
      totalSpent: 0,
      assignedStaff: c.assignedStaff || '',
      lastVisit: '',
      lastMenu: '',
      hair: { type: c.hairType || '', condition: c.hairCondition || '', scalp: c.scalp || '', notes: c.hairNotes || '' },
      allergies: c.allergies ? c.allergies.split(/[、,]/).map((s) => s.trim()).filter(Boolean) : [],
      reservationPattern: c.reservationPattern || 'パターン未確定',
      integrations: { line: c.line ? '連携済' : '未連携', instagram: c.instagram || '未連携', google: '未送信' },
      stepDelivery: [{ step: 1, title: '初回来店お礼', status: '予約', date: '-' }],
      history: [],
      name: c.name,
      kana: c.kana,
      gender: c.gender,
      birthday: c.birthday,
      phone: c.phone,
      email: c.email,
      status: c.status || 'new',
      source: c.source || 'hotpepper',
    }
    setState((s) => ({ ...s, customers: [newCustomer, ...s.customers] }))
    dbCustomer(newCustomer)
    toast('顧客を登録しました')
    return id
  }

  const updateCustomer = (id, fields) => {
    const cur = stateRef.current.customers.find((c) => c.id === id)
    setState((s) => ({ ...s, customers: s.customers.map((c) => (c.id === id ? { ...c, ...fields } : c)) }))
    if (cur) { dbCustomer({ ...cur, ...fields }); toast('保存しました') }
  }

  const addTreatment = (customerId, record) => {
    const c = stateRef.current.customers.find((x) => x.id === customerId)
    if (!c) return
    const recipe = record.recipe ? { note: record.recipe } : null
    const price = record.price ? Number(record.price) : priceOf(record.menu)
    const entry = { date: record.date, staff: record.staff, menu: record.menu, note: record.note || '', price, recipe, photos: record.photos || [] }
    // 日付順（新しい順）に並べ直す
    const history = [entry, ...c.history].sort((a, b) => (a.date < b.date ? 1 : -1))
    // 来店回数は「1日1来店」。同日に既に来店記録／チェックイン済みなら二重カウントしない
    const alreadyCounted = c.lastVisit === record.date || c.history.some((h) => h.date === record.date)
    const updated = {
      ...c,
      lastVisit: history[0].date,
      lastMenu: history[0].menu,
      visitCount: (c.visitCount || 0) + (alreadyCounted ? 0 : 1),
      totalSpent: (c.totalSpent || 0) + price,
      history,
    }
    // 施術後にステータスと予約パターンを自動更新
    updated.status = computeStatus(updated, stateRef.current.settings.thresholds)
    updated.reservationPattern = computePattern(history)
    setState((s) => ({ ...s, customers: s.customers.map((x) => (x.id === customerId ? updated : x)) }))
    dbCustomer(updated)
    syncRichMenu(updated, c.status)
    toast('施術記録を保存しました')

    // 売上シート連携（設定されている場合のみ・ベストエフォート）
    // 失敗しても施術記録の保存自体は止めない。売上データの正はオカエル本体（売上台帳）。
    const sheetUrl = stateRef.current.settings.salesSheetUrl
    if (sheetUrl) {
      fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors', // GAS WebアプリはCORSヘッダを返さないため（応答は読まず送信のみ行う）
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          日付: entry.date,
          スタッフ: entry.staff || '',
          メニュー: entry.menu || '',
          金額: price,
          顧客名: c.name || '',
        }),
      }).catch((e) => console.error('売上シート連携の送信に失敗', e))
    }
  }

  // QRチェックイン：来店を1回カウントしてスタンプ・ステータスを更新
  // 戻り値で「新しいマイルストーンに到達したか」を返す
  const checkIn = (customerId) => {
    const c = stateRef.current.customers.find((x) => x.id === customerId)
    if (!c) return { ok: false }
    const before = c.visitCount || 0
    // 1日1来店：本日すでに来店カウント済みなら二重カウントしない
    const alreadyToday = c.lastVisit === TODAY_ISO || c.history.some((h) => h.date === TODAY_ISO)
    const after = alreadyToday ? before : before + 1
    const updated = { ...c, visitCount: after, lastVisit: TODAY_ISO }
    updated.status = computeStatus(updated, stateRef.current.settings.thresholds)
    setState((s) => ({ ...s, customers: s.customers.map((x) => (x.id === customerId ? updated : x)) }))
    dbCustomer(updated)
    syncRichMenu(updated, c.status)
    // 来店をダッシュボードに通知
    if (hasSupabase) {
      supabase.from('notifications').insert({
        type: 'checkin',
        customer_id: c.id,
        customer_name: c.name,
        message: alreadyToday
          ? `${c.name}様がチェックイン（本日2回目・来店回数は据え置き）`
          : `${c.name}様がチェックイン（来店${after}回目）`,
        read: false,
        created_at: new Date().toISOString(),
      }).then(({ error }) => error && console.error('notification insert', error))
    }
    const milestoneReached = Math.floor(after / 10) > Math.floor(before / 10)
    return { ok: true, customer: updated, before, after, milestoneReached, alreadyToday }
  }

  // クーポンを使用済みにする（usedBy: 'customer' またはスタッフ名）
  const redeemCoupon = (customerId, tag, usedBy = 'customer') => {
    if (stateRef.current.couponRedemptions.some((r) => r.customerId === customerId && r.tag === tag)) return
    const entry = { customerId, tag, usedAt: new Date().toISOString(), usedBy }
    setState((s) => ({ ...s, couponRedemptions: [...s.couponRedemptions, entry] }))
    dbRedeem(entry)
    toast('クーポンを使用済みにしました')
  }
  // 使用済みを取り消す（スタッフの消し込みミス用）
  const unredeemCoupon = (customerId, tag) => {
    setState((s) => ({ ...s, couponRedemptions: s.couponRedemptions.filter((r) => !(r.customerId === customerId && r.tag === tag)) }))
    dbUnredeem(customerId, tag)
    toast('使用済みを取り消しました')
  }

  const addReservation = (r) => {
    const id = 'r' + String(Date.now()).slice(-6)
    const newRes = { id, ...r }
    setState((s) => ({ ...s, reservations: [...s.reservations, newRes] }))
    dbReservation(newRes)
    toast('予約を追加しました')
    // 予約通知をダッシュボードに記録
    if (hasSupabase) {
      const c = stateRef.current.customers.find((x) => x.id === r.customerId)
      supabase.from('notifications').insert({
        type: 'reservation',
        customer_id: r.customerId || null,
        customer_name: r.customer || null,
        message: `${r.date} ${r.start}〜 ${r.menu} / 担当：${r.staff}`,
        read: false,
        created_at: new Date().toISOString(),
      }).then(({ error }) => error && console.error('notification insert', error))
    }
    return id
  }

  const updateReservation = (id, fields) => {
    const cur = stateRef.current.reservations.find((r) => r.id === id)
    setState((s) => ({ ...s, reservations: s.reservations.map((r) => (r.id === id ? { ...r, ...fields } : r)) }))
    if (cur) { dbReservation({ ...cur, ...fields }); toast('予約を保存しました') }
  }

  const deleteReservation = (id) => {
    setState((s) => ({ ...s, reservations: s.reservations.filter((r) => r.id !== id) }))
    dbDeleteReservation(id)
    toast('予約を削除しました')
  }

  const cancelReservation = (id) => {
    setState((s) => ({ ...s, reservations: s.reservations.map((r) => r.id === id ? { ...r, cancelled: true } : r) }))
    if (hasSupabase) {
      supabase.from('reservations').update({ cancelled: true }).eq('id', id)
        .then(({ error }) => { if (error) { console.error('reservation cancel', error); toast('予約キャンセルの保存に失敗しました', 'error') } })
    }
    toast('予約をキャンセルしました')
  }

  const updateSettings = (fields) => {
    const next = { ...stateRef.current.settings, ...fields }
    setState((s) => ({ ...s, settings: { ...s.settings, ...fields } }))
    dbSettings(next)
  }

  // トーク画面：スタッフから顧客へLINE返信（本番はAPI経由で送信、デモはローカルに追記のみ）
  const sendMessage = async (customerId, text) => {
    if (!hasSupabase) {
      // デモモード：実際には送らず、会話上は送った体で見せる
      const local = { id: 'm' + Date.now(), customerId, direction: 'out', text, sender: 'スタッフ(デモ)', read: true, createdAt: new Date().toISOString() }
      setState((s) => ({ ...s, messages: [...s.messages, local] }))
      return { ok: true }
    }
    try {
      const res = await fetch('/api/send-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, text }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: data?.error }
      // 送信成功：最新の会話を取り直して同期
      const { data: msgs } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
      if (msgs) setState((s) => ({ ...s, messages: msgs.map(fromMessageRow) }))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  }

  // トーク画面を開いたら、その顧客からの未読メッセージを既読にする
  const markMessagesRead = (customerId) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => (m.customerId === customerId && m.direction === 'in' && !m.read) ? { ...m, read: true } : m),
    }))
    if (hasSupabase) {
      supabase.from('messages').update({ read: true }).eq('customer_id', customerId).eq('direction', 'in').eq('read', false)
        .then(({ error }) => error && console.error('message markRead', error))
    }
  }

  // 既存の全顧客のステータス・予約パターンを今の閾値で一括再計算
  const recomputeAll = () => {
    const next = stateRef.current.customers.map((c) => ({
      ...c,
      status: computeStatus(c, stateRef.current.settings.thresholds),
      reservationPattern: computePattern(c.history),
    }))
    setState((s) => ({ ...s, customers: next }))
    dbCustomers(next)
  }

  const resetData = async () => {
    if (hasSupabase) {
      await supabase.from('reservations').delete().neq('id', '')
      await supabase.from('customers').delete().neq('id', '')
      await supabase.from('customers').upsert(sampleCustomers.map(toCustomerRow))
      await supabase.from('reservations').upsert(sampleReservations.map(toResRow))
      await supabase.from('settings').upsert({ id: 1, data: freshSettings() })
    }
    setState(freshState())
  }

  if (loading) {
    return <div className="empty" style={{ padding: 60, textAlign: 'center' }}>読み込み中…</div>
  }

  return (
    <StoreContext.Provider value={{ ...state, loading, addCustomer, updateCustomer, addTreatment, checkIn, redeemCoupon, unredeemCoupon, addReservation, updateReservation, deleteReservation, cancelReservation, updateSettings, recomputeAll, resetData, sendMessage, markMessagesRead }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
