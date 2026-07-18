import { useState, useEffect } from 'react'
import { useStore } from '../store.jsx'
import { useAuth } from '../AuthContext.jsx'
import { DEFAULT_SALON_NAME, DEFAULT_INDUSTRY, DEFAULT_ICON_EMOJI, DEFAULT_ADDRESS, DEFAULT_PHONE, DEFAULT_LINE_TEMPLATES } from '../config/defaults.js'

export default function Settings() {
  const { settings, updateSettings, recomputeAll } = useStore()

  const [salonName, setSalonName] = useState(settings.salonName || DEFAULT_SALON_NAME)
  const [industry, setIndustry] = useState(settings.industry || DEFAULT_INDUSTRY)
  const [iconEmoji, setIconEmoji] = useState(settings.iconEmoji || DEFAULT_ICON_EMOJI)
  const [address, setAddress] = useState(settings.address || DEFAULT_ADDRESS)
  const [phone, setPhone] = useState(settings.phone || DEFAULT_PHONE)
  const [staff, setStaff] = useState(settings.staff)
  const [capacity, setCapacity] = useState(settings.capacity || {})
  const [menus, setMenus] = useState(settings.menus)
  const [menuDurations, setMenuDurations] = useState(settings.menuDurations || {})
  const [menuPrices, setMenuPrices] = useState(settings.menuPrices || {})
  const [designationFees, setDesignationFees] = useState(settings.designationFees || {})
  const [openTime, setOpenTime] = useState(settings.openTime || '10:00')
  const [closeTime, setCloseTime] = useState(settings.closeTime || '19:00')
  const [th, setTh] = useState(settings.thresholds)
  const [closedWeekdays, setClosedWeekdays] = useState(settings.closedWeekdays || [])
  const [closedDates, setClosedDates] = useState(settings.closedDates || [])
  const [staffOff, setStaffOff] = useState(settings.staffOff || {})
  const [newClosed, setNewClosed] = useState('')
  const [newOff, setNewOff] = useState({}) // { staffName: 'yyyy-mm-dd' }
  const [statusList, setStatusList] = useState(
    Object.entries(settings.statuses).map(([key, m]) => ({ key, ...m }))
  )
  const [lineTemplates, setLineTemplates] = useState({ ...DEFAULT_LINE_TEMPLATES, ...(settings.lineTemplates || {}) })
  const [keywordReplies, setKeywordReplies] = useState(settings.keywordReplies || [])
  const [tagList, setTagList] = useState(settings.tags || [])
  const [salesSheetUrl, setSalesSheetUrl] = useState(settings.salesSheetUrl || '')
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
  const setMenuDur = (m, v) => setMenuDurations({ ...menuDurations, [m]: Number(v) || 60 })
  const setMenuPriceAt = (m, v) => setMenuPrices({ ...menuPrices, [m]: v === '' ? undefined : Number(v) || 0 })

  // --- holidays ---
  const WD = ['日', '月', '火', '水', '木', '金', '土']
  const toggleWeekday = (d) => setClosedWeekdays(closedWeekdays.includes(d) ? closedWeekdays.filter((x) => x !== d) : [...closedWeekdays, d].sort())
  const addClosedDate = () => { if (newClosed && !closedDates.includes(newClosed)) { setClosedDates([...closedDates, newClosed].sort()); setNewClosed('') } }
  const delClosedDate = (d) => setClosedDates(closedDates.filter((x) => x !== d))
  const addStaffOff = (s) => {
    const v = newOff[s]
    if (!v) return
    const cur = staffOff[s] || []
    if (!cur.includes(v)) setStaffOff({ ...staffOff, [s]: [...cur, v].sort() })
    setNewOff({ ...newOff, [s]: '' })
  }
  const delStaffOff = (s, d) => setStaffOff({ ...staffOff, [s]: (staffOff[s] || []).filter((x) => x !== d) })
  const fmtMD = (iso) => { const dt = new Date(iso + 'T00:00:00'); return `${dt.getMonth() + 1}/${dt.getDate()}（${WD[dt.getDay()]}）` }

  // --- tags ---
  const setTagAt = (i, v) => setTagList(tagList.map((s, idx) => (idx === i ? v : s)))
  const addTagCandidate = () => setTagList([...tagList, ''])
  const delTagCandidate = (i) => setTagList(tagList.filter((_, idx) => idx !== i))

  // --- keyword replies ---
  const setKeywordReplyAt = (i, k, v) => setKeywordReplies(keywordReplies.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)))
  const addKeywordReply = () => setKeywordReplies([...keywordReplies, { keyword: '', reply: '' }])
  const delKeywordReply = (i) => setKeywordReplies(keywordReplies.filter((_, idx) => idx !== i))

  // --- statuses ---
  const setStatusAt = (i, k, v) => setStatusList(statusList.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)))
  const addStatus = () => setStatusList([...statusList, { key: 'cust' + Date.now().toString().slice(-5), label: '新ステータス', icon: '🏷', color: '#555555', bg: '#eeeeee' }])
  const delStatus = (i) => setStatusList(statusList.filter((_, idx) => idx !== i))

  const persist = () => {
    const statuses = {}
    statusList.forEach((s) => { if (s.key && s.label) statuses[s.key] = { label: s.label, icon: s.icon, color: s.color, bg: s.bg } })
    const cleanStaff = staff.map((s) => s.trim()).filter(Boolean)
    const cap = {}
    cleanStaff.forEach((s) => { cap[s] = Number(capacity[s]) || 1 })
    // 退職等で消えたスタッフの個別休みは捨てる
    const cleanOff = {}
    cleanStaff.forEach((s) => { if (staffOff[s]?.length) cleanOff[s] = staffOff[s] })
    updateSettings({
      salonName,
      industry,
      iconEmoji,
      address,
      phone,
      staff: cleanStaff,
      capacity: cap,
      menus: menus.map((s) => s.trim()).filter(Boolean),
      menuDurations,
      menuPrices,
      designationFees,
      openTime,
      closeTime,
      thresholds: {
        newMaxVisits: Number(th.newMaxVisits), vipVisits: Number(th.vipVisits), vipSpent: Number(th.vipSpent),
        followupDays: Number(th.followupDays), dormantDays: Number(th.dormantDays),
      },
      statuses,
      closedWeekdays,
      closedDates,
      staffOff: cleanOff,
      lineTemplates,
      keywordReplies: keywordReplies
        .map((r) => ({ keyword: (r.keyword || '').trim(), reply: (r.reply || '').trim() }))
        .filter((r) => r.keyword && r.reply),
      tags: [...new Set(tagList.map((t) => t.trim()).filter(Boolean))],
      salesSheetUrl: salesSheetUrl.trim(),
    })
    return statuses
  }

  // 保存のたびに全顧客のステータス・予約パターンも今の設定で判定し直す（既存データは壊さない安全な再計算）
  const save = () => { persist(); recomputeAll(); flash('保存しました ✓') }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>設定</h1>
          <p>お店ごとにスタッフ・メニュー・ステータス・自動判定のルールを調整できます</p>
        </div>
        {saved && <span className="save-flash">{saved}</span>}
      </div>

      {/* 店舗プロフィール */}
      <div className="card section">
        <h3>🏠 店舗プロフィール</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)' }}>顧客向けのWeb予約・マイページ・LINE風プレビューに表示される基本情報です。</p>
        <div className="form-grid">
          <div className="field">
            <label>店名</label>
            <input value={salonName} onChange={(e) => setSalonName(e.target.value)} placeholder={DEFAULT_SALON_NAME} />
          </div>
          <div className="field">
            <label>業種</label>
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder={DEFAULT_INDUSTRY} />
          </div>
          <div className="field">
            <label>アイコン絵文字</label>
            <input value={iconEmoji} onChange={(e) => setIconEmoji(e.target.value)} placeholder={DEFAULT_ICON_EMOJI} />
          </div>
          <div className="field full">
            <label>住所</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={DEFAULT_ADDRESS} />
          </div>
          <div className="field">
            <label>電話番号</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={DEFAULT_PHONE} />
          </div>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)' }}>住所・電話番号は、アクセス画面とプライバシーポリシー（/privacy）にも表示されます。</p>
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
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>「同時対応」は同じ時間に何名まで担当できるか。「指名料」は指名時に加算される金額（0なら無料）。</p>
        {staff.map((s, i) => (
          <div className="row-edit" key={i} style={{ gap: 6 }}>
            <input value={s} onChange={(e) => setStaffAt(i, e.target.value)} placeholder="スタッフ名" style={{ flex: 2 }} />
            <label className="cap-edit">同時
              <select value={capacity[s] || 1} onChange={(e) => setCapacity({ ...capacity, [s]: Number(e.target.value) })}>
                <option value={1}>1名</option><option value={2}>2名</option><option value={3}>3名</option>
              </select>
            </label>
            <label className="cap-edit">指名料
              <input type="number" min="0" step="100" value={designationFees[s] || 0} onChange={(e) => setDesignationFees({ ...designationFees, [s]: Number(e.target.value) })} style={{ width: 72 }} />円
            </label>
            <button className="btn ghost danger sm" onClick={() => delStaff(i)}>削除</button>
          </div>
        ))}
        <button className="btn ghost sm" onClick={addStaff}>＋ スタッフを追加</button>
      </div>

      <StaffAccountsCard />

      {/* 営業時間 */}
      <div className="card section">
        <h3>🕐 営業時間</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)' }}>予約フォームで選択できる時間帯をこの範囲に絞ります。</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            開始
            <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6 }} />
          </label>
          <span style={{ color: 'var(--muted)' }}>〜</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            終了
            <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6 }} />
          </label>
        </div>
      </div>

      {/* 休日 */}
      <div className="card section">
        <h3>🗓 休日の設定</h3>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)' }}>定休日・臨時休業日は予約タイムテーブルとお客様の予約画面に反映され、その日は予約できなくなります。</p>

        <div className="hol-block">
          <label className="hol-label">定休日（毎週）</label>
          <div className="wd-row">
            {WD.map((w, i) => (
              <button key={i} type="button" className={'wd-btn' + (closedWeekdays.includes(i) ? ' on' : '')} onClick={() => toggleWeekday(i)}>{w}</button>
            ))}
          </div>
        </div>

        <div className="hol-block">
          <label className="hol-label">臨時休業日</label>
          <div className="hol-add">
            <input type="date" value={newClosed} onChange={(e) => setNewClosed(e.target.value)} />
            <button className="btn ghost sm" onClick={addClosedDate} disabled={!newClosed}>＋ 追加</button>
          </div>
          <div className="chip-row">
            {closedDates.length === 0 && <span className="chip-empty">登録なし</span>}
            {closedDates.map((d) => (
              <span className="day-chip" key={d}>{fmtMD(d)}<button onClick={() => delClosedDate(d)}>×</button></span>
            ))}
          </div>
        </div>

        <div className="hol-block">
          <label className="hol-label">スタッフ個別の休み</label>
          {staff.filter(Boolean).map((s) => (
            <div className="staff-off" key={s}>
              <div className="staff-off-name">{s}</div>
              <div className="hol-add">
                <input type="date" value={newOff[s] || ''} onChange={(e) => setNewOff({ ...newOff, [s]: e.target.value })} />
                <button className="btn ghost sm" onClick={() => addStaffOff(s)} disabled={!newOff[s]}>＋ 追加</button>
              </div>
              <div className="chip-row">
                {(staffOff[s] || []).length === 0 && <span className="chip-empty">登録なし</span>}
                {(staffOff[s] || []).map((d) => (
                  <span className="day-chip" key={d}>{fmtMD(d)}<button onClick={() => delStaffOff(s, d)}>×</button></span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* メニュー */}
      <div className="card section">
        <h3>🧾 メニュー候補</h3>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>施術記録・予約入力のメニュー欄で候補として出ます。所要時間は予約の空き枠計算に、金額は施術記録でメニューを選んだときの金額欄の自動入力に使います（未入力なら概算のまま・記録時に自由に調整できます）。</p>
        <div className="menu-grid">
          {menus.map((s, i) => (
            <div className="row-edit" key={i} style={{ gap: 6 }}>
              <input value={s} onChange={(e) => setMenuAt(i, e.target.value)} placeholder="メニュー名" style={{ flex: 2 }} />
              <input
                type="number" min="15" max="360" step="15"
                value={menuDurations[s] || 60}
                onChange={(e) => setMenuDur(s, e.target.value)}
                style={{ width: 64, textAlign: 'center' }}
                title="所要時間（分）"
              />
              <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>分</span>
              <input
                type="number" min="0" step="100"
                value={menuPrices[s] ?? ''}
                onChange={(e) => setMenuPriceAt(s, e.target.value)}
                placeholder="金額"
                style={{ width: 84, textAlign: 'center' }}
                title="金額（円・未入力なら概算を使用）"
              />
              <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>円</span>
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

      {/* タグ候補 */}
      <div className="card section">
        <h3>🏷 タグ候補</h3>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>
          ステータス（新規/常連/VIP等）とは別に、顧客に自由に付けられるタグの候補です。
          顧客詳細画面でここから選んで付けられ、顧客一覧・フォロー漏れ画面の絞り込みにも使えます（例：メンズ、ブリーチ毎回、紹介経由）。
        </p>
        {tagList.map((t, i) => (
          <div className="row-edit" key={i} style={{ gap: 6 }}>
            <input value={t} onChange={(e) => setTagAt(i, e.target.value)} placeholder="タグ名" style={{ flex: 1 }} />
            <button className="btn ghost danger sm" onClick={() => delTagCandidate(i)}>×</button>
          </div>
        ))}
        <button className="btn ghost sm" onClick={addTagCandidate}>＋ タグ候補を追加</button>
      </div>

      {/* LINE自動送信の文面 */}
      <div className="card section">
        <h3>💬 LINE自動送信の文面</h3>
        <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--muted)' }}>
          友だち追加のあいさつ・予約確認・前日リマインドの文面を編集できます。空欄にすると既定の文面が使われます。
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--muted)' }}>
          使えるプレースホルダ：
          <code>{'{salonName}'}</code>（店名） <code>{'{customerName}'}</code>（お客様名） <code>{'{date}'}</code>（日付） <code>{'{time}'}</code>（時間） <code>{'{menu}'}</code>（メニュー） <code>{'{staff}'}</code>（担当）
        </p>
        <div className="field">
          <label>友だち追加のあいさつ（使える項目：店名）</label>
          <textarea rows={5} value={lineTemplates.greeting}
            onChange={(e) => setLineTemplates({ ...lineTemplates, greeting: e.target.value })}
            placeholder={DEFAULT_LINE_TEMPLATES.greeting} />
        </div>
        <div className="field">
          <label>予約確認（使える項目：店名・お客様名・日付・時間・メニュー・担当）</label>
          <textarea rows={7} value={lineTemplates.bookingConfirm}
            onChange={(e) => setLineTemplates({ ...lineTemplates, bookingConfirm: e.target.value })}
            placeholder={DEFAULT_LINE_TEMPLATES.bookingConfirm} />
        </div>
        <div className="field">
          <label>前日リマインド（使える項目：店名・お客様名・日付・時間・メニュー・担当）</label>
          <textarea rows={7} value={lineTemplates.reminder}
            onChange={(e) => setLineTemplates({ ...lineTemplates, reminder: e.target.value })}
            placeholder={DEFAULT_LINE_TEMPLATES.reminder} />
        </div>
        <div className="field">
          <label>誕生日のお祝い（使える項目：店名・お客様名／毎日自動判定して送信）</label>
          <textarea rows={5} value={lineTemplates.birthday}
            onChange={(e) => setLineTemplates({ ...lineTemplates, birthday: e.target.value })}
            placeholder={DEFAULT_LINE_TEMPLATES.birthday} />
        </div>
        <div className="field">
          <label>再来店のお声がけ（使える項目：店名・お客様名／フォロー漏れ画面から選んで送信）</label>
          <textarea rows={5} value={lineTemplates.reengage}
            onChange={(e) => setLineTemplates({ ...lineTemplates, reengage: e.target.value })}
            placeholder={DEFAULT_LINE_TEMPLATES.reengage} />
        </div>
        <div className="field">
          <label>来店タイミングのご案内（使える項目：店名・お客様名・メニュー／その方の平均来店周期に合わせて自動送信）</label>
          <textarea rows={5} value={lineTemplates.revisitNudge}
            onChange={(e) => setLineTemplates({ ...lineTemplates, revisitNudge: e.target.value })}
            placeholder={DEFAULT_LINE_TEMPLATES.revisitNudge} />
        </div>
      </div>

      {/* キーワード自動返信 */}
      <div className="card section">
        <h3>🤖 キーワード自動返信</h3>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>
          お客様からのLINEメッセージに指定したキーワードが含まれていたら、自動で即返信します（例：「営業時間」→営業時間の案内、「予約」→予約リンクの案内）。
          上から順にチェックし、最初に一致したキーワードの返信が使われます。
        </p>
        {keywordReplies.map((r, i) => (
          <div className="row-edit" key={i} style={{ gap: 6, alignItems: 'flex-start' }}>
            <input
              value={r.keyword}
              onChange={(e) => setKeywordReplyAt(i, 'keyword', e.target.value)}
              placeholder="キーワード（例：営業時間）"
              style={{ flex: 1 }}
            />
            <textarea
              rows={2}
              value={r.reply}
              onChange={(e) => setKeywordReplyAt(i, 'reply', e.target.value)}
              placeholder="自動返信する文面"
              style={{ flex: 2 }}
            />
            <button className="btn ghost danger sm" onClick={() => delKeywordReply(i)}>削除</button>
          </div>
        ))}
        <button className="btn ghost sm" onClick={addKeywordReply}>＋ キーワードを追加</button>
      </div>

      {/* 売上シート連携 */}
      <div className="card section">
        <h3>📊 売上シート連携（任意）</h3>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>
          施術記録を保存するたびに、指定したGoogleスプレッドシートへ自動で1行追記します。
          未設定でも売上台帳ページはそのまま使えます。設定方法は「オカエル_売上シート連携_設定手順.txt」を参照してください。
        </p>
        <div className="field">
          <label>GAS WebアプリのURL</label>
          <input
            type="text"
            value={salesSheetUrl}
            onChange={(e) => setSalesSheetUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
          />
        </div>
      </div>

      <div className="form-actions" style={{ position: 'sticky', bottom: 0, background: 'var(--bg)', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>保存すると、この内容で全顧客のステータス・予約パターンも自動的に判定し直されます。</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn" onClick={save}>保存する</button>
          {saved && <span className="save-flash">{saved}</span>}
        </div>
      </div>
    </div>
  )
}

// スタッフのログインアカウントを、池本さんに頼まずオーナー自身が作成・削除できるようにする画面。
// 「オーナー」＝全ページ閲覧可、「スタッフ」＝売上・設定を除く画面のみ（App.jsxでルート制限）。
function StaffAccountsCard() {
  const { session } = useAuth()
  const [list, setList] = useState(null) // null = 読込中
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('staff')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const call = async (action, extra = {}) => {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || '通信エラーが発生しました')
    return data
  }

  const load = () => {
    setErr('')
    call('listStaff').then((d) => setList(d.staff || [])).catch((e) => setErr(e.message))
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addAccount = async (e) => {
    e.preventDefault()
    if (!email.trim() || password.length < 6) { setErr('メールアドレスと6文字以上のパスワードを入力してください'); return }
    setBusy(true); setErr('')
    try {
      await call('createStaff', { email: email.trim(), password, role })
      setEmail(''); setPassword(''); setRole('staff')
      load()
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  const removeAccount = async (id) => {
    if (!confirm('このアカウントを削除しますか？ ログインできなくなります。')) return
    setBusy(true); setErr('')
    try { await call('deleteStaff', { id }); load() } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <div className="card section">
      <h3>🔑 スタッフのログインアカウント</h3>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)' }}>
        管理画面へのログインアカウントを、ここから作成・削除できます（これまで池本さんが代行していた作業です）。
        「オーナー」は全ページ、「スタッフ」は売上・設定を除く画面だけ見られます。
      </p>
      {err && <p style={{ color: '#d32f2f', fontSize: 12, marginBottom: 8 }}>{err}</p>}
      {list === null ? (
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>読み込み中…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {list.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>アカウントがありません</div>}
          {list.map((u) => (
            <div className="row-edit" key={u.id} style={{ gap: 6 }}>
              <span style={{ flex: 2, fontSize: 13 }}>{u.email}</span>
              <span className="pill">{u.role === 'owner' ? 'オーナー' : 'スタッフ'}</span>
              <button className="btn ghost danger sm" onClick={() => removeAccount(u.id)} disabled={busy}>削除</button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={addAccount} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" style={{ flex: 2, minWidth: 180 }} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="初期パスワード（6文字以上）" style={{ flex: 1, minWidth: 160 }} />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 110 }}>
          <option value="staff">スタッフ</option>
          <option value="owner">オーナー</option>
        </select>
        <button type="submit" className="btn ghost sm" disabled={busy}>＋ アカウントを追加</button>
      </form>
    </div>
  )
}
