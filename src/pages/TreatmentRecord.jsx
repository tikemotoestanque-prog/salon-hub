import { useState, useRef } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { uploadPhoto } from '../supabaseClient.js'
import { useToast } from '../components/Toast.jsx'
import { TODAY_ISO } from '../utils.js'

export default function TreatmentRecord() {
  const { id } = useParams()
  const { customers, addTreatment, settings } = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const customer = customers.find((c) => c.id === id)

  const [f, setF] = useState({
    date: TODAY_ISO,
    staff: customer?.assignedStaff || '',
    menu: '',
    price: '',
    note: '',
    recipe: '',
  })
  const [photosBefore, setPhotosBefore] = useState([]) // { file, preview }
  const [photosAfter, setPhotosAfter] = useState([])
  const [uploading, setUploading] = useState(false)
  const beforeRef = useRef()
  const afterRef = useRef()

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  if (!customer) return <Navigate to="/customers" replace />

  const addFiles = (files, setter) => {
    const items = Array.from(files).map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setter((prev) => [...prev, ...items])
  }

  const removePhoto = (idx, setter) => setter((prev) => prev.filter((_, i) => i !== idx))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.menu.trim()) return
    setUploading(true)

    // 写真をアップロード
    const uploadAll = async (items, tag) => {
      const urls = []
      for (const item of items) {
        const url = await uploadPhoto(item.file, customer.id)
        if (url) urls.push({ url, tag })
      }
      return urls
    }

    const [before, after] = await Promise.all([
      uploadAll(photosBefore, 'before'),
      uploadAll(photosAfter, 'after'),
    ])
    const failedCount = (photosBefore.length + photosAfter.length) - (before.length + after.length)
    if (failedCount > 0) toast(`写真${failedCount}枚のアップロードに失敗しました（記録自体は保存します）`, 'error')

    addTreatment(customer.id, { ...f, photos: [...before, ...after] })
    setUploading(false)
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
              {settings.staff.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>メニュー <span className="required">*</span></label>
            <input list="rec-menu-suggest" value={f.menu} onChange={set('menu')} placeholder="カット + カラー + TR" required />
            <datalist id="rec-menu-suggest">{settings.menus.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          <div className="field">
            <label>金額（円・空欄ならメニューから概算）</label>
            <input type="number" value={f.price} onChange={set('price')} placeholder="例: 12000" />
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

        {/* 施術前後の写真 */}
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>📷 施術前後の写真（任意）</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <PhotoZone label="施術前" items={photosBefore} onAdd={(files) => addFiles(files, setPhotosBefore)} onRemove={(i) => removePhoto(i, setPhotosBefore)} inputRef={beforeRef} />
            <PhotoZone label="施術後" items={photosAfter} onAdd={(files) => addFiles(files, setPhotosAfter)} onRemove={(i) => removePhoto(i, setPhotosAfter)} inputRef={afterRef} />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={() => nav('/customer/' + customer.id)}>キャンセル</button>
          <button type="submit" className="btn" disabled={uploading}>
            {uploading ? 'アップロード中…' : '記録する'}
          </button>
        </div>
      </form>
    </div>
  )
}

function PhotoZone({ label, items, onAdd, onRemove, inputRef }) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ position: 'relative' }}>
            <img src={item.preview} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />
            <button type="button" onClick={() => onRemove(i)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#d32f2f', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{ width: 80, height: 80, border: '2px dashed #ccc', borderRadius: 6, background: 'none', cursor: 'pointer', fontSize: 24, color: '#bbb' }}
        >+</button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => onAdd(e.target.files)} />
    </div>
  )
}
