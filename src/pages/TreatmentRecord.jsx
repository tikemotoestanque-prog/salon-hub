import { useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { uploadPhoto } from '../supabaseClient.js'
import { useToast } from '../components/Toast.jsx'
import { TODAY_ISO } from '../utils.js'

const blankMenuRow = (value = '', isCustom = false) => ({ value, isCustom })

export default function TreatmentRecord() {
  const { id } = useParams()
  const { customers, addTreatment, settings } = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const customer = customers.find((c) => c.id === id)

  // 予約タイムテーブルの「予約を編集」から遷移してきた場合、
  // クエリパラメータ（?date=&staff=&menu=）で日付・スタッフ・メニューを引き継ぐ
  const qDate = params.get('date')
  const qStaff = params.get('staff')
  const qMenu = params.get('menu')

  const [f, setF] = useState(() => {
    const qMenuConfigured = qMenu && settings.menus.includes(qMenu) ? settings.menuPrices?.[qMenu] : null
    return {
      date: qDate || TODAY_ISO,
      staff: qStaff || customer?.assignedStaff || '',
      menu: qMenu || '',
      price: qMenuConfigured != null ? String(qMenuConfigured) : '',
      note: '',
      recipe: '',
    }
  })
  // メニューを複数行で選べるようにする（セット売りせず、単品ごとに会計する店向け）。
  // メニューが設定済み一覧に無い場合（予約から引き継いだ組み合わせメニュー等）は
  // 最初から自由入力モードで表示する
  const [menuRows, setMenuRows] = useState(() => [
    blankMenuRow(qMenu || '', !!qMenu && !settings.menus.includes(qMenu)),
  ])
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

  // 設定済みメニューの行だけを合計して金額欄に反映する（自由入力の行は含めない＝手動で足してもらう）
  const recomputePrice = (rows) => {
    const total = rows.reduce((sum, r) => {
      if (r.isCustom || !r.value.trim()) return sum
      const configured = settings.menuPrices?.[r.value]
      return sum + (configured != null ? configured : 0)
    }, 0)
    const anyValue = rows.some((r) => r.value.trim())
    if (anyValue) setF((p) => ({ ...p, price: String(total) }))
  }

  const addMenuRow = () => setMenuRows((rows) => [...rows, blankMenuRow()])
  const removeMenuRow = (i) => setMenuRows((rows) => {
    const next = rows.filter((_, idx) => idx !== i)
    recomputePrice(next)
    return next
  })
  const setMenuRowSelect = (i, v) => setMenuRows((rows) => {
    const next = rows.map((r, idx) => (idx === i ? (v === '__custom__' ? blankMenuRow('', true) : blankMenuRow(v, false)) : r))
    recomputePrice(next)
    return next
  })
  const setMenuRowCustomText = (i, v) => setMenuRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, value: v } : r)))
  const menuRowBackToSelect = (i) => setMenuRows((rows) => {
    const next = rows.map((r, idx) => (idx === i ? blankMenuRow('', false) : r))
    recomputePrice(next)
    return next
  })

  const submit = async (e) => {
    e.preventDefault()
    const finalMenu = menuRows.map((r) => r.value.trim()).filter(Boolean).join(' + ')
    if (!finalMenu) { toast('メニューを選択してください', 'error'); return }
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

    addTreatment(customer.id, { ...f, menu: finalMenu, photos: [...before, ...after] })
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
          <div className="field full">
            <label>メニュー <span className="required">*</span></label>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--muted)' }}>セット売りしていない場合は「＋ メニューを追加する」で単品を複数選べます。選んだ分の金額は自動で合計されます。</p>
            {menuRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {!row.isCustom ? (
                  <select
                    value={settings.menus.includes(row.value) ? row.value : ''}
                    onChange={(e) => setMenuRowSelect(i, e.target.value)}
                    required={i === 0}
                    style={{ flex: 1 }}
                  >
                    <option value="" disabled>選択してください</option>
                    {settings.menus.map((m) => <option key={m} value={m}>{m}</option>)}
                    <option value="__custom__">その他（自由入力）</option>
                  </select>
                ) : (
                  <>
                    <input
                      value={row.value}
                      onChange={(e) => setMenuRowCustomText(i, e.target.value)}
                      placeholder="例：シャンプー"
                      required={i === 0}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="btn ghost sm" onClick={() => menuRowBackToSelect(i)}>一覧から選ぶ</button>
                  </>
                )}
                {menuRows.length > 1 && (
                  <button type="button" className="btn ghost danger sm" onClick={() => removeMenuRow(i)}>×</button>
                )}
              </div>
            ))}
            <button type="button" className="btn ghost sm" onClick={addMenuRow}>＋ メニューを追加する</button>
          </div>
          <div className="field">
            <label>金額（円・複数メニューは設定済みの分を自動合計。自由入力・未設定分は手動で調整）</label>
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
          <ShareBothButton photosBefore={photosBefore} photosAfter={photosAfter} caption={menuRows.map((r) => r.value.trim()).filter(Boolean).join(' + ')} />
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

// 施術前・施術後の写真がそろったら押せるようになる共有ボタン。
// スマホの共有シートを開き、Instagramや加工アプリ（Canva等）へまとめて渡す。
// navigator.shareが使えない環境（主にPCブラウザ）では、代わりにまとめてダウンロードする
function ShareBothButton({ photosBefore, photosAfter, caption }) {
  const ready = photosBefore.length > 0 && photosAfter.length > 0

  const shareBoth = async () => {
    if (!ready) return
    const files = [...photosBefore, ...photosAfter].map((item) => item.file)
    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: 'オカエル', text: caption || '' })
        return
      }
    } catch (e) {
      if (e?.name === 'AbortError') return
    }
    // フォールバック：まとめてダウンロードする
    files.forEach((file, i) => {
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = `施術記録写真_${i + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    })
  }

  return (
    <div style={{ marginTop: 14 }}>
      <button
        type="button"
        className="btn"
        disabled={!ready}
        onClick={shareBoth}
        style={!ready ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      >📤 施術前後の写真をまとめてSNSへ共有</button>
      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
        {ready
          ? 'スマホなら共有シートからInstagramや加工アプリ（Canva等）へ渡せます（お客様の同意を得た写真のみご利用ください）。'
          : '施術前・施術後、両方の写真を1枚以上追加すると押せるようになります。'}
      </p>
    </div>
  )
}
