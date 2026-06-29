// service_role キーで作る Supabase クライアント（RLSをbypassする）。
// お客様向けAPIはこのクライアント経由でのみDBに触れる。
// ⚠️ service_role キーは絶対にフロント(VITE_)へ出さない。サーバー関数内だけで使う。
import { createClient } from '@supabase/supabase-js'

export const admin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)
