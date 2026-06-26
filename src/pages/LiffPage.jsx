import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, hasSupabase } from '../supabaseClient.js'

const LIFF_ID = import.meta.env.VITE_LIFF_ID

export default function LiffPage() {
  const navigate = useNavigate()
  const [msg, setMsg] = useState('LINE 認証中…')

  useEffect(() => {
    if (!LIFF_ID) {
      setMsg('LIFF ID が設定されていません（開発中）')
      return
    }

    import('@line/liff').then(({ default: liff }) => {
      liff.init({ liffId: LIFF_ID })
        .then(async () => {
          if (!liff.isLoggedIn()) {
            liff.login()
            return
          }

          const profile = await liff.getProfile()
          const lineUserId = profile.userId

          if (!hasSupabase) {
            setMsg('Supabase 未設定（デモモード）')
            return
          }

          // integrations.lineUserId で顧客を検索
          const { data, error } = await supabase
            .from('customers')
            .select('id')
            .eq('integrations->>lineUserId', lineUserId)
            .maybeSingle()

          if (error) {
            setMsg('エラーが発生しました')
            return
          }

          if (data) {
            navigate(`/u/${data.id}`, { replace: true })
          } else {
            // 未紐付けの場合は友だち登録案内
            setMsg(`LINE アカウントと顧客情報が紐付いていません。\nスタッフにお声がけください。\n(LINE ID: ${lineUserId})`)
          }
        })
        .catch(() => setMsg('LINE 認証に失敗しました'))
    })
  }, [navigate])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✂️</div>
        <p style={{ color: '#555', whiteSpace: 'pre-line', lineHeight: 1.8 }}>{msg}</p>
      </div>
    </div>
  )
}
