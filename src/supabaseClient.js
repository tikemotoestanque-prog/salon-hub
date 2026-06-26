import { createClient } from '@supabase/supabase-js'

// Supabase（クラウドのデータベース）への接続。
// 接続情報は .env.local（ローカル）と Vercel の環境変数から読み込む。
// VITE_ プレフィックスの値はビルド時にフロントに埋め込まれる（Publishable keyは公開前提なのでOK）。
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 接続情報が無い環境（未設定）でもアプリが落ちないようにフラグで判定できるように
export const hasSupabase = Boolean(url && anonKey)

export const supabase = hasSupabase ? createClient(url, anonKey) : null
