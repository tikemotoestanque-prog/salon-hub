import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { SOURCE_META } from '../data/sampleData.js'
import { TODAY_ISO } from '../utils.js'

const empty = {
  name: '', kana: '', gender: '女性', birthday: '', phone: '', email: '',
  status: 'new', source: 'hotpepper', assignedStaff: '',
  hairType: '', hairCondition: '', scalp: '', hairNotes: '',
  allergies: '', reservationPattern: '', line: false, instagram: '',
  recDate: TODAY_ISO, recMenu: '', recPrice: '', recNote: '', recRecipe: '',
}

export default function NewCustomer() {
  const { addCustomer, addTreatment, settings } = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const preset = params.get('source')
  const presetName = params.get('name') || ''
  const fromLine = preset === 'line'
  const [f, setF] = useState(() => ({
    ...empty,
    name: presetName,
    source: preset && SOURCE_META[preset] ? preset : empty.source,
    line: fromLine ? true : empty.line,
  }))
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    const id = addCustomer(f)
    if (f.recMenu.trim()) {
      addTreatment(id, {
        date: f.recDate,
        staff: f.assignedStaff,
        menu: f.recMenu,
        price: f.recPrice,
        note: f.recNote,
        recipe: f.recRecipe,
      })
    }
    nav('/customer/' + id)
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>新規顧客登録</h1>
          <p>必須項目（<span className="required">*</span>）を入力してください</p>
        </div>
      </div>

      {fromLine && (
        <div className="lp-flash">📲 デモHPの「LINEで予約」から来た新規予約として登録します（流入元＝公式LINE / LINE連携ONを初期設定）。</div>
      )}

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
              {Object.entries(settings.statuses).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
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
              {settings.staff.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>予約パターン</label>
            <input value={f.reservationPattern} onChange={set('reservationPattern')} placeholder="施術記録から自動算出されます" />
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

        <h3 style={{ marginTop: 18 }}>🧪 初回施術記録（任意）</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)' }}>
          その場で施術する新規のお客様は、ここに記録すると登録と同時に履歴に残ります。空欄でもOKです。
        </p>
        <div className="form-grid">
          <div className="field">
            <label>来店日</label>
            <input type="date" value={f.recDate} onChange={set('recDate')} />
          </div>
          <div className="field">
            <label>メニュー</label>
            <input list="menu-suggest" value={f.recMenu} onChange={set('recMenu')} placeholder="カット + カラー 等（入力すると履歴に登録）" />
            <datalist id="menu-suggest">{settings.menus.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          <div className="field">
            <label>金額（円・空欄ならメニューから概算）</label>
            <input type="number" value={f.recPrice} onChange={set('recPrice')} placeholder="例: 8500" />
          </div>
          <div className="field full">
            <label>対応メモ</label>
            <textarea value={f.recNote} onChange={set('recNote')} placeholder="要望・仕上がりなど" />
          </div>
          <div className="field full">
            <label>薬剤レシピ</label>
            <textarea value={f.recRecipe} onChange={set('recRecipe')} placeholder="例: オラ8-5 + 6-66 = 1:1 / OX4.5% 60g / 放置35分" />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={() => nav('/customers')}>キャンセル</button>
          <button type="submit" className="btn">登録する</button>
        </div>
      </form>
    </div>
  )
}
