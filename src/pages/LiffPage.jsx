import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, hasSupabase } from '../supabaseClient.js'
import { useStore } from '../store.jsx'

const LIFF_ID = import.meta.env.VITE_LIFF_ID

export default function LiffPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { updateCustomer, addCustomer } = useStore()
  const tabParam = searchParams.get('tab') // book / card / karte
  const [phase, setPhase] = useState('loading') // loading | verify | notfound | register | error | done
  const [lineUserId, setLineUserId] = useState('')
  const [name, setName] = useState('')
  const [phone4, setPhone4] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // 新規自己登録フォーム
  const [reg, setReg] = useState({ name: '', kana: '', phone: '', birthday: '', gender: '' })
  const setRegField = (k) => (e) => setReg((r) => ({ ...r, [k]: e.target.value }))

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
            const dest = `/u/${data.id}${tabParam ? `?tab=${tabParam}` : ''}`
            navigate(dest, { replace: true })
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
      setPhase('notfound')
      setSubmitting(false)
      return
    }

    // LINE IDを紐付け保存
    const { data: current } = await supabase.from('customers').select('integrations').eq('id', matched.id).single()
    const newIntegrations = { ...(current?.integrations || {}), lineUserId }
    await supabase.from('customers').update({ integrations: newIntegrations }).eq('id', matched.id)

    // storeも即時反映（予約画面でlineUserIdが使えるように）
    updateCustomer(matched.id, { integrations: newIntegrations })

    const dest = `/u/${matched.id}${tabParam ? `?tab=${tabParam}` : ''}`
    navigate(dest, { replace: true })
  }

  // 新規のお客様が自分で顧客登録する
  const handleRegister = async (e) => {
    e.preventDefault()
    setErrMsg('')
    const nm = reg.name.trim()
    const phoneDigits = reg.phone.replace(/[-\s]/g, '')
    if (!nm) { setErrMsg('お名前を入力してください'); return }
    if (!/^\d{10,11}$/.test(phoneDigits)) { setErrMsg('電話番号を正しく入力してください（ハイフンなし10〜11桁）'); return }
    setSubmitting(true)

    // 顧客レコードを作成（LINE経由＝source: line・LINE連携済）
    const newId = addCustomer({
      name: nm, kana: reg.kana.trim(), phone: reg.phone.trim(),
      birthday: reg.birthday, gender: reg.gender, line: true, source: 'line',
    })
    // LINE userId を紐付け
    const integrations = { line: '連携済', instagram: '未連携', google: '未送信', lineUserId }
    updateCustomer(newId, { integrations })

    // スタッフのダッシュボードに新規登録を通知
    if (hasSupabase) {
      await supabase.from('notifications').insert({
        type: 'new_customer', customer_id: newId, customer_name: nm,
        message: `${nm}様がLINEから新規登録しました`,
        read: false, created_at: new Date().toISOString(),
      })
    }

    const dest = `/u/${newId}${tabParam ? `?tab=${tabParam}` : ''}`
    navigate(dest, { replace: true })
  }

  if (phase === 'loading') {
    return <Wrap><p style={{ color: '#888' }}>読み込み中…</p></Wrap>
  }

  if (phase === 'error') {
    return <Wrap><p style={{ color: '#d32f2f', whiteSpace: 'pre-line', textAlign: 'center' }}>{errMsg}</p></Wrap>
  }

  if (phase === 'notfound') {
    return (
      <Wrap>
        <p style={{ textAlign: 'center', fontWeight: 700, marginBottom: '0.75rem' }}>お客様情報が見つかりませんでした</p>
        <p style={{ fontSize: '0.875rem', color: '#666', textAlign: 'center', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          お名前・電話番号をご確認いただくか、<br />初めての方は新規登録へお進みください。
        </p>
        <button onClick={() => setPhase('register')} style={{ ...btnStyle, marginBottom: '0.75rem' }}>
          ＋ 新規登録する
        </button>
        <button onClick={() => setPhase('verify')} style={{ ...btnStyle, background: '#888' }}>
          もう一度入力する
        </button>
      </Wrap>
    )
  }

  if (phase === 'register') {
    return (
      <Wrap>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', textAlign: 'center' }}>新規のお客様登録</h2>
        <p style={{ fontSize: '0.85rem', color: '#666', textAlign: 'center', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          ご登録後、すぐにマイページ・ご予約がご利用いただけます。
        </p>
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={labelStyle}>お名前 <span style={{ color: '#d32f2f' }}>*</span></label>
            <input value={reg.name} onChange={setRegField('name')} required placeholder="山田 花子" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={labelStyle}>フリガナ</label>
            <input value={reg.kana} onChange={setRegField('kana')} placeholder="ヤマダ ハナコ" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={labelStyle}>電話番号 <span style={{ color: '#d32f2f' }}>*</span></label>
            <input value={reg.phone} onChange={setRegField('phone')} required placeholder="09012345678" inputMode="tel" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>生年月日</label>
              <input type="date" value={reg.birthday} onChange={setRegField('birthday')} style={inputStyle} />
            </div>
            <div style={{ width: 110 }}>
              <label style={labelStyle}>性別</label>
              <select value={reg.gender} onChange={setRegField('gender')} style={inputStyle}>
                <option value="">未選択</option>
                <option value="女性">女性</option>
                <option value="男性">男性</option>
                <option value="その他">その他</option>
              </select>
            </div>
          </div>
          {errMsg && <p style={{ color: '#d32f2f', fontSize: '0.875rem', whiteSpace: 'pre-line', marginBottom: '1rem', textAlign: 'center' }}>{errMsg}</p>}
          <button type="submit" disabled={submitting} style={btnStyle}>
            {submitting ? '登録中…' : '登録してマイページへ'}
          </button>
          <button type="button" onClick={() => setPhase('verify')} style={{ ...btnStyle, background: 'transparent', color: '#888', border: '1px solid #ddd', marginTop: '0.75rem' }}>
            戻る
          </button>
        </form>
      </Wrap>
    )
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
      <button type="button" onClick={() => setPhase('register')} style={{ ...btnStyle, background: 'transparent', color: '#06C755', border: '1px solid #06C755', marginTop: '0.75rem' }}>
        初めての方はこちら（新規登録）
      </button>
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
