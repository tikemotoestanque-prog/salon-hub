import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { STATUS_META, SOURCE_META, STAFF } from '../data/sampleData.js'

// 顧客オブジェクト（入れ子）→ フォーム（平たい形）に変換
function toForm(c) {
  return {
    name: c.name || '', kana: c.kana || '', gender: c.gender || '女性',
    birthday: c.birthday || '', phone: c.phone || '', email: c.email || '',
    status: c.status || 'new', source: c.source || 'hotpepper',
    assignedStaff: c.assignedStaff || '',
    reservationPattern: c.reservationPattern || '',
    hairType: c.hair?.type || '', hairCondition: c.hair?.condition || '',
    scalp: c.hair?.scalp || '', hairNotes: c.hair?.notes || '',
    allergies: (c.allergies || []).join('、'),
    line: c.integrations?.line === '連携済',
    instagram: c.integrations?.instagram && c.integrations.instagram !== '未連携' ? c.integrations.instagram : '',
  }
}

export default function EditCustomer() {
  const { id } = useParams()
  const nav = useNavigate()
  const { customers, updateCustomer } = useStore()
  const c = customers.find((x) => x.id === id)
  const [f, setF] = useState(() => (c ? toForm(c) : null))

  if (!c) {
    return (
      <div className="empty">
        顧客が見つかりません。<br />
        <Link className="back-link" to="/">← 顧客一覧へ戻る</Link>
      </div>
    )
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    updateCustomer(id, {
      name: f.name, kana: f.kana, gender: f.gender, birthday: f.birthday,
      phone: f.phone, email: f.email, status: f.status, source: f.source,
      assignedStaff: f.assignedStaff, reservationPattern: f.reservationPattern,
      hair: { type: f.hairType, condition: f.hairCondition, scalp: f.scalp, notes: f.hairNotes },
      allergies: f.allergies ? f.allergies.split(/[、,]/).map((s) => s.trim()).filter(Boolean) : [],
      integrations: {
        ...c.integrations,
        line: f.line ? '連携済' : '未連携',
        instagram: f.instagram || '未連携',
      },
    })
    nav('/customer/' + id)
  }

  return (
    <div>
      <Link className="back-link" to={'/customer/' + id}>← 顧客詳細へ戻る</Link>
      <div className="page-head">
        <div>
          <h1>顧客情報の編集</h1>
          <p>{c.name} さんの情報を修正します（必須項目 <span className="required">*</span>）</p>
        </div>
      </div>

      <form className="card section" onSubmit={submit}>
        <h3>👤 基本情報</h3>
        <div className="form-grid">
          <div className="field">
            <label>氏名 <span className="required">*</span></label>
            <input value={f.name} onChange={set('name')} placeholder="山田 花子" required />
          </div>
          <div className="field">
            <label>フリガナ</label>
            <input value={f.kana} onChange={set('kana')} placeholder="ヤマダ ハナコ" />
          </div>
          <div className="field">
            <label>性別</label>
            <select value={f.gender} onChange={set('gender')}>
              <option>女性</option><option>男性</option><option>その他</option>
            </select>
          </div>
          <div className="field">
            <label>生年月日</label>
            <input type="date" value={f.birthday} onChange={set('birthday')} />
          </div>
          <div className="field">
            <label>電話番号</label>
            <input value={f.phone} onChange={set('phone')} placeholder="090-1234-5678" />
          </div>
          <div className="field">
            <label>メール</label>
            <input type="email" value={f.email} onChange={set('email')} placeholder="example@mail.com" />
          </div>
          <div className="field">
            <label>ステータス</label>
            <select value={f.status} onChange={set('status')}>
              {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>流入元</label>
            <select value={f.source} onChange={set('source')}>
              {Object.entries(SOURCE_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label>担当スタッフ</label>
            <select value={f.assignedStaff} onChange={set('assignedStaff')}>
              <option value="">未定</option>
              {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>予約パターン</label>
            <input value={f.reservationPattern} onChange={set('reservationPattern')} placeholder="約4週間ごと 等" />
          </div>
        </div>

        <h3 style={{ marginTop: 18 }}>💇 髪質・頭皮 / アレルギー</h3>
        <div className="form-grid">
          <div className="field"><label>髪質</label><input value={f.hairType} onChange={set('hairType')} placeholder="硬毛・多毛 等" /></div>
          <div className="field"><label>状態</label><input value={f.hairCondition} onChange={set('hairCondition')} placeholder="ダメージ中 等" /></div>
          <div className="field"><label>頭皮</label><input value={f.scalp} onChange={set('scalp')} placeholder="乾燥・敏感 等" /></div>
          <div className="field"><label>アレルギー（、区切り）</label><input value={f.allergies} onChange={set('allergies')} placeholder="ジアミン、香料" /></div>
          <div className="field full"><label>髪・頭皮メモ</label><textarea value={f.hairNotes} onChange={set('hairNotes')} /></div>
        </div>

        <h3 style={{ marginTop: 18 }}>🔗 外部連携</h3>
        <div className="form-grid">
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input id="line" type="checkbox" checked={f.line} onChange={set('line')} style={{ width: 'auto' }} />
            <label htmlFor="line" style={{ color: 'var(--ink)' }}>公式LINE連携済</label>
          </div>
          <div className="field"><label>Instagram</label><input value={f.instagram} onChange={set('instagram')} placeholder="@account" /></div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={() => nav('/customer/' + id)}>キャンセル</button>
          <button type="submit" className="btn">変更を保存</button>
        </div>
      </form>
    </div>
  )
}
