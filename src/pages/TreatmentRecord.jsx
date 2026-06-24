import { useState } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { STAFF } from '../data/sampleData.js'

export default function TreatmentRecord() {
  const { id } = useParams()
  const { customers, addTreatment } = useStore()
  const nav = useNavigate()
  const customer = customers.find((c) => c.id === id)

  const [f, setF] = useState({
    date: '2026-06-24',
    staff: customer?.assignedStaff || '',
    menu: '',
    note: '',
    recipe: '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  if (!customer) return <Navigate to="/" replace />

  const submit = (e) => {
    e.preventDefault()
    if (!f.menu.trim()) return
    addTreatment(customer.id, f)
    nav('/customer/' + customer.id)
  }

  return (
    <div>
      <Link className="back-link" to={'/customer/' + customer.id}>← {customer.name} の詳細へ戻る</Link>
      <div className="page-head">
        <div>
          <h1>施術記録入力</h1>
          <p>{customer.name}（{customer.kana}）の施術内容・薬剤レシピを記録します</p>
        </div>
      </div>

      <form className="card section" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label>来店日 <span className="required">*</span></label>
            <input type="date" value={f.date} onChange={set('date')} required />
          </div>
          <div className="field">
            <label>担当スタッフ</label>
            <select value={f.staff} onChange={set('staff')}>
              <option value="">未選択</option>
              {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field full">
            <label>メニュー <span className="required">*</span></label>
            <input value={f.menu} onChange={set('menu')} placeholder="カット + カラー + TR" required />
          </div>
          <div className="field full">
            <label>対応メモ</label>
            <textarea value={f.note} onChange={set('note')} placeholder="要望・仕上がり・次回提案など" />
          </div>
          <div className="field full">
            <label>🧪 薬剤レシピ</label>
            <textarea value={f.recipe} onChange={set('recipe')} placeholder="例: オラ8-5 + 6-66 = 1:1 / OX4.5% 60g / 放置35分" />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={() => nav('/customer/' + customer.id)}>キャンセル</button>
          <button type="submit" className="btn">記録する</button>
        </div>
      </form>
    </div>
  )
}
