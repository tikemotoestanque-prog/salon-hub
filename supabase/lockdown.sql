-- ============================================================
-- サロピ RLS 施錠（実顧客データ投入前のセキュリティ必須対応）
-- ------------------------------------------------------------
-- これを実行すると、公開済みのanonキーでは顧客データに一切触れなくなる。
-- ・スタッフ（Supabase Authでログイン＝authenticated）：従来どおり全操作可。
-- ・お客様/未ログイン（anon）：customers/reservations/coupon_redemptions/notifications
--   への直接アクセス不可。お客様操作はすべて Vercel API（service_role）経由になる。
-- ・settings だけはPIIなし（サロン名・メニュー・営業時間）なので anon に SELECT のみ許可。
--
-- ⚠️ 実行の前に：先にフロント＆API（/api/portal, /api/book, /api/liff/* 等）を
--    本番デプロイし、お客様画面がAPI経由で動くことを確認してから実行すること。
--    （API化前に施錠するとお客様画面が一時的に動かなくなる）
--
-- 実行方法：Supabase → SQL Editor → New query にこの内容を貼り付けて Run。
-- ============================================================

-- 1) 対象テーブルの既存ポリシーをすべて削除（demo_all_* など名前不問でクリア）
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('customers', 'reservations', 'settings', 'notifications', 'coupon_redemptions')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2) RLSを確実に有効化
alter table public.customers          enable row level security;
alter table public.reservations       enable row level security;
alter table public.settings           enable row level security;
alter table public.notifications      enable row level security;
alter table public.coupon_redemptions enable row level security;

-- 3) スタッフ（authenticated）のみ全操作可
create policy staff_all on public.customers          for all to authenticated using (true) with check (true);
create policy staff_all on public.reservations       for all to authenticated using (true) with check (true);
create policy staff_all on public.notifications      for all to authenticated using (true) with check (true);
create policy staff_all on public.coupon_redemptions for all to authenticated using (true) with check (true);

-- 4) settings：anonはSELECTのみ（公開情報）／authenticatedは全操作
create policy public_read on public.settings for select to anon using (true);
create policy staff_all   on public.settings for all to authenticated using (true) with check (true);

-- ※ service_role キー（Vercel APIが使用）はRLSをbypassするので、施錠後もお客様APIは全操作可能。

-- ============================================================
-- 動作確認（anonキーで叩いて 0件 or 401 になればOK）：
--   curl 'https://<ref>.supabase.co/rest/v1/customers?select=*' \
--        -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--   → []（空配列）が返れば施錠成功。
-- ============================================================

-- ============================================================
-- 【ロールバック】問題が出たら以下で一時的に全許可に戻せる（デモ状態へ）：
--   do $$ declare r record; begin
--     for r in select policyname, tablename from pg_policies
--       where schemaname='public' and tablename in
--       ('customers','reservations','settings','notifications','coupon_redemptions')
--     loop execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename); end loop;
--   end $$;
--   create policy demo_all on public.customers          for all using (true) with check (true);
--   create policy demo_all on public.reservations       for all using (true) with check (true);
--   create policy demo_all on public.settings           for all using (true) with check (true);
--   create policy demo_all on public.notifications      for all using (true) with check (true);
--   create policy demo_all on public.coupon_redemptions for all using (true) with check (true);
-- ============================================================
