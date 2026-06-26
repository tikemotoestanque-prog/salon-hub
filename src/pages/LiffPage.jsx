import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, hasSupabase } from '../supabaseClient.js'

const LIFF_ID = import.meta.env.VITE_LIFF_ID

export default function LiffPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('loading') // loading | verify | error | done
  const [lineUserId, setLineUserId] = useState('')
  const [name, setName] = useState('')
  const [phone4, setPhone4] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!LIFF_ID) { setPhase('error'); setErrMsg('LIFF ID が設定されていません（開発中）'); return }

    import('@line/liff').then(({ default: liff }) => {
      liff.init({ liffId: LIFF_ID })
        .then(async () => {
          if (!liff.isLoggedIn()) { liff.login(); return }

          const profile = await liff.getProfile()
          const uid = profile.userId
          setLineUserId(uid)

          if (!hasSupabase) { setPhase('error'); setErrMsg('Supabase 未設定（デモモード）'); return }

          // 既に紐付き済みか確認
          const { data } = await supabase
            .from('customers')
            .select('id')
            .eq('integrations->>lineUserId', uid)
            .maybeSingle()

          if (data) {
            navigate(`/u/${data.id}`, { replace: true })
          } else {
            setPhase('verify')
          }
        })
        .catch(() => { setPhase('error'); setErrMsg('LINE 認証に失敗しました') })
    })
  }, [navigate])

  const handleVerify = async (e) => {
    e.preventDefault()
    setErrMsg('')
    setSubmitting(true)

    const nameTrim = name.trim()
    const phoneTrim = phone4.trim()

    if (phoneTrim.length !== 4 || !/^\d{4}$/.test(phoneTrim)) {
      setErrMsg('電話番号の下4桁を数字で入力してください')
      setSubmitting(false)
      return
    }

    // 名前で顧客を検索（部分一致）
    const { data: candidates } = await supabase
      .from('customers')
      .select('id, name, phone')
      .ilike('name', `%${nameTrim}%`)

    const matched = (candidates || []).find((c) => (c.phone || '').replace(/[-\s]/g, '').endsWith(phoneTrim))

    if (!matched) {
      setErrMsg('お名前または電話番号が一致しませんでした。\nご確認の上、もう一度お試しください。')
      setSubmitting(false)
      return
    }

    // LINE IDを紐付け保存
    const { data: current } = await supabase.from('customers').select('integrations').eq('id', matched.id).single()
    await supabase.from('customers').update({
      integrations: { ...(current?.integrations || {}), lineUserId }
    }).eq('id', matched.id)

    navigate(`/u/${matched.id}`, { replace: true })
  }

  if (phase === 'loading') {
    return <Wrap><p style={{ color: '#888' }}>読み込み中…</p></Wrap>
  }

  if (phase === 'error') {
    return <Wrap><p style={{ color: '#d32f2f', whiteSpace: 'pre-line', textAlign: 'center' }}>{errMsg}</p></Wrap>
  }

  return (
    <Wrap>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>はじめまして！</h2>
      <p style={{ fontSize: '0.875rem', color: '#666', textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.7 }}>
        お名前と電話番号の下4桁を入力すると、<br />マイページが表示されます。
      </p>
      <form onSubmit={handleVerify}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>お名前</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="山田 花子"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>電話番号の下4桁</label>
          <input
            value={phone4}
            onChange={(e) => setPhone4(e.target.value)}
            required
            placeholder="1234"
            maxLength={4}
            inputMode="numeric"
            style={inputStyle}
          />
        </div>
        {errMsg && <p style={{ color: '#d32f2f', fontSize: '0.875rem', whiteSpace: 'pre-line', marginBottom: '1rem', textAlign: 'center' }}>{errMsg}</p>}
        <button type="submit" disabled={submitting} style={btnStyle}>
          {submitting ? '確認中…' : 'マイページを開く'}
        </button>
      </form>
    </Wrap>
  )
}

function Wrap({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '1.5rem' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 360, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '1rem' }}>✂️</div>
        {children}
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '0.4rem' }
const inputStyle = { width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '1rem', boxSizing: 'border-box' }
const btnStyle = { width: '100%', padding: '0.75rem', background: '#06C755', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }
