-- LINEトーク画面用：お客様とのメッセージ履歴（双方向）
-- Supabase → SQL Editor → New query に貼り付けて Run。
-- 既存の notifications テーブル（アラート用）とは別に、会話そのものを時系列で持つ。

create table if not exists public.messages (
  id           bigint generated always as identity primary key,
  customer_id  text,
  line_user_id text,
  direction    text not null check (direction in ('in', 'out')), -- in=お客様→店舗 / out=店舗→お客様
  text         text not null,
  sender       text,                          -- direction='out'の場合の送信者名（スタッフ名など）
  read         boolean not null default false, -- direction='in'の未読管理
  created_at   timestamptz not null default now()
);

create index if not exists messages_customer_id_idx on public.messages (customer_id, created_at);

alter table public.messages enable row level security;

-- スタッフ（authenticated）のみ全操作可。他テーブル（customers/notifications等）と同じロックダウン方針。
-- anonからは触れない（お客様のトーク内容はスタッフのみ閲覧）。
create policy staff_all on public.messages for all to authenticated using (true) with check (true);

-- ※ service_role キー（Webhook受信・LINE送信のVercel API）はRLSをbypassするので、施錠後も動作する。
