import { useState } from 'react'
import { useStore } from '../store.jsx'

export default function Settings() {
  const { settings, updateSettings, recomputeAll } = useStore()

  const [staff, setStaff] = useState(settings.staff)
  const [menus, setMenus] = useState(settings.menus)
  const [th, setTh] = useState(settings.thresholds)
  const [statusList, setStatusList] = useState(
    Object.entries(settings.statuses).map(([key, m]) => ({ key, ...m }))
  )
  const [saved, setSaved] = useState('')

  const flash = (msg) => { setSaved(msg); setTimeout(() => setSaved(''), 2500) }

  // --- staff ---
  const setStaffAt = (i, v) => setStaff(staff.map((s, idx) => (idx === i ? v : s)))
  const addStaff = () => setStaff([...staff, ''])
  const delStaff = (i) => setStaff(staff.filter((_, idx) => idx !== i))

  // --- menus ---
  const setMenuAt = (i, v) => setMenus(menus.map((s, idx) => (idx === i ? v : s)))
  const addMenu = () => setMenus([...menus, ''])
  const delMenu = (i) => setMenus(menus.filter((_, idx) => idx !== i))

  // --- statuses ---
  const setStatusAt = (i, k, v) => setStatusList(statusList.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)))
  const addStatus = () => setStatusList([...statusList, { key: 'cust' + Date.now().toString().slice(-5), label: '新ステータス', icon: '🏷', color: '#555555', bg: '#eeeeee' }])
  const delStatus = (i) => setStatusList(statusList.filter((_, idx) => idx !== i))

  const persist = () => {
    const statuses = {}
    statusList.forEach((s) => { if (s.key && s.label) statuses[s.key] = { label: s.label, icon: s.icon, color: s.color, bg: s.bg } })
    updateSettings({
      staff: staff.map((s) => s.trim()).filter(Boolean),
      menus: menus.map((s) => s.trim()).filter(Boolean),
      thresholds: {
        newMaxVisits: Number(th.newMaxVisits), vipVisits: Number(th.vipVisits), vipSpent: Number(th.vipSpent),
        followupDays: Number(th.followupDays), dormantDays: Number(th.dormantDays),
      },
      statuses,
    })
    return statuses
  }

  const save = () => { persist(); flash('保存しました ✓') }
  const saveAndRecompute = () => { persist(); recomputeAll(); flash('保存し、全顧客のステータス・予約パターンを再判定しました ✓') }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>設定</h1>
          <p>お店ごとにスタッフ・メニュー・ステータス・自動判定のルールを調整できます</p>
        </div>
        {saved && <span className="save-flash">{saved}</span>}
      </div>

      {/* しきい値 */}
      <div className="card section">
        <h3>⚙️ ステータス自動判定のルール</h3>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--muted)' }}>
          施術記録を保存したときに、ここのルールでステータスが自動で切り替わります。判定の優先順位：休眠 → 要フォロー → VIP → 新規 → 常連。
        </p>
        <div className="form-grid">
          <div className="field"><label>新規とみなす最大来店回数</label><input type="number" value={th.newMaxVisits} onChange={(e) => setTh({ ...th, newMaxVisits: e.target.value })} /></div>
          <div className="field"><label>VIPにする来店回数（以上）</label><input type="number" value={th.vipVisits} onChange={(e) => setTh({ ...th, vipVisits: e.target.value })} /></div>
          <div className="field"><label>VIPにする累計金額（円・以上）</label><input type="number" value={th.vipSpent} onChange={(e) => setTh({ ...th, vipSpent: e.target.value })} /></div>
          <div className="field"><label>要フォローにする未来店日数（以上）</label><input type="number" value={th.followupDays} onChange={(e) => setTh({ ...th, followupDays: e.target.value })} /></div>
          <div className="field"><label>休眠にする未来店日数（以上）</label><input type="number" value={th.dormantDays} onChange={(e) => setTh({ ...th, dormantDays: e.target.value })} /></div>
        </div>
      </div>

      {/* スタッフ */}
      <div className="card section">
        <h3>👥 スタッフ</h3>
        {staff.map((s, i) => (
          <div className="row-edit" key={i}>
            <input value={s} onChange={(e) => setStaffAt(i, e.target.value)} placeholder="スタッフ名" />
            <button className="btn ghost danger sm" onClick={() => delStaff(i)}>削除</button>
          </div>
        ))}
        <button className="btn ghost sm" onClick={addStaff}>＋ スタッフを追加</button>
      </div>

      {/* メニュー */}
      <div className="card section">
        <h3>🧾 メニュー候補</h3>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>施術記録・予約入力のメニュー欄で候補として出ます。</p>
        <div className="menu-grid">
          {menus.map((s, i) => (
            <div className="row-edit" key={i}>
              <input value={s} onChange={(e) => setMenuAt(i, e.target.value)} placeholder="メニュー名" />
              <button className="btn ghost danger sm" onClick={() => delMenu(i)}>×</button>
            </div>
          ))}
        </div>
        <button className="btn ghost sm" onClick={addMenu}>＋ メニューを追加</button>
      </div>

      {/* ステータス */}
      <div className="card section">
        <h3>🏷 ステータスの種類</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)' }}>表示名・アイコン・色を変えられます。追加もできます（※自動判定は vip/regular/new/followup/dormant の5種を使います）。</p>
        {statusList.map((s, i) => (
          <div className="status-edit" key={i}>
            <span className="badge" style={{ background: s.bg, color: s.color }}><span>{s.icon}</span>{s.label}</span>
            <input className="si-icon" value={s.icon} onChange={(e) => setStatusAt(i, 'icon', e.target.value)} placeholder="🏷" />
            <input className="si-label" value={s.label} onChange={(e) => setStatusAt(i, 'label', e.target.value)} placeholder="表示名" />
            <label className="si-color">文字<input type="color" value={s.color} onChange={(e) => setStatusAt(i, 'color', e.target.value)} /></label>
            <label className="si-color">背景<input type="color" value={s.bg} onChange={(e) => setStatusAt(i, 'bg', e.target.value)} /></label>
            <button className="btn ghost danger sm" onClick={() => delStatus(i)}>削除</button>
          </div>
        ))}
        <button className="btn ghost sm" onClick={addStatus}>＋ ステータスを追加</button>
      </div>

      <div className="form-actions" style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', padding: '12px 0' }}>
        <button className="btn ghost" onClick={save}>保存する</button>
        <button className="btn" onClick={saveAndRecompute}>保存＋全顧客を再判定</button>
      </div>
    </div>
  )
}
