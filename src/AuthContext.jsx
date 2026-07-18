import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasSupabase } from './supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined=初期化中, null=未ログイン, object=ログイン済

  useEffect(() => {
    if (!hasSupabase) {
      setSession(null) // Supabase未設定時はログイン不要モード
      return
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null))
    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  // アカウントの権限（user_metadata.role）。未設定の場合は従来通り「オーナー」扱い
  // （既にSupabase管理画面で作成済みのアカウントを締め出さないための後方互換）。
  const role = session?.user?.user_metadata?.role === 'staff' ? 'staff' : 'owner'

  return (
    <AuthContext.Provider value={{ session, role, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
