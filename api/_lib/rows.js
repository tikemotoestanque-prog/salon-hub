// DB(snake_case) ⇔ アプリ(camelCase) の変換。
// src/store.jsx と同じ定義（API側はReactをimportできないため共用モジュールとして分離）。

export const fromCustomerRow = (r) => ({
  id: r.id, name: r.name, kana: r.kana, gender: r.gender, birthday: r.birthday || '',
  phone: r.phone, email: r.email, status: r.status, source: r.source,
  lastVisit: r.last_visit || '', lastMenu: r.last_menu || '', assignedStaff: r.assigned_staff || '',
  visitCount: r.visit_count || 0, totalSpent: r.total_spent || 0,
  hair: r.hair || {}, allergies: r.allergies || [],
  reservationPattern: r.reservation_pattern || '',
  integrations: r.integrations || {}, stepDelivery: r.step_delivery || [],
  history: r.history || [], tags: r.tags || [],
})

export const toCustomerRow = (c) => ({
  id: c.id, name: c.name, kana: c.kana, gender: c.gender, birthday: c.birthday || null,
  phone: c.phone, email: c.email, status: c.status, source: c.source,
  last_visit: c.lastVisit || null, last_menu: c.lastMenu || null, assigned_staff: c.assignedStaff || null,
  visit_count: c.visitCount || 0, total_spent: c.totalSpent || 0,
  hair: c.hair || {}, allergies: c.allergies || [],
  reservation_pattern: c.reservationPattern || null,
  integrations: c.integrations || {}, step_delivery: c.stepDelivery || [],
  history: c.history || [], tags: c.tags || [],
})

export const fromResRow = (r) => ({
  id: r.id, date: r.date, customerId: r.customer_id || null, customer: r.customer,
  staff: r.staff, start: r.start, end: r.end, menu: r.menu, source: r.source, cancelled: r.cancelled || false,
})

export const toResRow = (r) => ({
  id: r.id, date: r.date, customer_id: r.customerId || null, customer: r.customer,
  staff: r.staff, start: r.start, end: r.end, menu: r.menu, source: r.source,
})

export const fromRedemptionRow = (r) => ({ customerId: r.customer_id, tag: r.coupon_tag, usedAt: r.used_at, usedBy: r.used_by || '' })
