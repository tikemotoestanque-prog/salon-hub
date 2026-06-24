import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { STAFF } from '../data/sampleData.js'

export default function TreatmentRecord() {
  const { id } = useParams()
  const { customers, addTreatment } = useStore()
  const nav = useNavigate()

  const [f, setF] = useState({
    customerId: id || '',
    date: '2026-06-24',
    staff: '',
    menu: '',
    note: '',
    recipe: '',
  })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (!f.customerId || !f.menu.trim()) return
    addTreatment(f.customerId, f)
    nav('/customer/' + f.customerId)
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>施術記録入力</h1>
          <p>来店時の施術内容・薬剤レシピを記録します</p>
        </div>
      </div>

      <form className="card section" onSubmit={submit}>
        <div className="form-grid">
          <div className="field">
            <label>顧客 <span className="required">*</span></label>
            <select value={f.customerId} onChange={set('customerId')} required>
              <option value="">選択してください</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}（{c.kana}）</option>)}
            </select>
          </div>
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
          <div className="field">
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
          <button type="button" className="btn ghost" onClick={() => nav(id ? '/customer/' + id : '/')}>キャンセル</button>
          <button type="submit" className="btn">記録する</button>
        </div>
      </form>
    </div>
  )
}
