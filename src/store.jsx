import { createContext, useContext, useEffect, useState } from 'react'
import { sampleCustomers, sampleReservations } from './data/sampleData.js'

const StoreContext = createContext(null)
const LS_KEY = 'salonhub.v1'

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return { customers: sampleCustomers, reservations: sampleReservations }
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
      integrations: { line: c.line ? '連携済' : '未連携', instagram: c.instagram || '未連携', google: '未投稿', hotpepper: '未登録' },
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

  const addTreatment = (customerId, record) => {
    setState((s) => ({
      ...s,
      customers: s.customers.map((c) => {
        if (c.id !== customerId) return c
        const recipe = record.recipe ? { note: record.recipe } : null
        const entry = { date: record.date, staff: record.staff, menu: record.menu, note: record.note || '', recipe }
        return {
          ...c,
          lastVisit: record.date,
          lastMenu: record.menu,
          visitCount: (c.visitCount || 0) + 1,
          history: [entry, ...c.history],
        }
      }),
    }))
  }

  const resetData = () => setState({ customers: sampleCustomers, reservations: sampleReservations })

  return (
    <StoreContext.Provider value={{ ...state, addCustomer, addTreatment, resetData }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
