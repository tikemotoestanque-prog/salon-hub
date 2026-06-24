import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { StatusBadge, SourceBadge } from '../components/Badges.jsx'
import { G_REVIEW_META } from '../data/sampleData.js'
import { initials, daysSince, yen, gReview, TODAY_ISO } from '../utils.js'

const STEP_CLASS = { '配信済': 's-done', '予約': 's-sched', '未配信': 's-none', '未対応': 's-todo', '未送信': 's-none' }

export default function CustomerDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { customers, updateCustomer } = useStore()
  const c = customers.find((x) => x.id === id)

  if (!c) {
    return (
      <div className="empty">
        顧客が見つかりません。<br />
        <Link className="back-link" to="/">← 顧客一覧へ戻る</Link>
      </div>
    )
  }

  const d = daysSince(c.lastVisit)
  const last10 = c.history.slice(0, 10)

  const gStatus = gReview(c.integrations?.google)
  const gMeta = G_REVIEW_META[gStatus]
  const setG = (status) => updateCustomer(c.id, { integrations: { ...c.integrations, google: status, googleDate: TODAY_ISO } })

  return (
    <div>
      <Link className="back-link" to="/">← 顧客一覧へ戻る</Link>

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
            <h3>🔗 外部連携</h3>
            <dl className="kv">
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
