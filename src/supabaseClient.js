import { createClient } from '@supabase/supabase-js'

// Supabase（クラウドのデータベース）への接続。
// 接続情報は .env.local（ローカル）と Vercel の環境変数から読み込む。
// VITE_ プレフィックスの値はビルド時にフロントに埋め込まれる（Publishable keyは公開前提なのでOK）。
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 接続情報が無い環境（未設定）でもアプリが落ちないようにフラグで判定できるように
export const hasSupabase = Boolean(url && anonKey)

export const supabase = hasSupabase ? createClient(url, anonKey) : null

// 施術写真をSupabase Storageにアップロードして公開URLを返す
export async function uploadPhoto(file, customerId) {
  if (!supabase) return null
  const ext = file.name.split('.').pop()
  const path = `${customerId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('treatment-photos').upload(path, file, { upsert: false })
  if (error) { console.error('photo upload error', error); return null }
  const { data } = supabase.storage.from('treatment-photos').getPublicUrl(path)
  return data.publicUrl
}
