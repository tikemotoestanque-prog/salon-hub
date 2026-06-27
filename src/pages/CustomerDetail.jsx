import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { StatusBadge, SourceBadge } from '../components/Badges.jsx'
import { G_REVIEW_META } from '../data/sampleData.js'
import { initials, daysSince, yen, gReview, TODAY_ISO, stampStatus } from '../utils.js'

const STEP_CLASS = { '配信済': 's-done', '予約': 's-sched', '未配信': 's-none', '未対応': 's-todo', '未送信': 's-none' }

export default function CustomerDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { customers, updateCustomer, couponRedemptions, redeemCoupon, unredeemCoupon } = useStore()
  const c = customers.find((x) => x.id === id)

  if (!c) {
    return (
      <div className="empty">
        顧客が見つかりません。<br />
        <Link className="back-link" to="/customers">← 顧客一覧へ戻る</Link>
      </div>
    )
  }

  const d = daysSince(c.lastVisit)
  const last10 = c.history.slice(0, 10)

  // スタンプ・マイルストーン状況（使用済みはSupabase=storeが真実・全端末共有）
  const usedKeys = couponRedemptions.filter((r) => r.customerId === c.id).map((r) => r.tag)
  const stamp = stampStatus(c, usedKeys)
  const availableCoupons = stamp.earned.filter((e) => !e.used)

  const gStatus = gReview(c.integrations?.google)
  const gMeta = G_REVIEW_META[gStatus]
  const setG = (status) => updateCustomer(c.id, { integrations: { ...c.integrations, google: status, googleDate: TODAY_ISO } })

  const [lineIdInput, setLineIdInput] = useState('')
  const [lineIdEditing, setLineIdEditing] = useState(false)
  const currentLineId = c.integrations?.lineUserId || ''
  const saveLineId = () => {
    const val = lineIdInput.trim()
    if (!val) return
    updateCustomer(c.id, { integrations: { ...c.integrations, lineUserId: val } })
    setLineIdEditing(false)
    setLineIdInput('')
  }

  return (
    <div>
      <Link className="back-link" to="/customers">← 顧客一覧へ戻る</Link>

      <div className="detail-head">
        <div className="avatar">{initials(c.name)}</div>
        <div style={{ flex: 1 }}>
          <h1>{c.name} <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>{c.kana}</span></h1>
          <div className="meta" style={{ marginTop: 6 }}>
            <StatusBadge status={c.status} />
            <SourceBadge source={c.source} />
            <span className="pill">担当: {c.assignedStaff || '未定'}</span>
            <span className="pill">来店 {c.visitCount} 回</span>
            <span className="pill">{yen(c.totalSpent)}</span>
            {d != null && <span className="pill">前回 {d} 日前</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn ghost" onClick={() => nav('/m/' + c.id)}>📱 お客さん画面</button>
          <button className="btn ghost" onClick={() => nav('/customer/' + c.id + '/edit')}>✏️ 編集</button>
          <button className="btn" onClick={() => nav('/record/' + c.id)}>＋ 施術記録</button>
        </div>
      </div>

      <div className="detail-grid">
        {/* LEFT */}
        <div>
          <div className="card section">
            <h3>👤 基本情報</h3>
            <dl className="kv">
              <dt>性別</dt><dd>{c.gender}</dd>
              <dt>生年月日</dt><dd>{c.birthday}</dd>
              <dt>電話</dt><dd>{c.phone}</dd>
              <dt>メール</dt><dd>{c.email}</dd>
              <dt>予約パターン</dt><dd>{c.reservationPattern}</dd>
            </dl>
          </div>

          <div className="card section">
            <h3>💇 髪質・頭皮</h3>
            <dl className="kv">
              <dt>髪質</dt><dd>{c.hair?.type || '-'}</dd>
              <dt>状態</dt><dd>{c.hair?.condition || '-'}</dd>
              <dt>頭皮</dt><dd>{c.hair?.scalp || '-'}</dd>
              <dt>メモ</dt><dd>{c.hair?.notes || '-'}</dd>
            </dl>
          </div>

          <div className="card section">
            <h3>⚠️ アレルギー</h3>
            {c.allergies && c.allergies.length ? (
              <div className="pill-row">
                {c.allergies.map((a, i) => <span key={i} className="pill warn">{a}</span>)}
              </div>
            ) : <div style={{ color: 'var(--muted)', fontSize: 13 }}>申告なし</div>}
          </div>

          <div className="card section">
            <h3>📋 対応履歴（直近{last10.length}回）</h3>
            <div className="timeline">
              {last10.map((h, i) => (
                <div className="tl-item" key={i}>
                  <div className="tl-date"><b>{h.date}</b>{h.staff}</div>
                  <div className="tl-body">
                    <div className="menu">{h.menu}</div>
                    {h.note && <div className="note">{h.note}</div>}
                    {h.photos?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {h.photos.map((p, pi) => (
                          <a key={pi} href={p.url} target="_blank" rel="noopener noreferrer">
                            <img src={p.url} alt={p.tag} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} title={p.tag === 'before' ? '施術前' : '施術後'} />
                          </a>
                        ))}
                      </div>
                    )}
                    {h.recipe && (
                      <div className="recipe">
                        <div className="rtitle">🧪 薬剤レシピ</div>
                        {h.recipe.note ? (
                          <div>{h.recipe.note}</div>
                        ) : (
                          <div>
                            {h.recipe.color && <div>カラー: <code>{h.recipe.color}</code></div>}
                            {h.recipe.bleach && <div>ブリーチ: <code>{h.recipe.bleach}</code></div>}
                            {h.recipe.perm && <div>パーマ: <code>{h.recipe.perm}</code></div>}
                            {h.recipe.agent && <div>薬剤: <code>{h.recipe.agent}</code></div>}
                            {h.recipe.oxy && <div>オキシ: <code>{h.recipe.oxy}</code></div>}
                            {h.recipe.time && <div>放置: <code>{h.recipe.time}</code></div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {last10.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>履歴がありません。</div>}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          <div className="card section">
            <h3>⭐ スタンプ＆特典</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>累計 <b style={{ color: 'var(--text, #333)', fontSize: 15 }}>{stamp.visitCount}</b> 回来店</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>あと {stamp.nextMilestone - stamp.visitCount} 回で次の特典</span>
            </div>
            <div className="cp-stamps">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={'cp-stamp' + (i < stamp.currentStamps ? ' on' : '')}>{i < stamp.currentStamps ? '★' : i + 1}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
              次の特典（{stamp.nextMilestone}回）→「{stamp.nextCoupon.t}」
            </div>

            <div style={{ borderTop: '1px solid #eee', marginTop: 12, paddingTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                解放済みクーポン
                <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6 }}>利用可 {availableCoupons.length} / 全 {stamp.earned.length} 枚</span>
              </div>
              {stamp.earned.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>まだ特典はありません（10回来店で解放）</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {stamp.earned.map((e) => (
                    <div key={e.tag} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, opacity: e.used ? 0.55 : 1 }}>
                      <span className="pill">{e.cycleNum * 10}回</span>
                      <span style={{ flex: 1, textDecoration: e.used ? 'line-through' : 'none' }}>{e.emoji} {e.t}</span>
                      {e.used ? (
                        <>
                          <span className="step-status s-done">使用済み</span>
                          <button className="btn ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => unredeemCoupon(c.id, e.tag)}>取消</button>
                        </>
                      ) : (
                        <button className="btn" style={{ padding: '2px 10px', fontSize: 11 }} onClick={() => redeemCoupon(c.id, e.tag, c.assignedStaff || 'スタッフ')}>使用済みにする</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>※ お客様画面・スタッフ画面どちらの操作も全端末に即共有されます</div>
            </div>
          </div>

          <div className="card section">
            <h3>🔗 外部連携</h3>
            <dl className="kv">
              <dt>LINE ID</dt>
              <dd>
                {currentLineId ? (
                  <span style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--muted)' }}>
                    {currentLineId}
                    <button className="btn ghost" style={{ marginLeft: 8, padding: '2px 8px', fontSize: 11 }} onClick={() => { setLineIdInput(currentLineId); setLineIdEditing(true) }}>変更</button>
                  </span>
                ) : (
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>未登録</span>
                )}
              </dd>
              <dt>公式LINE</dt><dd>{c.integrations?.line}</dd>
              <dt>Instagram</dt><dd>{c.integrations?.instagram}</dd>
              <dt>Googleクチコミ</dt>
              <dd>
                <span className={'step-status ' + gMeta.cls}>{gMeta.label}</span>
                {c.integrations?.googleDate && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--muted)' }}>{c.integrations.googleDate}</span>
                )}
              </dd>
            </dl>
            {/* LINE ID 登録UI */}
            {(lineIdEditing || !currentLineId) && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
                  お客様がLIFFを開いた時に表示されるLINE IDを貼り付けてください
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={lineIdInput}
                    onChange={(e) => setLineIdInput(e.target.value)}
                    placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    style={{ flex: 1, padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }}
                  />
                  <button className="btn" style={{ whiteSpace: 'nowrap' }} onClick={saveLineId}>登録</button>
                  {lineIdEditing && <button className="btn ghost" onClick={() => setLineIdEditing(false)}>キャンセル</button>}
                </div>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              {gStatus === '未送信' && (
                <button className="btn ghost" style={{ width: '100%' }} onClick={() => setG('依頼送信済')}>
                  📨 クチコミ依頼を送信
                </button>
              )}
              {gStatus === '依頼送信済' && (
                <button className="btn ghost" style={{ width: '100%' }} onClick={() => setG('投稿済')}>
                  ✓ 投稿を確認できた
                </button>
              )}
              {gStatus === '投稿済' && (
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>🎉 クチコミ投稿済み。お礼メッセージも自動で送れます。</div>
              )}
            </div>
          </div>

          <div className="card section">
            <h3>📨 ステップ配信</h3>
            {c.stepDelivery.map((s) => (
              <div className="step-row" key={s.step}>
                <span className="step-no">{s.step}</span>
                <div>
                  <div>{s.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.date}</div>
                </div>
                <span className={'step-status ' + (STEP_CLASS[s.status] || 's-none')}>{s.status}</span>
              </div>
            ))}
          </div>

          <div className="card section">
            <h3>🧪 最新の薬剤レシピ</h3>
            {(() => {
              const r = c.history.find((h) => h.recipe)
              if (!r) return <div style={{ color: 'var(--muted)', fontSize: 13 }}>記録なし</div>
              return (
                <div className="recipe" style={{ marginTop: 0 }}>
                  <div className="rtitle">{r.date} / {r.menu}</div>
                  {r.recipe.note ? <div>{r.recipe.note}</div> : (
                    <div>
                      {r.recipe.color && <div>カラー: <code>{r.recipe.color}</code></div>}
                      {r.recipe.bleach && <div>ブリーチ: <code>{r.recipe.bleach}</code></div>}
                      {r.recipe.perm && <div>パーマ: <code>{r.recipe.perm}</code></div>}
                      {r.recipe.agent && <div>薬剤: <code>{r.recipe.agent}</code></div>}
                      {r.recipe.oxy && <div>オキシ: <code>{r.recipe.oxy}</code></div>}
                      {r.recipe.time && <div>放置: <code>{r.recipe.time}</code></div>}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
