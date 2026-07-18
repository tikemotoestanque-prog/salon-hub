import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store.jsx'
import { hasSupabase } from '../supabaseClient.js'

const fmtTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const hm = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`
}

export default function Talk() {
  const { customers, messages, sendMessage, markMessagesRead } = useStore()
  const { id } = useParams()
  const nav = useNavigate()
  const [selected, setSelected] = useState(id || null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const bottomRef = useRef(null)

  // 顧客ごとにスレッドをまとめる（メッセージが1件以上ある顧客のみ一覧に出す）
  const threads = useMemo(() => {
    const byCustomer = new Map()
    for (const m of messages) {
      const key = m.customerId || m.lineUserId || 'unknown'
      if (!byCustomer.has(key)) byCustomer.set(key, [])
      byCustomer.get(key).push(m)
    }
    const list = [...byCustomer.entries()].map(([key, list]) => {
      const sorted = [...list].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      const last = sorted[sorted.length - 1]
      const customer = customers.find((c) => c.id === key)
      const unread = sorted.filter((m) => m.direction === 'in' && !m.read).length
      return {
        key,
        customerId: customer ? customer.id : null,
        name: customer ? customer.name : '未登録のお客様',
        hasLine: !!customer?.integrations?.lineUserId,
        last,
        unread,
        list: sorted,
      }
    })
    list.sort((a, b) => (a.last.createdAt < b.last.createdAt ? 1 : -1))
    return list
  }, [messages, customers])

  useEffect(() => {
    if (id) { setSelected(id); return }
    if (!selected && threads.length > 0) setSelected(threads[0].key)
  }, [id, threads, selected])

  const active = threads.find((t) => t.key === selected) || null

  useEffect(() => {
    if (active && active.customerId) markMessagesRead(active.customerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.key])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [active?.list?.length])

  const handleSelect = (t) => {
    setSelected(t.key)
    setErrorMsg('')
    if (t.customerId) nav('/talk/' + t.customerId, { replace: true })
  }

  // デモ（Supabase未設定）ではLINE未連携でも触れる体験にする。本番は実際の連携有無で制御。
  const canReply = active ? (!hasSupabase || active.hasLine) : false

  const handleSend = async () => {
    if (!draft.trim() || !active?.customerId || !canReply || sending) return
    setSending(true)
    setErrorMsg('')
    const text = draft.trim()
    setDraft('')
    const result = await sendMessage(active.customerId, text)
    if (!result.ok) setErrorMsg(result.error ? String(result.error) : '送信に失敗しました')
    setSending(false)
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>トーク</h1>
          <p>LINE公式アカウントに届いたメッセージの確認・返信を、オカエルの中だけで完結できます。</p>
        </div>
      </div>

      <div className="talk-cols">
        <div className="talk-list card">
          {threads.length === 0 ? (
            <div className="talk-empty">まだメッセージはありません</div>
          ) : threads.map((t) => (
            <div
              key={t.key}
              className={'talk-list-item' + (t.key === selected ? ' active' : '')}
              onClick={() => handleSelect(t)}
            >
              <div className="talk-avatar">{t.name.charAt(0)}</div>
              <div className="talk-list-body">
                <div className="talk-list-top">
                  <span className="talk-name">{t.name}</span>
                  <span className="talk-time">{fmtTime(t.last.createdAt)}</span>
                </div>
                <div className="talk-preview">
                  {t.last.direction === 'out' && <span className="talk-preview-you">あなた: </span>}
                  {t.last.text}
                </div>
              </div>
              {t.unread > 0 && <span className="talk-unread-dot">{t.unread}</span>}
            </div>
          ))}
        </div>

        <div className="talk-thread card">
          {!active ? (
            <div className="talk-empty">左の一覧から会話を選んでください</div>
          ) : (
            <>
              <div className="talk-thread-head">
                <span className="talk-name">{active.name}</span>
                {active.customerId && (
                  <a className="link-btn" href={'/customer/' + active.customerId}>カルテを見る →</a>
                )}
              </div>
              <div className="talk-messages">
                {active.list.map((m) => (
                  <div key={m.id} className={'talk-bubble-row ' + m.direction}>
                    {m.direction === 'out' && m.sender === '自動返信' && (
                      <div className="talk-bubble-sender">🤖 自動返信</div>
                    )}
                    <div className={'talk-bubble ' + m.direction}>{m.text}</div>
                    <div className="talk-bubble-time">{fmtTime(m.createdAt)}</div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="talk-compose">
                {!canReply && (
                  <div className="talk-warn">この顧客はLINE未連携のため送信できません（顧客詳細でLINE IDを連携してください）</div>
                )}
                {errorMsg && <div className="talk-warn">{errorMsg}</div>}
                <div className="talk-compose-row">
                  <textarea
                    placeholder="メッセージを入力…"
                    value={draft}
                    disabled={!active.customerId || !canReply || sending}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  />
                  <button
                    className="btn"
                    disabled={!draft.trim() || !active.customerId || !canReply || sending}
                    onClick={handleSend}
                  >
                    {sending ? '送信中…' : '送信'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
