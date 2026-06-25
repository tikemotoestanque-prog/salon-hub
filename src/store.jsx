import { createContext, useContext, useEffect, useState } from 'react'
import { sampleCustomers, sampleReservations, DEFAULT_SETTINGS } from './data/sampleData.js'
import { computeStatus, computePattern, priceOf } from './utils.js'

const StoreContext = createContext(null)
const LS_KEY = 'salonhub.v1'

const freshSettings = () => JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
const freshState = () => ({ customers: sampleCustomers, reservations: sampleReservations, settings: freshSettings() })

function load() {
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

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch (e) { /* ignore */ }
  }, [state])

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
    return id
  }

  const updateCustomer = (id, fields) => {
    setState((s) => ({
      ...s,
      customers: s.customers.map((c) => (c.id === id ? { ...c, ...fields } : c)),
    }))
  }

  const addTreatment = (customerId, record) => {
    setState((s) => ({
      ...s,
      customers: s.customers.map((c) => {
        if (c.id !== customerId) return c
        const recipe = record.recipe ? { note: record.recipe } : null
        const price = record.price ? Number(record.price) : priceOf(record.menu)
        const entry = { date: record.date, staff: record.staff, menu: record.menu, note: record.note || '', price, recipe }
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
        updated.status = computeStatus(updated, s.settings.thresholds)
        updated.reservationPattern = computePattern(history)
        return updated
      }),
    }))
  }

  const addReservation = (r) => {
    const id = 'r' + String(Date.now()).slice(-6)
    setState((s) => ({ ...s, reservations: [...s.reservations, { id, ...r }] }))
    return id
  }

  const updateReservation = (id, fields) => {
    setState((s) => ({
      ...s,
      reservations: s.reservations.map((r) => (r.id === id ? { ...r, ...fields } : r)),
    }))
  }

  const deleteReservation = (id) => {
    setState((s) => ({ ...s, reservations: s.reservations.filter((r) => r.id !== id) }))
  }

  const updateSettings = (fields) => setState((s) => ({ ...s, settings: { ...s.settings, ...fields } }))

  // 既存の全顧客のステータス・予約パターンを今の閾値で一括再計算
  const recomputeAll = () => setState((s) => ({
    ...s,
    customers: s.customers.map((c) => ({
      ...c,
      status: computeStatus(c, s.settings.thresholds),
      reservationPattern: computePattern(c.history),
    })),
  }))

  const resetData = () => setState(freshState())

  return (
    <StoreContext.Provider value={{ ...state, addCustomer, updateCustomer, addTreatment, addReservation, updateReservation, deleteReservation, updateSettings, recomputeAll, resetData }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
