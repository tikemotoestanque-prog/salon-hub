-- クーポン使用済み管理テーブル
-- お客様画面・スタッフ画面どちらの「使用済み」操作もここに集約し、全端末で共有する。
-- Supabase ダッシュボード → SQL Editor → New query に貼り付けて Run。

create table if not exists public.coupon_redemptions (
  id          bigint generated always as identity primary key,
  customer_id text        not null,
  coupon_tag  text        not null,            -- 例: cycle_1, cycle_2, 誕生月
  used_at     timestamptz not null default now(),
  used_by     text,                            -- 'customer' またはスタッフ名
  unique (customer_id, coupon_tag)             -- 1顧客×1クーポンは1回まで（二重利用防止）
);

alter table public.coupon_redemptions enable row level security;

-- デモ用：全許可ポリシー
-- ⚠️ 実顧客データを扱う前に、他テーブル同様スタッフ認証（Supabase Auth）＋RLSで制限すること。
create policy demo_all_select on public.coupon_redemptions for select using (true);
create policy demo_all_insert on public.coupon_redemptions for insert with check (true);
create policy demo_all_update on public.coupon_redemptions for update using (true) with check (true);
create policy demo_all_delete on public.coupon_redemptions for delete using (true);
