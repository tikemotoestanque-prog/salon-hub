import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { sampleCustomers, sampleReservations, DEFAULT_SETTINGS, SAMPLE_STAFF_OFF } from './data/sampleData.js'
import { computeStatus, computePattern, priceOf } from './utils.js'
import { supabase, hasSupabase } from './supabaseClient.js'

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
const freshState = () => ({ customers: sampleCustomers, reservations: sampleReservations, settings: freshSettings() })

// ===== localStorage（Supabase未設定時のフォールバック） =====
function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        customers: p.customers || sampleCustomers,
        reservations: p.reservations || sampleReservations,
        // 旧データ（settings無し）でも既定値で動くようにマージ
        settings: { ...freshSettings(), ...(p.settings || {}) },
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
  history: r.history || [],
})
const toCustomerRow = (c) => ({
  id: c.id, name: c.name, kana: c.kana, gender: c.gender, birthday: c.birthday || null,
  phone: c.phone, email: c.email, status: c.status, source: c.source,
  last_visit: c.lastVisit || null, last_menu: c.lastMenu || null, assigned_staff: c.assignedStaff || null,
  visit_count: c.visitCount || 0, total_spent: c.totalSpent || 0,
  hair: c.hair || {}, allergies: c.allergies || [],
  reservation_pattern: c.reservationPattern || null,
  integrations: c.integrations || {}, step_delivery: c.stepDelivery || [],
  history: c.history || [],
})
const fromResRow = (r) => ({
  id: r.id, date: r.date, customerId: r.customer_id || null, customer: r.customer,
  staff: r.staff, start: r.start, end: r.end, menu: r.menu, source: r.source,
})
const toResRow = (r) => ({
  id: r.id, date: r.date, customer_id: r.customerId || null, customer: r.customer,
  staff: r.staff, start: r.start, end: r.end, menu: r.menu, source: r.source,
})

export function StoreProvider({ children }) {
  const [state, setState] = useState(hasSupabase
    ? { customers: [], reservations: [], settings: freshSettings() }
    : loadLocal)
  const [loading, setLoading] = useState(hasSupabase)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // ----- 初期ロード（Supabase）。空なら初回シード -----
  useEffect(() => {
    if (!hasSupabase) return
    let alive = true
    ;(async () => {
      try {
        let [{ data: cust }, { data: res }, { data: setRow }] = await Promise.all([
          supabase.from('customers').select('*').order('created_at', { ascending: false }).order('id', { ascending: true }),
          supabase.from('reservations').select('*'),
          supabase.from('settings').select('data').eq('id', 1).maybeSingle(),
        ])
        // 初回（テーブルが空）ならサンプルデータを投入
        // ※ RLSでブロックされた場合はseeding不要なので認証済み確認
        const { data: { session } } = await supabase.auth.getSession()
        if (session && (!cust || cust.length === 0)) {
          await supabase.from('customers').upsert(sampleCustomers.map(toCustomerRow))
          await supabase.from('reservations').upsert(sampleReservations.map(toResRow))
          await supabase.from('settings').upsert({ id: 1, data: freshSettings() })
          cust = sampleCustomers.map(toCustomerRow)
          res = sampleReservations.map(toResRow)
          setRow = { data: freshSettings() }
        }
        if (!alive) return
        setState({
          customers: (cust || []).map(fromCustomerRow),
          reservations: (res || []).map(fromResRow),
          settings: { ...freshSettings(), ...((setRow && setRow.data) || {}) },
        })
      } catch (e) {
        console.error('Supabase load failed, falling back to local:', e)
        if (alive) setState(loadLocal())
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  // ----- localStorage保存（Supabase未設定時のみ） -----
  useEffect(() => {
    if (hasSupabase) return
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch (e) { /* ignore */ }
  }, [state])

  // ----- DB書き込みヘルパー（Supabase時のみ実行） -----
  const dbCustomer = (c) => { if (hasSupabase) supabase.from('customers').upsert(toCustomerRow(c)).then(({ error }) => error && console.error('customer upsert', error)) }
  const dbCustomers = (list) => { if (hasSupabase) supabase.from('customers').upsert(list.map(toCustomerRow)).then(({ error }) => error && console.error('customers upsert', error)) }
  const dbReservation = (r) => { if (hasSupabase) supabase.from('reservations').upsert(toResRow(r)).then(({ error }) => error && console.error('reservation upsert', error)) }
  const dbDeleteReservation = (id) => { if (hasSupabase) supabase.from('reservations').delete().eq('id', id).then(({ error }) => error && console.error('reservation delete', error)) }
  const dbSettings = (s) => { if (hasSupabase) supabase.from('settings').upsert({ id: 1, data: s, updated_at: new Date().toISOString() }).then(({ error }) => error && console.error('settings upsert', error)) }

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
    return id
  }

  const updateCustomer = (id, fields) => {
    const cur = stateRef.current.customers.find((c) => c.id === id)
    setState((s) => ({ ...s, customers: s.customers.map((c) => (c.id === id ? { ...c, ...fields } : c)) }))
    if (cur) dbCustomer({ ...cur, ...fields })
  }

  const addTreatment = (customerId, record) => {
    const c = stateRef.current.customers.find((x) => x.id === customerId)
    if (!c) return
    const recipe = record.recipe ? { note: record.recipe } : null
    const price = record.price ? Number(record.price) : priceOf(record.menu)
    const entry = { date: record.date, staff: record.staff, menu: record.menu, note: record.note || '', price, recipe, photos: record.photos || [] }
    // 日付順（新しい順）に並べ直す
    const history = [entry, ...c.history].sort((a, b) => (a.date < b.date ? 1 : -1))
    const updated = {
      ...c,
      lastVisit: history[0].date,
      lastMenu: history[0].menu,
      visitCount: (c.visitCount || 0) + 1,
      totalSpent: (c.totalSpent || 0) + price,
      history,
    }
    // 施術後にステータスと予約パターンを自動更新
    updated.status = computeStatus(updated, stateRef.current.settings.thresholds)
    updated.reservationPattern = computePattern(history)
    setState((s) => ({ ...s, customers: s.customers.map((x) => (x.id === customerId ? updated : x)) }))
    dbCustomer(updated)
  }

  const addReservation = (r) => {
    const id = 'r' + String(Date.now()).slice(-6)
    const newRes = { id, ...r }
    setState((s) => ({ ...s, reservations: [...s.reservations, newRes] }))
    dbReservation(newRes)
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
    if (cur) dbReservation({ ...cur, ...fields })
  }

  const deleteReservation = (id) => {
    setState((s) => ({ ...s, reservations: s.reservations.filter((r) => r.id !== id) }))
    dbDeleteReservation(id)
  }

  const cancelReservation = (id) => {
    setState((s) => ({ ...s, reservations: s.reservations.map((r) => r.id === id ? { ...r, cancelled: true } : r) }))
    if (hasSupabase) supabase.from('reservations').update({ cancelled: true }).eq('id', id)
  }

  const updateSettings = (fields) => {
    const next = { ...stateRef.current.settings, ...fields }
    setState((s) => ({ ...s, settings: { ...s.settings, ...fields } }))
    dbSettings(next)
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
    <StoreContext.Provider value={{ ...state, loading, addCustomer, updateCustomer, addTreatment, addReservation, updateReservation, deleteReservation, cancelReservation, updateSettings, recomputeAll, resetData }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
